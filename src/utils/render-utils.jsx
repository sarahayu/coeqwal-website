import { interpolateWatercolorBlue } from "bucket-lib/utils";
import * as d3 from "d3";
import { settings } from "settings";
import { wrap } from "./misc-utils";
import { percentToRatioFilled } from "./math-utils";

// path generated when WATERDROP_ICON size = 2
export const DROPLET_SHAPE = "M0,-1L0.5,-0.5A0.707,0.707,0,1,1,-0.5,-0.5L0,-1Z";

export const CIRC_RAD = Math.SQRT1_2;
export const DROP_RAD = 1;
export const CIRC_HEIGHT = CIRC_RAD + CIRC_RAD;
export const DROP_HEIGHT = DROP_RAD + CIRC_RAD;
const HAT_START = (CIRC_RAD + DROP_RAD / 2) / DROP_HEIGHT;

// half width at widest is 1
function yToHalfWidth(y) {
  if (y >= HAT_START) {
    const hatHalfWidth = Math.SQRT1_2;

    return (hatHalfWidth * (1 - y)) / (1 - HAT_START);
  }

  const circFrac = fracDropToCirc(y);
  const trigX = (1 - circFrac) * 2 - 1;

  const angle = Math.acos(trigX);
  const trigY = Math.sin(angle);

  return trigY;
}

// fml, here sprite width is 2 (i.e. circ rad is 1) thus drop real height is 1 + sqrt2
function yToSpriteY(y) {
  return (y - CIRC_RAD / DROP_HEIGHT) * (1 + Math.SQRT2);
}

function spriteYToY(sy) {
  return sy / (1 + Math.SQRT2) + CIRC_RAD / DROP_HEIGHT;
}

function fracCircToDrop(v) {
  return v / CIRC_HEIGHT / DROP_HEIGHT;
}

function fracDropToCirc(v) {
  return v / (CIRC_HEIGHT / DROP_HEIGHT);
}

export function waterdropDeltaOutline(yStart, yEnd, size = 2, subdivs = 10) {
  if (Math.abs(yStart - yEnd) < 0.01) return [];

  const rad = (size / 2 / DROP_RAD) * CIRC_RAD;

  const Y_DELTA = 1 / subdivs;

  const rightCoords = [];
  const leftCoords = [];

  let dx1, dy1, dx2, dy2;

  for (let i = 1; i <= Math.ceil(1 / Y_DELTA); i++) {
    dx1 = yToHalfWidth(yStart + (i - 1) * Y_DELTA);
    dy1 = yToSpriteY(yStart + (i - 1) * Y_DELTA);
    dx2 = yToHalfWidth(yStart + i * Y_DELTA);
    dy2 = yToSpriteY(yStart + i * Y_DELTA);

    if (spriteYToY(dy2) >= yEnd) break;

    // CC !
    const v1 = [-dx1 * rad, -dy1 * rad],
      v2 = [dx1 * rad, -dy1 * rad],
      v3 = [dx2 * rad, -dy2 * rad],
      v4 = [-dx2 * rad, -dy2 * rad];

    rightCoords.push(v2, v3);
    leftCoords.push(v1, v4);
  }

  dx2 = yToHalfWidth(yEnd);
  dy2 = yToSpriteY(yEnd);

  // CC !
  const v1 = [-dx1 * rad, -dy1 * rad],
    v2 = [dx1 * rad, -dy1 * rad],
    v3 = [dx2 * rad, -dy2 * rad],
    v4 = [-dx2 * rad, -dy2 * rad];

  rightCoords.push(v2, v3);
  leftCoords.push(v1, v4);

  rightCoords.push(...leftCoords.reverse());

  return rightCoords;
}

export function waterdropDelta(yStart, yEnd, size = 2) {
  if (Math.abs(yStart - yEnd) < 0.01) return [];

  const rad = (size / 2 / DROP_RAD) * CIRC_RAD;

  const Y_DELTA = 0.1;

  const coords = [];

  let dx1, dy1, dx2, dy2;

  for (let i = 1; i <= Math.ceil(1 / Y_DELTA); i++) {
    dx1 = yToHalfWidth(yStart + (i - 1) * Y_DELTA);
    dy1 = yToSpriteY(yStart + (i - 1) * Y_DELTA);
    dx2 = yToHalfWidth(yStart + i * Y_DELTA);
    dy2 = yToSpriteY(yStart + i * Y_DELTA);

    if (spriteYToY(dy2) >= yEnd) break;

    // CC !
    const v1 = [-dx1 * rad, -dy1 * rad],
      v2 = [dx1 * rad, -dy1 * rad],
      v3 = [dx2 * rad, -dy2 * rad],
      v4 = [-dx2 * rad, -dy2 * rad];

    coords.push([v1, v2, v3]);
    coords.push([v1, v3, v4]);
  }

  dx2 = yToHalfWidth(yEnd);
  dy2 = yToSpriteY(yEnd);

  // CC !
  const v1 = [-dx1 * rad, -dy1 * rad],
    v2 = [dx1 * rad, -dy1 * rad],
    v3 = [dx2 * rad, -dy2 * rad],
    v4 = [-dx2 * rad, -dy2 * rad];

  coords.push([v1, v2, v3]);
  coords.push([v1, v3, v4]);

  return coords;
}

export function waterdrop(yFill, size = 2) {
  if (yFill === 0) return [];

  return waterdropDelta(0, yFill, size);
}

export function circlet(s) {
  s.attr("fill", "transparent")
    .attr("stroke", "orange")
    .attr("stroke-dasharray", 3)
    .attr("stroke-width", 3)
    .attr("vector-effect", "non-scaling-stroke");
}

export function showElems(elemStr, container, displayVal) {
  (container || d3).selectAll(elemStr).style("display", displayVal || "block");
}

export function hideElems(elemStr, container) {
  (container || d3).selectAll(elemStr).style("display", "none");
}

export function removeElems(elemStr, container) {
  (container || d3).selectAll(elemStr).remove();
}

export function gradientInit(levs, gradId) {
  return (s) => {
    const stops = s
      .append("defs")
      .append("linearGradient")
      .attr("id", gradId)
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
            interpolateWatercolorBlue(i / settings.LOD_1_LEVELS)
          );
      }
    });
  };
}

export function gradientUpdate(levs, maxLev) {
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
        `${(1 - percentToRatioFilled(levs[valOffset] / maxLev)) * 100}%`
      );
    });
  };
}

export function worldToScreen(x, y, camTransform) {
  return [
    x * camTransform.k + camTransform.x,
    y * camTransform.k + camTransform.y,
  ];
}

export function screenToWorld(x, y, camTransform) {
  return [
    (x - camTransform.x) / camTransform.k,
    (y - camTransform.y) / camTransform.k,
  ];
}

export function generateTSpan(text, lineHeight = 1.2) {
  return (s) => {
    s.selectAll("*").remove();
    const lines = typeof text === "string" ? wrap(text).split("\n") : text;

    console.log(s);

    const x = s.attr("x");

    lines.forEach((line) => {
      s.append("tspan").attr("x", x).attr("dy", `${lineHeight}em`).text(line);
    });
  };
}
