import * as d3 from "d3";

import { settings } from "settings";

import { dropCenterCorrection } from "utils/math-utils";
import {
  DROPLET_SHAPE,
  circlet,
  gradientInit,
  gradientUpdate,
} from "utils/render-utils";

function smallDropInit({ levs, id }) {
  return (s) => {
    s.attr("class", "small-drop hover-capture");

    const idStr = `drop-fill-${id}`;

    s.call(gradientInit(levs, idStr));

    s.append("path").attr("d", DROPLET_SHAPE).attr("class", "outline");

    s.append("path")
      .attr("class", "fill")
      .attr("d", DROPLET_SHAPE)
      .attr("fill", `url(#${idStr})`);

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
    s.select(".outline").attr(
      "transform",
      `scale(${settings.LOD_1_RAD_PX * 0.95})`
    );
    s.select(".fill").attr("transform", `scale(${settings.LOD_1_RAD_PX})`);

    s.select(".circlet").attr("id", `i${id}`);

    const dropBBox = s.select(".fill").node().getBBox();

    s.select(".bbox")
      .attr("x", dropBBox.x)
      .attr("y", dropBBox.y)
      .attr("width", dropBBox.width)
      .attr("height", dropBBox.height);
  };
}

function updateSmallDropSVG(
  container,
  waterdropGroup,
  transitionDelay,
  { onClick, onHover, onUnhover }
) {
  const getStartLoc = ({ globalX, globalY, globalTilt }) =>
    `translate(${globalX}, ${globalY}) rotate(${globalTilt})`;
  const getEndLoc = ({ x, y, tilt }) =>
    `translate(${waterdropGroup.x + x * settings.SPREAD_1_2}, ${
      waterdropGroup.y + y * settings.SPREAD_1_2
    }) rotate(${tilt})`;

  const baselinePos = {};

  const drops = container
    .selectAll(".small-drop")
    .data(waterdropGroup.nodes)
    .join((enter) => {
      return enter.append("g").each(function (node) {
        d3.select(this).call(smallDropInit(node));
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

  const circlePosX = waterdropGroup.x + baselinePos.x * settings.SPREAD_1_2,
    circlePosY =
      waterdropGroup.y +
      baselinePos.y * settings.SPREAD_1_2 -
      dropCenterCorrection({ rad: settings.LOD_1_RAD_PX });

  const textPosX =
      waterdropGroup.x + (waterdropGroup.height * settings.SPREAD_1_2) / 2,
    textPosY =
      waterdropGroup.y - (waterdropGroup.height * settings.SPREAD_1_2) / 2;

  const fontSize = waterdropGroup.height / 20;
  const lineWidth = waterdropGroup.height / 100;

  container
    .select(".highlight-circle")
    .attr("stroke", "none")
    .attr("fill", "yellow")
    .attr("r", settings.LOD_1_RAD_PX * 2)
    .attr("cx", circlePosX)
    .attr("cy", circlePosY);

  container
    .select(".baseline-pointer path")
    .attr(
      "d",
      d3
        .line()
        .x((d) => d[0])
        .y((d) => d[1])([
        [circlePosX, circlePosY],
        [textPosX, textPosY],
      ])
    )
    .attr("stroke-width", lineWidth);
  container
    .select(".baseline-pointer text")
    .attr("class", "fancy-font")
    .attr("font-size", fontSize)
    .attr("transform", `translate(${textPosX + fontSize}, ${textPosY})`);
}

function updateColorDrops(container, waterdropGroup, opacFn, color) {
  container
    .selectAll(".color-drop")
    .data(waterdropGroup.nodes)
    .join("circle")
    .attr("class", "color-drop")
    .attr("r", settings.LOD_1_RAD_PX)
    .attr("opacity", ({ key }) => opacFn(key))
    .attr("fill", color)
    .attr("cx", ({ x }) => waterdropGroup.x + x * settings.SPREAD_1_2)
    .attr("cy", ({ y }) => waterdropGroup.y + y * settings.SPREAD_1_2);
}

export const helpers = {
  updateSmallDropSVG,
  updateColorDrops,
};
