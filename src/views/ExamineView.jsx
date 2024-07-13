import * as d3 from "d3";
import React, { useContext, useEffect, useRef } from "react";

import { AppContext } from "AppContext";

import { isState } from "utils/misc-utils";
import { LOD_2_LEVELS } from "settings";
import { LOD_1_LEVELS } from "settings";
import { interpolateWatercolorBlue, ticksExact } from "bucket-lib/utils";
import { DROPLET_SHAPE, waterdrop } from "utils/render-utils";
import { LOD_2_RAD_PX } from "settings";
import {
  FLATTENED_DATA,
  MAX_DELIVS,
  OBJECTIVES_DATA,
} from "data/objectives-data";
import { createInterps, createInterpsFromDelivs } from "utils/data-utils";
import { LOD_2_MIN_LEV_VAL } from "settings";

export default function ExamineView() {
  const {
    state,
    setState,
    setGoBack,
    camera,
    resetCamera,
    activeWaterdrops,
    waterdrops,
  } = useContext(AppContext);

  useEffect(function init() {
    // do this now so it won't lag later
    // TODO fix
    updateSmallDropSVG(
      d3.select("#mosaic-svg").select(".svg-trans"),
      getWaterdrops(
        waterdrops.groups[0].nodes.map((n) => n.id),
        waterdrops.nodes
      )
    );

    // TODO fix it still appears on first render
    d3.select("#mosaic-svg")
      .select(".svg-trans")
      .selectAll(".smallDrop")
      .attr("display", "none");
  }, []);

  useEffect(
    function update() {
      if (isState(state, "ExamineView")) {
        // TODO transition
        updateSmallDropSVG(
          d3.select("#mosaic-svg").select(".svg-trans"),
          getWaterdrops(
            waterdrops.groups
              .find((g) => g.key === activeWaterdrops[0])
              .nodes.map((n) => n.id),
            waterdrops.nodes
          )
        );

        setGoBack(() => () => {
          setState({ state: "WideView" });

          resetCamera();
        });

        return () => {
          d3.select("#mosaic-svg")
            .select(".svg-trans")
            .selectAll(".smallDrop")
            .attr("display", "none");
          setGoBack(null);
        };
      }
    },
    [state]
  );

  return <></>;
}

function getWaterdrops(nodeArr, waterdrops) {
  const wds = [];

  for (const nodeID of nodeArr) {
    const { id, objective, scenario, deliveries } = FLATTENED_DATA[nodeID];

    const i = createInterpsFromDelivs(deliveries, MAX_DELIVS);
    const ls = ticksExact(0, 1, LOD_1_LEVELS + 1).map((d) => i(d));

    const levs = ls.map(
      (w, i) => Math.max(w, i == 0 ? LOD_2_MIN_LEV_VAL : 0) * LOD_2_RAD_PX
    );

    wds.push({
      ...waterdrops[id],
      levs,
    });
  }

  return wds;
}

function updateSmallDropSVG(
  container,
  waterdrops,
  onClick,
  onHover,
  onUnhover
) {
  container
    .selectAll(".smallDrop")
    .data(waterdrops)
    .join((enter) => {
      return enter
        .append("g")
        .attr("class", "smallDrop")
        .each(function ({ levs }, i) {
          // TODO replace with tooltip, remove unnec svg
          // d3.select(this.parentNode)
          //   .append("g")
          //   .attr("id", `drop-${i}`)
          //   .append("g")
          //   .attr("class", "text-scale")
          //   .append("text")
          //   .style("font-size", LOD_2_RAD_PX * 0.2)
          //   .attr("text-anchor", "middle");

          const s = d3.select(this);
          s.append("rect").attr("class", "bbox").style("visibility", "hidden");

          s.on("mouseover", function () {
            d3.select(this)
              .select(".bump")
              .style("transform", `translateY(${-LOD_2_RAD_PX * 0.1}px)`);
          }).on("mouseout", function () {
            d3.select(this).select(".bump").style("transform", "translateY(0)");
          });

          const stops = d3
            .select(this)
            .append("defs")
            .append("linearGradient")
            .attr("id", `drop-fill-${i}`)
            .attr("x1", "0%")
            .attr("x2", "0%")
            .attr("y1", "0%")
            .attr("y2", "100%");
          stops.append("stop").attr("stop-color", "transparent");
          stops.append("stop").attr("stop-color", "transparent");

          levs.forEach((_, i) => {
            stops
              .append("stop")
              .attr("stop-color", interpolateWatercolorBlue(i / LOD_1_LEVELS));
            stops
              .append("stop")
              .attr("stop-color", interpolateWatercolorBlue(i / LOD_1_LEVELS));
          });

          const g = d3.select(this).append("g").attr("class", "bump");

          g.append("path")
            .attr("d", DROPLET_SHAPE)
            .attr("class", "outline")
            .attr("fill", "none")
            .attr("stroke", "lightgray")
            .attr("stroke-width", 0.05);

          g.append("path")
            .attr("class", "fill")
            .attr("d", DROPLET_SHAPE)
            .attr("fill", `url(#drop-fill-${i})`);
        });
    })
    .attr(
      "transform",
      ({ globalX, globalY, tilt, x, y }) =>
        `translate(${globalX + x * 0.5}, ${globalY + y * 0.5}) rotate(${0})`
    )
    .each(function ({ levs, maxLev, key, globalX, globalY, x, y }, i) {
      const s = d3.select(this);

      d3.select(`#drop-${i}`).style("opacity", 0).select("text").text(key);

      s.select(".outline").attr(
        "transform",
        `scale(${(LOD_2_RAD_PX / 2) * 0.95})`
      );
      s.select(".fill").attr("transform", `scale(${LOD_2_RAD_PX / 2})`);

      s.select(".outline").style("display", "initial");

      s.selectAll("stop").each(function (_, i) {
        let actI = Math.floor(i / 2);
        const isEnd = i % 2;

        if (isEnd === 0) actI -= 1;

        if (actI === -1) {
          d3.select(this).attr("offset", `${0}%`);
        } else {
          d3.select(this).attr("offset", `${(1 - levs[actI] / maxLev) * 100}%`);
        }
      });

      const d = s.select(".fill");

      s.select(".bbox")
        .attr("x", d.node().getBBox().x)
        .attr("y", d.node().getBBox().y)
        .attr("width", d.node().getBBox().width)
        .attr("height", d.node().getBBox().height);
    });
}
