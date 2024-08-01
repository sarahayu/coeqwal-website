import * as d3 from "d3";

import { interpolateWatercolorBlue } from "bucket-lib/utils";

import { LOD_1_LEVELS, LOD_1_RAD_PX, SPREAD_1_2 } from "settings";

import { dropCenterCorrection } from "utils/math-utils";
import { DROPLET_SHAPE, circlet } from "utils/render-utils";

function gradientInit(levs, id) {
  return (s) => {
    const stops = s
      .append("defs")
      .append("linearGradient")
      .attr("id", id)
      .attr("x1", "0%")
      .attr("x2", "0%")
      .attr("y1", "0%")
      .attr("y2", "100%");

    for (let k = 0; k < 2; k++) {
      stops.append("stop").attr("stop-color", "transparent");
    }

    levs.forEach((_, j) => {
      for (let k = 0; k < 2; k++) {
        stops
          .append("stop")
          .attr("stop-color", interpolateWatercolorBlue(j / LOD_1_LEVELS));
      }
    });
  };
}

function smallDropInit({ levs }, i) {
  return (s) => {
    s.attr("class", "small-drop");

    s.call(gradientInit(levs, `drop-fill-${i}`));

    s.append("path").attr("d", DROPLET_SHAPE).attr("class", "outline");

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

    s.append("rect").attr("class", "bbox").style("visibility", "hidden");
  };
}

function gradientUpdate(levs, maxLev) {
  return (s) => {
    s.selectAll("stop").each(function (_, i) {
      // first stop is at 0
      if (i === 0) {
        d3.select(this).attr("offset", `0%`);
        return;
      }

      // last stop is at 100
      if (i === (levs.length + 1) * 2 - 1) {
        d3.select(this).attr("offset", `100%`);
        return;
      }

      let valOffset = Math.floor((i - 1) / 2);

      d3.select(this).attr(
        "offset",
        `${(1 - levs[valOffset] / maxLev) * 100}%`
      );
    });
  };
}

function smallDropUpdate({ levs, maxLev, id }) {
  return (s) => {
    s.call(gradientUpdate(levs, maxLev));
    s.select(".outline").attr("transform", `scale(${LOD_1_RAD_PX * 0.95})`);
    s.select(".fill").attr("transform", `scale(${LOD_1_RAD_PX})`);

    s.select(".circlet")
      .attr("class", null)
      .attr("class", "circlet i" + id);

    const dropBBox = s.select(".fill").node().getBBox();

    s.select(".bbox")
      .attr("x", dropBBox.x)
      .attr("y", dropBBox.y)
      .attr("width", dropBBox.width)
      .attr("height", dropBBox.height);
  };
}

export function updateColorDrops(container, waterdropGroup, opacFn, color) {
  container
    .selectAll(".color-drop")
    .data(waterdropGroup.nodes)
    .join("circle")
    .attr("class", "color-drop")
    .attr("r", LOD_1_RAD_PX)
    .attr("opacity", ({ key }) => opacFn(key))
    .attr("fill", color)
    .attr("cx", ({ x }) => waterdropGroup.x + x * SPREAD_1_2)
    .attr("cy", ({ y }) => waterdropGroup.y + y * SPREAD_1_2);
}

export function updateSmallDropSVG(
  container,
  waterdropGroup,
  transitionDelay,
  { onClick, onHover, onUnhover }
) {
  const getStartLoc = ({ globalX, globalY, globalTilt }) =>
    `translate(${globalX}, ${globalY}) rotate(${globalTilt})`;
  const getEndLoc = ({ x, y, tilt }) =>
    `translate(${waterdropGroup.x + x * SPREAD_1_2}, ${
      waterdropGroup.y + y * SPREAD_1_2
    }) rotate(${tilt})`;

  container
    .selectAll(".small-drop")
    .data(waterdropGroup.nodes)
    .join((enter) => {
      return enter.append("g").each(function (node, i) {
        d3.select(this).call(smallDropInit(node, i));
      });
    })
    .attr("transform", getStartLoc)
    .each(function (node) {
      d3.select(this).call(smallDropUpdate(node));
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
    .attr("transform", getEndLoc);
}
