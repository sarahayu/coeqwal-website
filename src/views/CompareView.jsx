import { AppContext } from "AppContext";
import { interpolateWatercolorBlue } from "bucket-lib/utils";
import * as d3 from "d3";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  LOD_1_RAD_PX,
  LOD_1_LEVELS,
  LOD_1_SMALL_DROP_PAD_FACTOR,
  LOD_2_SMALL_DROP_PAD_FACTOR,
} from "settings";
import { clipEnds, dropCenterCorrection } from "utils/math-utils";
import { isState } from "utils/misc-utils";
import { DROPLET_SHAPE, circlet } from "utils/render-utils";

const SPREAD = LOD_2_SMALL_DROP_PAD_FACTOR / LOD_1_SMALL_DROP_PAD_FACTOR;

export default function CompareView() {
  const {
    state,
    setState,
    setGoBack,
    resetCamera,
    activeWaterdrops,
    waterdrops,
  } = useContext(AppContext);

  const [activeMinidrop, setActiveMinidrop] = useState();
  const groupsRef = useRef();

  useEffect(function initialize() {
    d3.select("#mosaic-svg")
      .select(".svg-trans")
      .append("g")
      .attr("id", "compare-group");
  }, []);

  useEffect(
    function updateCirclets() {
      if (activeMinidrop) {
        const [positions, lines] = calcLinesAndPositions(
          groupsRef.current,
          activeMinidrop
        );

        d3.select("#compare-group")
          .selectAll(".circlet")
          .data(positions)
          .join("circle")
          .attr("class", "circlet")
          .call(circlet)
          .attr("display", "initial")
          .attr("r", LOD_1_RAD_PX * 1.5)
          .transition()
          .duration(100)
          .attr("cx", (d) => d[0])
          .attr("cy", (d) => d[1]);

        d3.select("#compare-group")
          .selectAll(".comp-line")
          .data(lines)
          .join("path")
          .attr("class", "comp-line")
          .attr("stroke", "orange")
          .attr("stroke-dasharray", 3)
          .attr("opacity", 0.5)
          .attr("stroke-width", 1)
          .attr("vector-effect", "non-scaling-stroke")
          .transition()
          .duration(100)
          .attr("d", (d) => d3.line()(d));
      }
    },
    [activeMinidrop]
  );

  useEffect(
    function enterState() {
      if (isState(state, "CompareView")) {
        const container = d3.select("#compare-group");

        updateDropsSVG(
          container,
          (groupsRef.current = getWaterdropGroups(
            activeWaterdrops,
            waterdrops,
            state.avgCoord
          )),
          state.transitionDuration / 5,
          {
            onHover: (d) => {
              setActiveMinidrop(d.key);
            },
          }
        );

        setGoBack(() => () => {
          setState({ state: "WideView" });

          resetCamera();
        });

        return function exitState() {
          container.selectAll(".large-drop").remove();
          container.selectAll(".circlet").remove();
          container.selectAll(".comp-line").remove();
          setGoBack(null);
        };
      }
    },
    [state]
  );
}

function getWaterdropGroups(keyArr, waterdrops, center) {
  const groups = waterdrops.groups.filter((g) => keyArr.includes(g.key));

  const groupPositions = [];
  const rad = groups[0].height * SPREAD * 0.75;

  for (let i = 0, n = groups.length; i < n; i++) {
    groupPositions.push([
      center[0] + Math.cos(((Math.PI * 2) / n) * i) * rad,
      center[1] + Math.sin(((Math.PI * 2) / n) * i) * rad,
    ]);
  }

  return {
    groups,
    groupPositions,
  };
}

