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

export default function DropletGlyph({
  levelInterp,
  colorInterp = interpolateWatercolorBlue,
  width = 200,
  height = 400,
  resolution = LEVELS,
}) {
  const LINE_WIDTH = 3;
  const innerWidth = width - LINE_WIDTH * 2;
  const innerHeight = height - LINE_WIDTH;

  const svgElement = useRef();

  useLayoutEffect(function initialize() {
    const svgContainer = svgElement.current
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("class", "bucket")
      .attr("transform", `translate(${LINE_WIDTH}, ${LINE_WIDTH / 2})`);

    svgContainer.call(bucketShape(innerWidth, innerHeight, drawDroplet));
  }, []);

  useLayoutEffect(
    function onDataChange() {
      const liquidLevels = ticksExact(0, 1, resolution + 1).map((d) =>
        levelInterp(d)
      );

      const glyph = bucketGlyph(innerWidth, innerHeight, levelToDropletLevel);

      const liquids = svgElement.current
        .select(".graph-area")
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
    <div className="waterdrop-wrapper">
      <svg ref={(e) => void (svgElement.current = d3.select(e))}></svg>
    </div>
  );
}
