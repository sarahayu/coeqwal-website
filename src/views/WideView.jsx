import * as d3 from "d3";
import React, { useCallback, useContext, useEffect, useState } from "react";

import { AppContext } from "AppContext";

import { GROUP_HOVER_AREA_FACTOR } from "settings";
import { dropsMesh, getOutlineOpac, pointsMesh, scene } from "three-resources";
import { isState } from "utils/misc-utils";

export default function WideView() {
  const {
    waterdrops,
    state,
    setState,
    camera,
    zoomTo,
    setActiveWaterdrops,
    activeWaterdrops,
    setDisableCamAdjustments,
  } = useContext(AppContext);

  const [activeWDObjs, setActiveWDObjs] = useState([]);

  useEffect(
    function update() {
      if (isState(state, "WideView")) {
        const { transitionDuration = 2e3 } = state;
        console.time("drawing");
        dropsMesh.draw(scene);
        console.timeEnd("drawing");

        const origOpac = getOutlineOpac(camera.curTransform.k);

        dropsMesh.updateVisibility(1);
        dropsMesh.updateOutlineVisibility(origOpac);

        const t = d3.timer((elapsed) => {
          const et = Math.min(1, elapsed / (transitionDuration / 2));

          // dropsMesh.updateVisibility(origOpac * et);

          if (et >= 1) {
            t.stop();
          }
        });

        const container = d3.select("#mosaic-svg").select(".svg-trans");

        updateLargeDropSVG(container, waterdrops, {
          onClick: (d) => {
            setActiveWDObjs((wd) => {
              const found = wd.findIndex((wd) => wd.key === d.key);
              if (found !== -1) {
                wd.splice(found, 1);
              } else {
                wd.push(d);
              }
              return [...wd];
            });

            setActiveWaterdrops((wd) => {
              if (wd.includes(d.key)) {
                wd.splice(wd.indexOf(d.key), 1);
                container.select(".circlet." + d.key).classed("active", false);
              } else {
                wd.push(d.key);
                container.select(".circlet." + d.key).classed("active", true);
              }
              return [...wd];
            });
          },
        });

        for (const wd of activeWDObjs) {
          container.select(".circlet." + wd.key).classed("active", true);
        }

        return () => {
          d3.select("#mosaic-svg")
            .select(".svg-trans")
            .selectAll(".largeDrop")
            .attr("display", "none");
        };
      }
    },
    [state]
  );

  const handleClick = useCallback(() => {
    if (activeWDObjs.length == 1) {
      const d = activeWDObjs[0];

      const { start, duration } = zoomTo(
        [d.x, d.y - d.height * 0.08, camera.getZFromFarHeight(d.height * 2)],
        () => {
          setDisableCamAdjustments(false);
        }
      );

      start();

      setState({ state: "ExamineView", transitionDuration: duration });

      const origOpac = getOutlineOpac(camera.curTransform.k);
      setDisableCamAdjustments(true);

      const t = d3.timer((elapsed) => {
        const et = Math.min(1, elapsed / (duration / 2));

        dropsMesh.updateVisibility(1 - et);
        dropsMesh.updateOutlineVisibility(origOpac * (1 - et));

        if (et >= 1) {
          t.stop();
          dropsMesh.remove(scene);
        }
      });
    } else if (activeWDObjs.length > 1) {
      const coords = activeWDObjs.map((w) => [w.x, w.y]);
      const avgCoord = [
        d3.mean(coords, (c) => c[0]),
        d3.mean(coords, (c) => c[1]),
      ];
      const { start, duration } = zoomTo(
        [
          avgCoord[0],
          avgCoord[1],
          camera.getZFromFarHeight(waterdrops.groups[0].height * 2 * 2),
        ],
        () => {
          setDisableCamAdjustments(false);
        }
      );

      start();

      setState({
        state: "CompareView",
        transitionDuration: duration,
        avgCoord,
      });

      const origOpac = getOutlineOpac(camera.curTransform.k);
      setDisableCamAdjustments(true);

      const t = d3.timer((elapsed) => {
        const et = Math.min(1, elapsed / (duration / 5));

        dropsMesh.updateVisibility(1 - et);
        dropsMesh.updateOutlineVisibility(origOpac * (1 - et));

        if (et >= 1) {
          t.stop();

          dropsMesh.remove(scene);
        }
      });
    }
  }, [activeWDObjs]);

  if (isState(state, "WideView") && activeWaterdrops.length)
    return (
      <button onClick={handleClick} className="wide-view-action-btn">
        {activeWaterdrops.length == 1 ? "examine >>" : "compare >>"}
      </button>
    );
}

function updateLargeDropSVG(
  container,
  waterdrops,
  { onClick, onHover, onUnhover }
) {
  console.log("updating svg");
  container
    .selectAll(".largeDrop")
    .data(waterdrops.groups)
    .join((enter) => {
      return enter
        .append("g")
        .attr("class", "largeDrop")
        .each(function (d) {
          const s = d3.select(this);

          s.append("g")
            .attr("class", "circlet")
            .append("circle")
            .attr("fill", "transparent")
            .attr("stroke", "transparent")
            .attr("stroke-dasharray", 3)
            .attr("stroke-width", 3)
            .attr("vector-effect", "non-scaling-stroke")
            .attr("r", 1);
        });
    })
    .each(function (d) {
      d3.select(this)
        .select(".circlet")
        .attr("class", null)
        .attr("class", "circlet " + d.key);
    })
    .attr("display", "initial")
    .attr(
      "transform",
      ({ x, y, height }) =>
        `translate(${x}, ${y - height * 0.08}) scale(${
          height * GROUP_HOVER_AREA_FACTOR
        })`
    )
    .on("click", function (e, d) {
      onClick && onClick(d);
    })
    .on("mouseenter", function (e, d) {
      if (!d3.select(this).select(".circlet").classed("active"))
        d3.select(this).select("circle").attr("stroke", "orange");
      onHover && onHover(d);
    })
    .on("mouseleave", function (e, d) {
      if (!d3.select(this).select(".circlet").classed("active"))
        d3.select(this).select("circle").attr("stroke", "transparent");
      onUnhover && onUnhover(d);
    });
}
