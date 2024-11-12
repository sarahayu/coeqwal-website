import * as d3 from "d3";
import { useLayoutEffect, useRef } from "react";

import {
  bucketGlyph,
  bucketShape,
  drawBucketMask,
  drawBucketOutline,
  transitionSway,
} from "bucket-lib/bucket-glyph";
import {
  collideOffsetter,
  interpolateWatercolorBlue,
  ticksExact,
} from "bucket-lib/utils";

const LEVELS = 10;

const PERCENTILE_LABELS = [
  "Maximum",
  "75th Percentile",
  "50th Percentile",
  "25th Percentile",
  "Minimum",
];

export default function BucketGlyph({
  levelInterp,
  colorInterp = interpolateWatercolorBlue,
  width = 200,
  height = 400,
  resolution = LEVELS,
}) {
  const LINE_WIDTH = 3;
  const GLYPH_MARGIN = {
    top: 30,
    right: LINE_WIDTH / 2,
    bottom: 30,
    left: 180,
  };

  const svgElement = useRef();

  useLayoutEffect(function initialize() {
    const svgContainer = svgElement.current
      .attr("width", width + GLYPH_MARGIN.left + GLYPH_MARGIN.right)
      .attr("height", height + GLYPH_MARGIN.top + GLYPH_MARGIN.bottom)
      .append("g")
      .attr("class", "graph-area")
      .attr("transform", `translate(${GLYPH_MARGIN.left},${GLYPH_MARGIN.top})`);

    svgContainer.call(
      bucketShape(width, height, drawBucketMask, drawBucketOutline)
    );
  }, []);

  useLayoutEffect(
    function onDataChange() {
      const liquidLevels = ticksExact(0, 1, resolution + 1).map((d) =>
        levelInterp(d)
      );

      const glyph = bucketGlyph(width, height);
      const data = glyph(liquidLevels);

      const liquids = svgElement.current
        .select(".masked-area")
        .selectAll(".bucket-box")
        .data(data)
        .join("rect")
        .attr("class", "bucket-box")
        .attr("width", (d) => d.width)
        .attr("height", (d) => d.height)
        .attr("x", (d) => d.x)
        .attr("fill", (_, i) => colorInterp(i / resolution));

      transitionSway(liquids, 200 / height).attr("y", (d) => d.y);

      // percentile labels that appear on the side
      const reverseData = data.reverse();

      const labelWidth = 170,
        labelHeight = 30;

      const xOffset = collideOffsetter(reverseData, labelHeight);

      const tagElem = (s) =>
        s.append("g").call((s) => {
          s.append("rect");
          s.append("text");
        });

      const labels = svgElement.current
        .select(".graph-area")
        .selectAll(".bucket-label")
        .data(reverseData)
        .join(tagElem)
        .attr("class", "bucket-label")
        .transition()
        .attr(
          "transform",
          (d, i) =>
            `translate(${-labelWidth / 2 - 3 + xOffset(i)}, ${
              d.y + height / 2
            })`
        );

      labels
        .select("text")
        .text((_, i) => PERCENTILE_LABELS[data.length - 1 - i])
        .style("fill", (_, i) => (i > data.length / 2 ? "black" : "white"));

      labels
        .select("rect")
        .attr("width", labelWidth)
        .attr("height", labelHeight)
        .attr("x", -labelWidth / 2)
        .attr("y", -labelHeight / 2)
        .attr("rx", 8)
        .style("fill", (_, i) =>
          colorInterp((data.length - 1 - i) / resolution)
        );
    },
    [levelInterp]
  );

  return (
    <div className="bucket-wrapper">
      <svg ref={(e) => void (svgElement.current = d3.select(e))}></svg>
    </div>
  );
}
