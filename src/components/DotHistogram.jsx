import * as d3 from "d3";
import { useLayoutEffect, useMemo, useRef } from "react";
import { quantileBins } from "bucket-lib/quantile-bins";

import { objectivesData } from "data/objectives-data";
import { clamp } from "utils/math-utils";

const NUM_CIRCLES = 20;
const MARGIN = { top: 10, right: 10, bottom: 20, left: 10 };

const WATERDROP_ICON = {
  draw: function (context, size) {
    context.moveTo(0, -size / 2);
    context.lineTo(size / 4, -size / 4);

    context.arc(0, 0, size / Math.SQRT2 / 2, -Math.PI / 4, (Math.PI * 5) / 4);
    context.lineTo(0, -size / 2);
    context.closePath();
  },
};

export default function DotHistogram({
  data,
  range = [0, objectivesData.MAX_DELIVS],
  goal,
  setGoal,
  width = 600,
  height = 400,
  shortForm = false,
}) {
  const razorElement = useRef();
  const razorAreaElement = useRef();

  const svgSelector = useRef();
  const circles = useMemo(
    () => quantileBins(width, height, data.length / NUM_CIRCLES, range)(data),
    [data]
  );

  const dataRange = [0, data.length];
  const x = d3.scaleLinear().domain(range).range([0, width]);
  const y = d3.scaleLinear().domain(dataRange).range([height, 0]);
  const count = circles.filter((d) => d[0] > goal).length;

  useLayoutEffect(() => {
    const svgContainer = svgSelector.current
      .attr("width", width + MARGIN.left + MARGIN.right)
      .attr("height", height + MARGIN.top + MARGIN.bottom)
      .style("pointer-events", "none")
      .append("g")
      .attr("class", "graph-area")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    svgContainer
      .append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(
        d3
          .axisBottom()
          .scale(d3.scaleLinear().domain(range).range([0, width]))
          .tickFormat(d3.format(".2s"))
      )
      .call((s) => {
        s.selectAll("line").attr("stroke", "gray");
        s.selectAll("path").attr("stroke", "gray");
        s.selectAll("text").attr("fill", "gray");
      })
      .append("text")
      .attr("fill", "black")
      .attr("transform", `translate(${width / 2}, ${30})`)
      .text("Delivery (TAF)");

    razorElement.current.style.transform = `translateX(${d3
      .scaleLinear()
      .domain(range)
      .range([MARGIN.left, width + MARGIN.left])
      .clamp(true)(goal)}px)`;

    const ignoreFn = (e) => e.preventDefault();
    let dragging = false;

    razorElement.current.addEventListener("mousedown", () => {
      dragging = true;
      window.addEventListener("selectstart", ignoreFn);
    });

    document.addEventListener("mouseup", () => {
      dragging = false;
      window.removeEventListener("selectstart", ignoreFn);
    });

    razorAreaElement.current.addEventListener("mousemove", (e) => {
      if (dragging && e.target === razorAreaElement.current) {
        const razorPos = clamp(e.offsetX, MARGIN.left, MARGIN.left + width);
        d3.select(razorElement.current).style(
          "transform",
          `translateX(${razorPos}px)`
        );

        setGoal(
          d3
            .scaleLinear()
            .domain([MARGIN.left, width + MARGIN.left])
            .range(range)
            .clamp(true)(e.offsetX)
        );
      }
    });
  }, []);

  useLayoutEffect(() => {
    const svgCircles = svgSelector.current
      .select(".graph-area")
      .selectAll(".icons")
      .data(circles)
      .join((enter) => enter.append("g").call((s) => s.append("path")))
      .attr("class", "icons")
      .call((s) => {
        s.selectAll("path").attr(
          "d",
          d3.symbol(WATERDROP_ICON, height / NUM_CIRCLES)
        );
      });

    svgCircles
      .attr("transform", (d) => `translate(${x(d[0])},${y(d[1])})`)
      .attr("fill", (d) => (d[0] > goal ? "steelblue" : "black"));

    razorElement.current.style.transform = `translateX(${d3
      .scaleLinear()
      .domain(range)
      .range([MARGIN.left, width + MARGIN.left])
      .clamp(true)(goal)}px)`;
  }, [goal, circles]);

  return (
    <div
      className={`dot-histogram-wrapper`}
      ref={(e) => (razorAreaElement.current = e)}
    >
      <div
        className={`pdf-razor ` + (shortForm ? "short-form" : "")}
        ref={(e) => (razorElement.current = e)}
      >
        <div>
          <span>
            <u>
              {circles.length - count} / {NUM_CIRCLES}
            </u>{" "}
            {shortForm ? "" : "yrs WILL NOT meet demand"}
          </span>
          <span>
            <u>
              {count} / {NUM_CIRCLES}
            </u>{" "}
            {shortForm ? "" : "yrs WILL meet demand"}
          </span>
        </div>
      </div>
      <svg ref={(e) => void (svgSelector.current = d3.select(e))}></svg>
    </div>
  );
}
