import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { settings } from "settings";

import { circlet, hideElems, showElems } from "utils/render-utils";
import { avgCoords } from "utils/math-utils";
import { constants, updateDropsSVG } from "utils/tutorialview-utils";

import { helpers as compareViewHelpers } from "views/compareview-helpers";

// TODO turn into component?
export function useCompareLargeDrops() {
  const [activeMinidrop, setActiveMinidrop] = useState();
  const groupsRef = useRef();
  const camCentersRef = useRef({});

  useEffect(
    function updateCirclets() {
      if (activeMinidrop) {
        const [positions, lines] = compareViewHelpers.calcLinesAndPositions(
          groupsRef.current,
          activeMinidrop
        );

        updateLabel(avgCoords(positions));
        updateScenIndicators(positions, lines);
      }
    },
    [activeMinidrop]
  );

  function initialize(waterdrops, camera) {
    groupsRef.current = compareViewHelpers.getWaterdropGroups(
      [constants.PAG_OBJECTIVE, constants.PRF_OBJECTIVE],
      waterdrops,
      [0, 0]
    );

    const farHeight =
      waterdrops.groups[0].height * 2 * settings.SPREAD_1_2 * 0.75;
    const k = camera.height / farHeight;

    let x = camera.width / 2;
    let y = camera.height / 2;

    const camMidpoint = {
      x,
      y,
      k,
    };

    x = -(groupsRef.current.groupPositions[0][0] * k) + camera.width / 2;
    y = groupsRef.current.groupPositions[0][1] * k + camera.height / 2;

    const camFirstDrop = {
      x,
      y,
      k,
    };

    camCentersRef.current.firstDrop = camFirstDrop;
    camCentersRef.current.midpoint = camMidpoint;

    const container = d3
      .select("#comparer-graphics")
      .attr("width", window.innerWidth)
      .attr("height", window.innerHeight)
      .append("g")
      .attr("class", "svg-group")
      .attr(
        "transform",
        d3.zoomIdentity
          .translate(camFirstDrop.x, camFirstDrop.y)
          .scale(camFirstDrop.k)
      );

    const indicatorGroup = container
      .append("g")
      .attr("class", "indicator-group");

    indicatorGroup.append("text").attr("id", "member-variable");
    indicatorGroup.append("text").attr("id", "member-label");

    updateDropsSVG(container, groupsRef.current, {
      onHover: (d) => {
        setActiveMinidrop(d.key);
      },
    });

    setActiveMinidrop(constants.DEFAULT_SCENARIO);
    hideElems(
      `.large-drop.${constants.PRF_OBJECTIVE}, .indicator-group`,
      container
    );
  }

  function updateLabel(pos) {
    const [textX, textY] = pos;

    const smallTextSize =
      (groupsRef.current.groups[0].height * settings.SPREAD_1_2) / 15;
    const largeTextSize =
      (groupsRef.current.groups[0].height * settings.SPREAD_1_2) / 10;

    d3.select("#comparer-graphics")
      .select("#member-label")
      .text("scenario")
      .attr("font-size", smallTextSize)
      .transition()
      .duration(100)
      .attr("x", textX)
      .attr("y", textY - smallTextSize * 1.5);

    d3.select("#comparer-graphics")
      .select("#member-variable")
      .attr("font-size", largeTextSize)
      .text(activeMinidrop.slice(4))
      .transition()
      .duration(100)
      .attr("x", textX)
      .attr("y", textY);
  }

  function updateScenIndicators(positions, lines) {
    d3.select("#comparer-graphics .indicator-group")
      .selectAll(".circlet")
      .data(positions)
      .join("circle")
      .attr("class", "circlet")
      .call(circlet)
      .attr("r", settings.LOD_1_RAD_PX * 1.5)
      .transition()
      .duration(100)
      .attr("cx", (d) => d[0])
      .attr("cy", (d) => d[1]);

    d3.select("#comparer-graphics .indicator-group")
      .selectAll(".comp-line")
      .data(lines)
      .join("path")
      .attr("class", "comp-line")
      .transition()
      .duration(100)
      .attr("d", (d) => d3.line()(d));
  }

  function showOtherDrop() {
    const container = d3.select("#comparer-graphics");

    container
      .select(".svg-group")
      .transition()
      .attr(
        "transform",
        d3.zoomIdentity
          .translate(
            camCentersRef.current.midpoint.x,
            camCentersRef.current.midpoint.y
          )
          .scale(camCentersRef.current.midpoint.k)
      );

    showElems(
      `.large-drop.${constants.PRF_OBJECTIVE}, .indicator-group`,
      container
    );
  }

  function hideOtherDrop() {
    const container = d3.select("#comparer-graphics");

    container
      .select(".svg-group")
      .transition()
      .attr(
        "transform",
        d3.zoomIdentity
          .translate(
            camCentersRef.current.firstDrop.x,
            camCentersRef.current.firstDrop.y
          )
          .scale(camCentersRef.current.firstDrop.k)
      );

    hideElems(
      `.large-drop.${constants.PRF_OBJECTIVE}, .indicator-group`,
      container
    );
  }

  return { initComparer: initialize, showOtherDrop, hideOtherDrop };
}
