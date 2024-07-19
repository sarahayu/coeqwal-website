import * as d3 from "d3";
import React, { useContext, useEffect } from "react";

import { AppContext } from "AppContext";

import { isState } from "utils/misc-utils";
import { LOD_1_LEVELS } from "settings";
import { interpolateWatercolorBlue } from "bucket-lib/utils";
import { DROPLET_SHAPE } from "utils/render-utils";
import { LOD_1_RAD_PX } from "settings";
import { LOD_2_SMALL_DROP_PAD_FACTOR } from "settings";
import { LOD_1_SMALL_DROP_PAD_FACTOR } from "settings";

export default function ExamineView() {
  const {
    state,
    setState,
    setGoBack,
    resetCamera,
    activeWaterdrops,
    waterdrops,
  } = useContext(AppContext);

  useEffect(
    function update() {
      if (isState(state, "ExamineView")) {
        const transitionDelay = state.transitionDuration;
        const container = d3.select("#mosaic-svg").select(".svg-trans");

        updateSmallDropSVG(
          container,
          waterdrops.groups.find((g) => g.key === activeWaterdrops[0]).nodes,
          transitionDelay / 2,
          {}
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

function updateSmallDropSVG(
  container,
  waterdrops,
  transitionDelay,
  { onClick, onHover, onUnhover }
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

          const s = d3.select(this);
          s.append("rect").attr("class", "bbox").style("visibility", "hidden");

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

          s.append("path")
            .attr("d", DROPLET_SHAPE)
            .attr("class", "outline")
            .attr("fill", "none")
            .attr("stroke", "lightgray")
            .attr("stroke-width", 0.05);

          s.append("path")
            .attr("class", "fill")
            .attr("d", DROPLET_SHAPE)
            .attr("fill", `url(#drop-fill-${i})`);

          s.append("g")
            .attr("class", "circlet")
            .append("circle")
            .attr("fill", "transparent")
            .attr("stroke", "transparent")
            .attr("stroke-dasharray", 3)
            .attr("stroke-width", 3)
            .attr("vector-effect", "non-scaling-stroke")
            .attr("r", 1.5);
        });
    })
    .attr("display", "initial")
    .attr(
      "transform",
      ({ globalX, globalY }) => `translate(${globalX}, ${globalY})`
    )
    .each(function ({ levs, maxLev, key }, i) {
      const s = d3.select(this);

      s.select(".outline").attr("transform", `scale(${LOD_1_RAD_PX * 0.95})`);
      s.select(".fill").attr("transform", `scale(${LOD_1_RAD_PX})`);

      s.select(".circlet")
        .attr("class", null)
        .attr("class", "circlet " + key);

      s.selectAll("stop").each(function (_, i) {
        let actI = Math.floor(i / 2);
        const isEnd = i % 2;

        if (isEnd === 0) actI -= 1;

        if (actI === -1) {
          d3.select(this).attr("offset", `${0}%`);
        } else if (actI === levs.length) {
          d3.select(this).attr("offset", `100%`);
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
    })
    .on("click", function (_, d) {
      onClick && onClick(d);
    })
    .on("mouseenter", function (_, d) {
      if (!d3.select(this).select(".circlet").classed("active"))
        d3.select(this).select("circle").attr("stroke", "orange");
      onHover && onHover(d);
    })
    .on("mouseleave", function (_, d) {
      if (!d3.select(this).select(".circlet").classed("active"))
        d3.select(this).select("circle").attr("stroke", "transparent");
      onUnhover && onUnhover(d);
    })
    .transition()
    .delay(transitionDelay)
    .duration(1000)
    .attr(
      "transform",
      ({ globalX, globalY, x, y }) =>
        `translate(${
          globalX +
          x * (LOD_2_SMALL_DROP_PAD_FACTOR / LOD_1_SMALL_DROP_PAD_FACTOR - 1)
        }, ${
          globalY +
          y * (LOD_2_SMALL_DROP_PAD_FACTOR / LOD_1_SMALL_DROP_PAD_FACTOR - 1)
        }) rotate(${0})`
    );
}
