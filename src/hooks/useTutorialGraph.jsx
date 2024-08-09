import * as d3 from "d3";
import { useRef } from "react";
import { MAX_DELIVS } from "data/objectives-data";
import yearlyData from "data/yearly.json";
import {
  DEFAULT_OBJECTIVE,
  COMP_OBJECTIVE,
  BAR_CHART_WIDTH,
  BAR_CHART_HEIGHT,
} from "utils/tutorialview-utils";

const BAR_CHART_MARGIN = { top: 40, right: 30, bottom: 40, left: 60 };

export function useTutorialGraph() {
  const pagRefs = useRef({});
  const prfRefs = useRef({});

  function initGraphArea() {
    initPAG();
    initPRF();
  }

  function initPAG() {
    const svgGroup = d3
      .select("#pag-bar-graph")
      .attr(
        "width",
        BAR_CHART_WIDTH + BAR_CHART_MARGIN.left + BAR_CHART_MARGIN.right
      )
      .attr(
        "height",
        BAR_CHART_HEIGHT + BAR_CHART_MARGIN.top + BAR_CHART_MARGIN.bottom
      )
      .attr("opacity", 1)
      .append("g")
      .attr("class", "svg-group")
      .attr(
        "transform",
        `translate(${BAR_CHART_MARGIN.left},${BAR_CHART_MARGIN.top})`
      );

    const dataDescending = yearlyData[DEFAULT_OBJECTIVE].map(
      (val, placeFromLeft) => ({
        val,
        placeFromLeft,
        year: placeFromLeft + 1,
      })
    ).sort((a, b) => b.val - a.val);

    const x = d3
      .scaleBand()
      .domain(dataDescending.map(({ year }) => year).sort((a, b) => a - b))
      .range([0, BAR_CHART_WIDTH])
      .padding(0.4);
    const y = d3
      .scaleLinear()
      .domain([0, MAX_DELIVS])
      .range([BAR_CHART_HEIGHT, 0]);

    const xaxis = d3
      .axisBottom(x)
      .tickSize(0)
      .tickFormat((d) => `year ${d}`)
      .tickValues(x.domain().filter((_, i) => i === 0 || (i + 1) % 10 === 0));

    svgGroup.append("g").attr("class", "anim-xaxis");
    svgGroup.append("g").attr("class", "axis-y");
    svgGroup
      .select(".anim-xaxis")
      .attr("opacity", 1)
      .attr("transform", `translate(0, ${BAR_CHART_HEIGHT})`)
      .call(xaxis)
      .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end");
    svgGroup.select(".axis-y").call(d3.axisLeft(y));

    pagRefs.current = { x, xaxis, dataDescending };
  }

  function initPRF() {
    const svgGroup = d3
      .select("#prf-bar-graph")
      .attr(
        "width",
        BAR_CHART_WIDTH + BAR_CHART_MARGIN.left + BAR_CHART_MARGIN.right
      )
      .attr(
        "height",
        BAR_CHART_HEIGHT + BAR_CHART_MARGIN.top + BAR_CHART_MARGIN.bottom
      )
      .attr("opacity", 1)
      .append("g")
      .attr("class", "svg-group")
      .attr(
        "transform",
        `translate(${BAR_CHART_MARGIN.left},${BAR_CHART_MARGIN.top})`
      );

    const dataDescending = yearlyData[COMP_OBJECTIVE].map(
      (val, placeFromLeft) => ({
        val,
        placeFromLeft,
        year: placeFromLeft + 1,
      })
    ).sort((a, b) => b.val - a.val);

    const x = d3
      .scaleBand()
      .domain(dataDescending.map(({ year }) => year).sort((a, b) => a - b))
      .range([0, BAR_CHART_WIDTH])
      .padding(0.4);
    const y = d3
      .scaleLinear()
      .domain([0, MAX_DELIVS])
      .range([BAR_CHART_HEIGHT, 0]);

    const xaxis = d3
      .axisBottom(x)
      .tickSize(0)
      .tickFormat((d) => `year ${d}`)
      .tickValues(x.domain().filter((_, i) => i === 0 || (i + 1) % 10 === 0));

    svgGroup.append("g").attr("class", "anim-xaxis");
    svgGroup.append("g").attr("class", "axis-y");
    svgGroup
      .select(".anim-xaxis")
      .attr("opacity", 1)
      .attr("transform", `translate(0, ${BAR_CHART_HEIGHT})`)
      .call(xaxis)
      .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end");
    svgGroup.select(".axis-y").call(d3.axisLeft(y));

    prfRefs.current = { x, xaxis, dataDescending };
  }

  function initBars() {
    initBarsPAG();
    initBarsPRF();
  }

  function initBarsPAG() {
    const { x, dataDescending } = pagRefs.current;
    const y = d3
      .scaleLinear()
      .domain([0, MAX_DELIVS])
      .range([BAR_CHART_HEIGHT, 0]);

    d3.select("#pag-bar-graph .svg-group")
      .selectAll(".bars")
      .data(dataDescending, (d) => d.placeFromLeft)
      .join("rect")
      .attr("class", "bars")
      .attr("x", (d) => x(d.year))
      .attr("y", BAR_CHART_HEIGHT)
      .attr("width", x.bandwidth())
      .attr("height", 0)
      .attr("opacity", 1)
      .attr("fill", "steelblue")
      .transition()
      .duration(500)
      .delay((d) => d.placeFromLeft * 10)
      .attr("y", (d) => y(d.val))
      .attr("height", (d) => BAR_CHART_HEIGHT - y(d.val));
  }

  function initBarsPRF() {
    const { x, dataDescending } = prfRefs.current;
    const y = d3
      .scaleLinear()
      .domain([0, MAX_DELIVS])
      .range([BAR_CHART_HEIGHT, 0]);

    d3.select("#prf-bar-graph .svg-group")
      .selectAll(".bars")
      .data(dataDescending, (d) => d.placeFromLeft)
      .join("rect")
      .attr("class", "bars")
      .attr("x", (d) => x(d.year))
      .attr("y", BAR_CHART_HEIGHT)
      .attr("width", x.bandwidth())
      .attr("height", 0)
      .attr("opacity", 1)
      .attr("fill", "steelblue")
      .transition()
      .duration(500)
      .delay((d) => d.placeFromLeft * 10)
      .attr("y", (d) => y(d.val))
      .attr("height", (d) => BAR_CHART_HEIGHT - y(d.val));
  }

  function condenseBars() {
    condensePAG();
    condensePRF();
  }

  async function condensePAG() {
    const { x, xaxis, dataDescending } = pagRefs.current;
    const newWidth = BAR_CHART_WIDTH / 8;
    const svgGroup = d3.select("#pag-bar-graph .svg-group");

    svgGroup.select(".anim-xaxis").call(xaxis.tickFormat(""));

    const bars = svgGroup.selectAll(".bars");

    await bars
      .style("mix-blend-mode", "multiply")
      .transition()
      .duration(500)
      .attr("opacity", 0.05)
      .transition()
      .delay(
        (d) =>
          100 + (1 - (1 - d.placeFromLeft / dataDescending.length) ** 4) * 1000
      )
      .duration(500)
      .attr("width", newWidth)
      .attr("x", BAR_CHART_WIDTH / 2 - newWidth / 2)
      .end();

    svgGroup
      .select(".anim-xaxis")
      .transition()
      .transition(500)
      .attr("transform", `translate(0, ${BAR_CHART_HEIGHT + 50})`)
      .attr("opacity", 0);

    bars.transition().delay(500).attr("x", 0);

    svgGroup
      .transition()
      .delay(500)
      .attr(
        "transform",
        `translate(${
          BAR_CHART_MARGIN.left + BAR_CHART_WIDTH / 2 - newWidth / 2
        },${BAR_CHART_MARGIN.top})`
      );
  }

  async function condensePRF() {
    const { x, xaxis, dataDescending } = prfRefs.current;
    const newWidth = BAR_CHART_WIDTH / 8;
    const svgGroup = d3.select("#prf-bar-graph .svg-group");

    svgGroup.select(".anim-xaxis").call(xaxis.tickFormat(""));

    const bars = svgGroup.selectAll(".bars");

    await bars
      .style("mix-blend-mode", "multiply")
      .transition()
      .duration(500)
      .attr("opacity", 0.05)
      .transition()
      .delay(
        (d) =>
          100 + (1 - (1 - d.placeFromLeft / dataDescending.length) ** 4) * 1000
      )
      .duration(500)
      .attr("width", newWidth)
      .attr("x", BAR_CHART_WIDTH / 2 - newWidth / 2)
      .end();

    svgGroup
      .select(".anim-xaxis")
      .transition()
      .transition(500)
      .attr("transform", `translate(0, ${BAR_CHART_HEIGHT + 50})`)
      .attr("opacity", 0);

    bars.transition().delay(500).attr("x", 0);

    svgGroup
      .transition()
      .delay(500)
      .attr(
        "transform",
        `translate(${
          BAR_CHART_MARGIN.left + BAR_CHART_WIDTH / 2 - newWidth / 2
        },${BAR_CHART_MARGIN.top})`
      );
  }

  return {
    initGraphArea,
    initBars,
    condenseBars,
  };
}
