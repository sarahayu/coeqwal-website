import * as d3 from "d3";
import { useLayoutEffect, useRef } from "react";

import {
  bucketGlyph,
  bucketShape,
  drawDroplet,
  transitionSway,
} from "bucket-lib/bucket-glyph";
import {
  collideOffsetter,
  interpolateWatercolorBlue,
  levelToDropletLevel,
  ticksExact,
} from "bucket-lib/utils";

const LEVELS = 10;

function drawBottle(context, width, height) {
  const bottleWidth = height / 2;
  const capWidth = (bottleWidth * 2) / 3;
  const capHeight = capWidth / 2;
  const cornerRad = capHeight / 3;
  const capCornerRad = cornerRad / 2;

  context.moveTo(capWidth / 2, -height / 2);
  context.lineTo(-bottleWidth / 2 + cornerRad, -height / 2);
  context.arc(
    -bottleWidth / 2 + cornerRad,
    -height / 2 + cornerRad,
    cornerRad,
    (Math.PI * 3) / 2,
    Math.PI,
    true
  );
  context.lineTo(-bottleWidth / 2, height / 2 - cornerRad);
  context.arc(
    -bottleWidth / 2 + cornerRad,
    height / 2 - cornerRad,
    cornerRad,
    Math.PI,
    Math.PI / 2,
    true
  );
  context.lineTo(bottleWidth / 2 - cornerRad, height / 2);
  context.arc(
    bottleWidth / 2 - cornerRad,
    height / 2 - cornerRad,
    cornerRad,
    Math.PI / 2,
    0,
    true
  );
  context.lineTo(bottleWidth / 2, -height / 2 + cornerRad);
  context.arc(
    bottleWidth / 2 - cornerRad,
    -height / 2 + cornerRad,
    cornerRad,
    0,
    (Math.PI * 3) / 2,
    true
  );
  context.lineTo(capWidth / 2, -height / 2);
  context.lineTo(capWidth / 2, -height / 2 - capHeight + capCornerRad);
  context.arc(
    capWidth / 2 - capCornerRad,
    -height / 2 - capHeight + capCornerRad,
    capCornerRad,
    0,
    (Math.PI * 3) / 2,
    true
  );
  context.lineTo(-capWidth / 2 + capCornerRad, -height / 2 - capHeight);
  context.arc(
    -capWidth / 2 + capCornerRad,
    -height / 2 - capHeight + capCornerRad,
    capCornerRad,
    (Math.PI * 3) / 2,
    Math.PI,
    true
  );
  context.lineTo(-capWidth / 2, -height / 2);
}

function drawBottleCap(context, width, bottleHeight) {
  const bottleWidth = bottleHeight / 2;
  const capWidth = (bottleWidth * 2) / 3;
  const capHeight = capWidth / 2;
  const cornerRad = capHeight / 3;
  const capCornerRad = cornerRad / 2;

  context.moveTo(capWidth / 2, -bottleHeight / 2);
  context.lineTo(capWidth / 2, -bottleHeight / 2 - capHeight + capCornerRad);
  context.arc(
    capWidth / 2 - capCornerRad,
    -bottleHeight / 2 - capHeight + capCornerRad,
    capCornerRad,
    0,
    (Math.PI * 3) / 2,
    true
  );
  context.lineTo(-capWidth / 2 + capCornerRad, -bottleHeight / 2 - capHeight);
  context.arc(
    -capWidth / 2 + capCornerRad,
    -bottleHeight / 2 - capHeight + capCornerRad,
    capCornerRad,
    (Math.PI * 3) / 2,
    Math.PI,
    true
  );
  context.lineTo(-capWidth / 2, -bottleHeight / 2);
  context.closePath();
}

const PERCENTILE_LABELS = [
  "Maximum",
  "75th Percentile",
  "50th Percentile",
  "25th Percentile",
  "Minimum",
];

export default function TaggedBottleGlyph({
  levelInterp,
  maxValue = 100,
  colorInterp = interpolateWatercolorBlue,
  width = 200,
  height = 400,
  resolution = LEVELS,
}) {
  const LINE_WIDTH = 3;
  const GLYPH_MARGIN = {
    top: LINE_WIDTH / 2 + height / 6,
    right: LINE_WIDTH / 2,
    bottom: LINE_WIDTH / 2 + 20,
    left: 180,
  };

  const svgElement = useRef();

  useLayoutEffect(function initialize() {
    const svgContainer = svgElement.current
      .attr("width", width + GLYPH_MARGIN.left + GLYPH_MARGIN.right)
      .attr("height", height + GLYPH_MARGIN.top + GLYPH_MARGIN.bottom)
      .append("g")
      .attr("class", "bucket")
      .attr("transform", `translate(${GLYPH_MARGIN.left},${GLYPH_MARGIN.top})`);

    svgContainer.call(bucketShape(width, height, drawBottle));

    const path = d3.path();
    drawBottleCap(path, width, height);

    svgContainer
      .append("path")
      .attr("class", "bottlecap")
      .attr("transform", `translate(${width / 2}, ${height / 2})`)
      .attr("stroke", "none")
      .attr("fill", "lightgray")
      .attr("d", path.toString());

    svgContainer
      .append("g")
      .attr("class", "bottle-axis")
      .attr("transform", `translate(${width / 2 - height / 8}, ${height / 2})`);
  }, []);

  useLayoutEffect(
    function onDataChange() {
      const maxHeight = 0.95;
      const liquidLevels = ticksExact(0, 1, resolution + 1).map(
        (d) => levelInterp(d) * maxHeight
      );

      const glyph = bucketGlyph(width, height);
      const data = glyph(liquidLevels);

      const x = d3
        .scaleLinear()
        .domain([maxValue * 0.05, maxValue])
        .range([
          height / 2 - height * maxHeight * 0.05,
          height / 2 - height * maxHeight,
        ]);

      svgElement.current
        .select(".bottle-axis")
        .call(
          d3.axisRight(x).ticks(4).tickSize(12).tickFormat(d3.format(".2s"))
        );

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
        .select(".bucket")
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
    <div className="bottle-wrapper">
      <svg ref={(e) => void (svgElement.current = d3.select(e))}></svg>
    </div>
  );
}
