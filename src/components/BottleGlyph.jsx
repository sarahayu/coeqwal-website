import * as d3 from "d3";
import { useLayoutEffect, useRef } from "react";

import {
  bucketGlyph,
  bucketShape,
  drawDroplet,
  transitionSway,
} from "bucket-lib/bucket-glyph";
import {
  interpolateWatercolorBlue,
  levelToDropletLevel,
  ticksExact,
} from "bucket-lib/utils";

const LEVELS = 10;

function drawBottle(context, width, height) {
  const bottleWidth = height / 2;
  const capWidth = (bottleWidth * 2) / 3;
  const capHeight = capWidth / 2;
  context.moveTo(capWidth / 2, -height / 2);
  context.lineTo(-bottleWidth / 2, -height / 2);
  context.lineTo(-bottleWidth / 2, height / 2);
  context.lineTo(bottleWidth / 2, height / 2);
  context.lineTo(bottleWidth / 2, -height / 2);
  context.lineTo(capWidth / 2, -height / 2);
  context.lineTo(capWidth / 2, -height / 2 - capHeight);
  context.lineTo(-capWidth / 2, -height / 2 - capHeight);
  context.lineTo(-capWidth / 2, -height / 2);
}

export default function BottleGlyph({
  levelInterp,
  colorInterp = interpolateWatercolorBlue,
  width = 200,
  height = 400,
  resolution = LEVELS,
}) {
  const LINE_WIDTH = 3;

  const svgElement = useRef();

  useLayoutEffect(function initialize() {
    const svgContainer = svgElement.current
      .attr("width", width + LINE_WIDTH * 2)
      .attr("height", height + LINE_WIDTH + height / 6)
      .append("g")
      .attr("class", "bucket")
      .attr(
        "transform",
        `translate(${LINE_WIDTH}, ${LINE_WIDTH / 2 + height / 6})`
      );

    svgContainer.call(bucketShape(width, height, drawBottle));
  }, []);

  useLayoutEffect(
    function onDataChange() {
      const liquidLevels = ticksExact(0, 1, resolution + 1).map((d) =>
        levelInterp(d)
      );

      const glyph = bucketGlyph(width, height);

      const liquids = svgElement.current
        .select(".masked-area")
        .selectAll(".bucket-box")
        .data(glyph(liquidLevels))
        .join("rect")
        .attr("class", "bucket-box")
        .attr("width", (d) => d.width)
        .attr("height", (d) => d.height)
        .attr("x", (d) => d.x)
        .attr("fill", (_, i) => colorInterp(i / resolution));

      transitionSway(liquids, 200 / height).attr("y", (d) => d.y);
    },
    [levelInterp]
  );

  return (
    <div className="bottle-wrapper">
      <svg ref={(e) => void (svgElement.current = d3.select(e))}></svg>
    </div>
  );
}
