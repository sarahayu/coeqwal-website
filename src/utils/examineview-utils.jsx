import * as d3 from "d3";

import { interpolateWatercolorBlue } from "bucket-lib/utils";

import { LOD_1_LEVELS, LOD_1_RAD_PX, SPREAD_1_2 } from "settings";

import { dropCenterCorrection } from "utils/math-utils";
import { DROPLET_SHAPE, circlet } from "utils/render-utils";

export function updateSmallDropSVG(
  container,
  waterdrops,
  transitionDelay,
  { onClick, onHover, onUnhover }
) {
  container
    .selectAll(".small-drop")
    .data(waterdrops)
    .join((enter) => {
      return enter
        .append("g")
        .attr("class", "small-drop")
        .each(function ({ levs }, i) {
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
            for (let j = 0; j < 2; j++) {
              stops
                .append("stop")
                .attr(
                  "stop-color",
                  interpolateWatercolorBlue(i / LOD_1_LEVELS)
                );
            }
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
            .call(circlet)
            .attr("display", "none")
            .attr("cy", -dropCenterCorrection({ rad: 1 }))
            .attr("r", 1.5);
        });
    })
    .attr(
      "transform",
      ({ globalX, globalY }) => `translate(${globalX}, ${globalY})`
    )
    .each(function ({ levs, maxLev, id }, i) {
      const s = d3.select(this);

      s.select(".outline").attr("transform", `scale(${LOD_1_RAD_PX * 0.95})`);
      s.select(".fill").attr("transform", `scale(${LOD_1_RAD_PX})`);

      s.select(".circlet")
        .attr("class", null)
        .attr("class", "circlet i" + id);

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

      const dropBBox = s.select(".fill").node().getBBox();

      s.select(".bbox")
        .attr("x", dropBBox.x)
        .attr("y", dropBBox.y)
        .attr("width", dropBBox.width)
        .attr("height", dropBBox.height);
    })
    .on("click", function (_, d) {
      onClick && onClick(d);
    })
    .on("mouseenter", function (_, d) {
      if (!d3.select(this).select(".circlet").classed("active"))
        d3.select(this).select("circle").attr("display", "initial");
      onHover && onHover(d);
    })
    .on("mouseleave", function (_, d) {
      if (!d3.select(this).select(".circlet").classed("active"))
        d3.select(this).select("circle").attr("display", "none");
      onUnhover && onUnhover(d);
    })
    .transition()
    .delay(transitionDelay)
    .duration(1000)
    .attr(
      "transform",
      ({ globalX, globalY, x, y }) =>
        `translate(${globalX + x * (SPREAD_1_2 - 1)}, ${
          globalY + y * (SPREAD_1_2 - 1)
        }) rotate(${0})`
    );
}