function updateDropsSVG(
  container,
  waterdropGroups,
  transitionDelay,
  { onClick, onHover, onUnhover }
) {
  container
    .selectAll(".large-drop")
    .data(waterdropGroups.groups)
    .join((enter) => {
      return enter
        .append("g")
        .attr("class", "large-drop")
        .each(function ({ nodes }) {
          d3.select(this)
            .selectAll(".small-drop")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", "small-drop")
            .each(function ({ levs }) {
              const s = d3.select(this);
              s.append("rect")
                .attr("class", "bbox")
                .style("visibility", "hidden");

              const randId = Math.floor(Math.random() * 1e9);

              const stops = d3
                .select(this)
                .append("defs")
                .append("linearGradient")
                .attr("id", `${randId}`)
                .attr("x1", "0%")
                .attr("x2", "0%")
                .attr("y1", "0%")
                .attr("y2", "100%");
              stops.append("stop").attr("stop-color", "transparent");
              stops.append("stop").attr("stop-color", "transparent");

              levs.forEach((_, i) => {
                stops
                  .append("stop")
                  .attr(
                    "stop-color",
                    interpolateWatercolorBlue(i / LOD_1_LEVELS)
                  );
                stops
                  .append("stop")
                  .attr(
                    "stop-color",
                    interpolateWatercolorBlue(i / LOD_1_LEVELS)
                  );
              });

              s.append("path")
                .attr("d", DROPLET_SHAPE)
                .attr("class", "outline")
                .attr("fill", "none")
                .attr("stroke", "lightgray")
                .attr("stroke-width", 0.05);

              s.append("path")
                .attr("class", "fill")
                .attr("d", DROPLET_SHAPE)
                .attr("fill", `url(#${randId})`);
            });
        });
    })
    .attr("display", "initial")
    .attr("transform", ({ x, y }, i) => `translate(${x}, ${y})`)
    .each(function ({ nodes }) {
      d3.select(this)
        .selectAll(".small-drop")
        .data(nodes)
        .attr("display", "initial")
        .attr("transform", ({ x, y }) => `translate(${x}, ${y})`)
        .on("click", function (e, d) {
          onClick && onClick(d);
        })
        .on("mouseenter", function (e, d) {
          onHover && onHover(d);
        })
        .on("mouseleave", function (e, d) {
          onUnhover && onUnhover(d);
        })
        .each(function ({ levs, maxLev }, i) {
          const s = d3.select(this);

          s.select(".outline").attr(
            "transform",
            `scale(${LOD_1_RAD_PX * 0.95})`
          );
          s.select(".fill").attr("transform", `scale(${LOD_1_RAD_PX})`);

          s.selectAll("stop").each(function (_, i) {
            let actI = Math.floor(i / 2);
            const isEnd = i % 2;

            if (isEnd === 0) actI -= 1;

            if (actI === -1) {
              d3.select(this).attr("offset", `${0}%`);
            } else if (actI === levs.length) {
              d3.select(this).attr("offset", `100%`);
            } else {
              d3.select(this).attr(
                "offset",
                `${(1 - levs[actI] / maxLev) * 100}%`
              );
            }
          });

          const d = s.select(".fill");

          s.select(".bbox")
            .attr("x", d.node().getBBox().x)
            .attr("y", d.node().getBBox().y)
            .attr("width", d.node().getBBox().width)
            .attr("height", d.node().getBBox().height);
        })
        .transition()
        .delay(transitionDelay)
        .duration(1000)
        .attr(
          "transform",
          ({ x, y }) => `translate(${x * SPREAD}, ${y * SPREAD})`
        );
    })
    .transition()
    .delay(transitionDelay)
    .duration(1000)
    .attr(
      "transform",
      (_, i) =>
        `translate(${waterdropGroups.groupPositions[i][0]}, ${waterdropGroups.groupPositions[i][1]})`
    );
}

function calcLinesAndPositions(groupsObj, activeMinidrop) {
  const positions = [];
  for (let i = 0; i < groupsObj.groups.length; i++) {
    const group = groupsObj.groups[i];
    const groupPos = groupsObj.groupPositions[i];

    const node = group.nodes.find((n) => n.key === activeMinidrop);

    positions.push([
      node.x * SPREAD + groupPos[0],
      node.y * SPREAD +
        groupPos[1] -
        dropCenterCorrection({ rad: LOD_1_RAD_PX }),
    ]);
  }

  const lines = [];

  for (let i = 0; i < positions.length; i++) {
    const from = Array.from(positions[i]),
      to = Array.from(positions[i + 1 == positions.length ? 0 : i + 1]);

    clipEnds([from, to], LOD_1_RAD_PX * 2);

    lines.push([from, to]);
  }

  return [positions, lines];
}
