import * as d3 from "d3";
import { useEffect, useMemo, useRef } from "react";
import { getQuantileBins } from "bucket-lib/quantile-histogram";

import { MAX_DELIVS } from "data/objectives-data";

const NUM_CIRCLES = 20;
const MARGIN = { top: 10, right: 10, bottom: 20, left: 10 };
const DOMAIN = [0, MAX_DELIVS];

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
  goal,
  setGoal,
  width = 600,
  height = 400,
  shortForm = false,
}) {
  const { current: razorID } = useRef(Math.floor(Math.random() * 1e9));
  const { current: razorAreaID } = useRef(Math.floor(Math.random() * 1e9));

  const svgSelector = useRef();
  const circles = useMemo(
    () =>
      getQuantileBins(data, DOMAIN, data.length / NUM_CIRCLES, width, height),
    [data]
  );

  const dataRange = [0, data.length];
  const x = d3.scaleLinear().domain(DOMAIN).range([0, width]);
  const y = d3.scaleLinear().domain(dataRange).range([height, 0]);
  const count = circles.filter((d) => d[0] > goal).length;

  useEffect(() => {
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
          .scale(d3.scaleLinear().domain(DOMAIN).range([0, width]))
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

    const razor = document.querySelector(`#i${razorID}`);
    razor.style.transform = `translateX(${d3
      .scaleLinear()
      .domain(DOMAIN)
      .range([MARGIN.left, width + MARGIN.left])
      .clamp(true)(goal)}px)`;

    const ignoreFn = (e) => e.preventDefault();
    let dragging = false;

    document.querySelector(`#i${razorID}`).addEventListener("mousedown", () => {
      dragging = true;
      window.addEventListener("selectstart", ignoreFn);
    });

    document.addEventListener("mouseup", () => {
      dragging = false;
      window.removeEventListener("selectstart", ignoreFn);
    });

    document
      .querySelector(`#i${razorAreaID}`)
      .addEventListener("mousemove", (e) => {
        if (dragging && e.target.id === `i${razorAreaID}`) {
          razor.style.transform = `translateX(${Math.min(
            Math.max(e.offsetX, MARGIN.left),
            MARGIN.left + width
          )}px)
            `;

          setGoal(
            d3
              .scaleLinear()
              .domain([MARGIN.left, width + MARGIN.left])
              .range(DOMAIN)
              .clamp(true)(e.offsetX)
          );
        }
      });
  }, []);

  useEffect(() => {
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

    svgCircles.attr("transform", (d) => `translate(${x(d[0])},${y(d[1])})`);

    svgCircles.attr("fill", (d) => (d[0] > goal ? "steelblue" : "black"));

    const razor = document.querySelector(`#i${razorID}`);
    razor.style.transform = `translateX(${d3
      .scaleLinear()
      .domain(DOMAIN)
      .range([MARGIN.left, width + MARGIN.left])
      .clamp(true)(goal)}px)`;
  }, [goal, circles]);

  return (
    <div className={`dot-${razorAreaID}`} id={`i${razorAreaID}`}>
      <div
        className={`pdf-razor ` + (shortForm ? "short-form" : "")}
        id={`i${razorID}`}
      >
        <div>
          <span>
            {circles.length - count} / {NUM_CIRCLES}{" "}
            {shortForm ? "" : "yrs WILL NOT meet demand"}
          </span>
          <span>
            {count} / {NUM_CIRCLES} {shortForm ? "" : "yrs WILL meet demand"}
          </span>
        </div>
      </div>
      <svg ref={(e) => void (svgSelector.current = d3.select(e))}></svg>
    </div>
  );
}
