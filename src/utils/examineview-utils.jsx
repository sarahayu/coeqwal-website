import * as d3 from "d3";

import { interpolateWatercolorBlue } from "bucket-lib/utils";

import { LOD_1_LEVELS, LOD_1_RAD_PX, SPREAD_1_2 } from "settings";

import { dropCenterCorrection } from "utils/math-utils";
import { DROPLET_SHAPE, circlet } from "utils/render-utils";
import { gradientInit, gradientUpdate } from "./render-utils";

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

  const baselinePos = {};

  const drops = container
    .selectAll(".small-drop")
    .data(waterdropGroup.nodes)
    .join((enter) => {
      return enter.append("g").each(function (node, i) {
        d3.select(this).call(smallDropInit(node, i));
      });
    })
    .attr("transform", getStartLoc)
    .each(function (node) {
      d3.select(this).call(smallDropUpdate(node, baselinePos));
    });

  if (onClick) {
    drops.on("click", function (_, d) {
      onClick(d);
    });
  }

  if (onHover) {
    drops.on("mouseenter", function (_, d) {
      onHover(d);
    });
  }

  if (onUnhover) {
    drops.on("mouseleave", function (_, d) {
      onUnhover(d);
    });
  }

  drops
    .transition()
    .delay(transitionDelay)
    .duration(1000)
    .attr("transform", getEndLoc);

  container
    .select(".highlight-circle")
    .attr("stroke", "none")
    .attr("fill", "yellow")
    .attr("r", LOD_1_RAD_PX * 2)
    .attr("cx", waterdropGroup.x + baselinePos.x)
    .attr(
      "cy",
      waterdropGroup.y +
        baselinePos.y -
        dropCenterCorrection({ rad: LOD_1_RAD_PX })
    )
    .transition()
    .delay(transitionDelay)
    .duration(1000)
    .attr("cx", waterdropGroup.x + baselinePos.x * SPREAD_1_2)
    .attr(
      "cy",
      waterdropGroup.y +
        baselinePos.y * SPREAD_1_2 -
        dropCenterCorrection({ rad: LOD_1_RAD_PX })
    );
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

function smallDropInit({ levs }, i) {
  return (s) => {
    s.attr("class", "small-drop hover-capture");

    s.call(gradientInit(levs, `drop-fill-${i}`));

    s.append("path").attr("d", DROPLET_SHAPE).attr("class", "outline");

    s.append("path")
      .attr("class", "fill")
      .attr("d", DROPLET_SHAPE)
      .attr("fill", `url(#drop-fill-${i})`);

    s.append("circle")
      .attr("class", "circlet interactive")
      .call(circlet)
      .attr("cy", -dropCenterCorrection({ rad: 1 }))
      .attr("r", 1.5);

    s.append("rect").attr("class", "bbox").style("visibility", "hidden");
  };
}

function smallDropUpdate({ key, levs, maxLev, id, x, y }, baselinePos) {
  return (s) => {
    if (key === "expl0000") {
      baselinePos.x = x;
      baselinePos.y = y;
    }

    s.call(gradientUpdate(levs, maxLev));
    s.select(".outline").attr("transform", `scale(${LOD_1_RAD_PX * 0.95})`);
    s.select(".fill").attr("transform", `scale(${LOD_1_RAD_PX})`);

    s.select(".circlet")
      .attr("class", null)
      // TODO find better way to toggle i1234, prob with id
      .attr("class", "circlet interactive i" + id);

    const dropBBox = s.select(".fill").node().getBBox();

    s.select(".bbox")
      .attr("x", dropBBox.x)
      .attr("y", dropBBox.y)
      .attr("width", dropBBox.width)
      .attr("height", dropBBox.height);
  };
}
