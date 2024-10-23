import * as d3 from "d3";
import { useId, useLayoutEffect, useMemo, useRef } from "react";
import {
  bucketPath,
  interpolateWatercolorBlue,
  ticksExact,
  usePrevious,
} from "./utils";

const DEGREE_SWAY = 40;
const LEVELS = 10;
const LINE_WIDTH = 3;

export default function BucketGlyph({
  levelInterp,
  colorInterp = interpolateWatercolorBlue,
  width = 200,
  height = 400,
  resolution = LEVELS,
}) {
  const id = useId();
  const svgSelector = useRef();

  const liquidLevels = useMemo(
    () => ticksExact(0, 1, resolution + 1).map((d) => levelInterp(d)),
    [levelInterp, resolution]
  );

  const prevLiquidLevels = usePrevious(liquidLevels);

  const innerWidth = width - LINE_WIDTH * 2;
  const innerHeight = height - LINE_WIDTH;

  useLayoutEffect(() => {
    const svgContainer = svgSelector.current
      .append("g")
      .attr("class", "svg-container")
      .attr("transform", `translate(${LINE_WIDTH}, ${LINE_WIDTH / 2})`);

    svgContainer
      .append("defs")
      .append("clipPath")
      .attr("id", "bucket-mask-" + id)
      .append("path")
      .attr("class", "bucket-mask-path");

    svgContainer
      .append("g")
      .attr("class", "graph-area")
      .attr("clip-path", `url(#bucket-mask-${id})`);

    svgContainer
      .append("g")
      .append("path")
      .attr("class", "bucket-outline")
      .attr("stroke", "lightgray")
      .attr("stroke-linecap", "round")
      .attr("stroke-width", LINE_WIDTH)
      .attr("fill", "none");
  }, [id]); // id shouldn't change, basically empty dependency array

  useLayoutEffect(() => {
    const svgContainer = svgSelector.current
      .attr("width", width)
      .attr("height", height)
      .select(".svg-container");

    svgContainer
      .select(".bucket-mask-path")
      .attr("d", bucketPath(innerWidth, innerHeight));

    svgContainer
      .select(".bucket-outline")
      .attr("d", bucketPath(innerWidth, innerHeight).split("z")[0]);
  }, [width, height, innerWidth, innerHeight]);

  useLayoutEffect(() => {
    const liquids = svgSelector.current
      .select(".graph-area")
      .selectAll(".bucketBox")
      .data(liquidLevels)
      .join("rect")
      .attr("class", "bucketBox")
      .attr("width", innerWidth * 2)
      .attr("height", innerHeight * 2)
      .attr("x", -innerWidth / 2)
      .attr("fill", (_, i) => colorInterp(i / resolution));

    liquids
      .transition("liquidLevel")
      .ease(d3.easeElasticOut.period(0.6))
      .delay((_, i) => i * (100 / resolution))
      .duration(1000)
      .attr("y", (d) => innerHeight - d * innerHeight);

    liquids
      .transition("liquidSway")
      .duration(2000)
      .delay((_, i) => i * 10)
      .ease(d3.easeQuad)
      .attrTween("transform", function (d, i) {
        const diff = prevLiquidLevels ? Math.abs(prevLiquidLevels[i] - d) : 0;
        return (t) =>
          `rotate(${
            Math.sin(
              Math.min((Math.PI * 4 * t) / (0.5 * diff + 0.5), Math.PI * 4)
            ) *
            diff *
            DEGREE_SWAY *
            (1 - t)
          }, ${innerWidth / 2}, ${0})`;
      });
  }, [
    liquidLevels,
    prevLiquidLevels,
    width,
    height,
    innerWidth,
    innerHeight,
    resolution,
    colorInterp,
  ]);

  return (
    <div className="bucket-wrapper">
      <svg ref={(e) => void (svgSelector.current = d3.select(e))}></svg>
    </div>
  );
}
