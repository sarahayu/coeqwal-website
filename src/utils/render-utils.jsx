import {
  interpolateWatercolorBlue,
  levelToDropletLevel,
} from "bucket-lib/utils";
import * as d3 from "d3";
import { settings } from "settings";
import { radToDeg } from "three/src/math/MathUtils";
import { wrap } from "utils/misc-utils";
import { clamp, dist } from "utils/math-utils";

// path generated when WATERDROP_ICON size = 2
export const DROPLET_SHAPE = "M0,-1L0.5,-0.5A0.707,0.707,0,1,1,-0.5,-0.5L0,-1Z";

const BOTTLE_ICON = {
  draw: function (context, size) {
    const bottleWidth = size / 2;
    const capWidth = (bottleWidth * 2) / 3;
    const capHeight = capWidth / 2;
    context.moveTo(capWidth / 2, -size / 2);
    context.lineTo(-bottleWidth / 2, -size / 2);
    context.lineTo(-bottleWidth / 2, size / 2);
    context.lineTo(bottleWidth / 2, size / 2);
    context.lineTo(bottleWidth / 2, -size / 2);
    context.lineTo(capWidth / 2, -size / 2);
    context.lineTo(capWidth / 2, -size / 2 - capHeight);
    context.lineTo(-capWidth / 2, -size / 2 - capHeight);
    context.lineTo(-capWidth / 2, -size / 2);
  },
};

export const BOTTLE_SHAPE_FULL =
  "M0.333,-1L-0.389,-1A0.111,0.111,0,0,0,-0.5,-0.889L-0.5,0.889A0.111,0.111,0,0,0,-0.389,1L0.389,1A0.111,0.111,0,0,0,0.5,0.889L0.5,-0.889A0.111,0.111,0,0,0,0.389,-1L0.333,-1L0.333,-1.222A0.111,0.111,0,0,0,0.222,-1.333L-0.222,-1.333A0.111,0.111,0,0,0,-0.333,-1.222L-0.333,-1";

export const BOTTLE_SHAPE_BODY =
  "M0.333,-1L-0.389,-1A0.111,0.111,0,0,0,-0.5,-0.889L-0.5,0.889A0.111,0.111,0,0,0,-0.389,1L0.389,1A0.111,0.111,0,0,0,0.5,0.889L0.5,-0.889A0.111,0.111,0,0,0,0.389,-1Z";

export const CIRC_RAD = Math.SQRT1_2;
export const DROP_RAD = 1;
export const CIRC_HEIGHT = CIRC_RAD + CIRC_RAD;
export const DROP_HEIGHT = DROP_RAD + CIRC_RAD;

export function bottleOutline(size = 2) {
  const bottleWidth = size / 2;
  const capWidth = (bottleWidth * 2) / 3;
  const capHeight = capWidth / 2;

  return [
    [capWidth / 2, -size / 2],
    [-bottleWidth / 2, -size / 2],
    [-bottleWidth / 2, -size / 2],
    [-bottleWidth / 2, size / 2],
    [-bottleWidth / 2, size / 2],
    [bottleWidth / 2, size / 2],
    [bottleWidth / 2, size / 2],
    [bottleWidth / 2, -size / 2],
    [bottleWidth / 2, -size / 2],
    [capWidth / 2, -size / 2],
    [capWidth / 2, -size / 2],
    [capWidth / 2, -size / 2 - capHeight],
    [capWidth / 2, -size / 2 - capHeight],
    [-capWidth / 2, -size / 2 - capHeight],
    [-capWidth / 2, -size / 2 - capHeight],
    [-capWidth / 2, -size / 2],
  ];
}

export function bottlePartial(yStart, yEnd, size = 2) {
  const bottleWidth = size / 2;
  const v1 = [-bottleWidth / 2, size / 2 - yStart * size],
    v2 = [bottleWidth / 2, size / 2 - yStart * size],
    v3 = [bottleWidth / 2, size / 2 - yEnd * size],
    v4 = [-bottleWidth / 2, size / 2 - yEnd * size];

  return [
    [v1, v2, v3],
    [v1, v3, v4],
  ];
}

export function circlet(s) {
  s.attr("fill", "transparent")
    .attr("stroke", "#CC8F43")
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
        `${(1 - clamp(levs[valOffset] / maxLev, 0, 1)) * 100}%`
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

export function generateTSpan(text, lineHeight = 1.2, len = 15) {
  return (s) => {
    s.selectAll("*").remove();
    const lines = typeof text === "string" ? wrap(text, len).split("\n") : text;

    const x = s.attr("x");

    lines.forEach((line) => {
      s.append("tspan").attr("x", x).attr("dy", `${lineHeight}em`).text(line);
    });
  };
}

export function getConnectStyle(from, to) {
  const width = dist(from, to);
  const rot = radToDeg(Math.atan2(to[1] - from[1], to[0] - from[0]));
  return {
    left: `${from[0]}px`,
    top: `${from[1]}px`,
    width: `${width}px`,
    rotate: `${rot}deg`,
  };
}
