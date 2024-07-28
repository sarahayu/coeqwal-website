import * as d3 from "d3";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Scrollama, Step } from "react-scrollama";

import { AppContext } from "AppContext";

import { isState } from "utils/misc-utils";

import yearlyData from "data/yearly.json";
import {
  DELIV_KEY_STRING,
  MAX_DELIVS,
  OBJECTIVES_DATA,
  SCENARIO_KEY_STRING,
} from "data/objectives-data";
import { ticksExact } from "bucket-lib/utils";
import BucketGlyph from "bucket-lib/BucketGlyph";
import WaterdropGlyph from "components/WaterdropGlyph";
import DotHistogram from "components/DotHistogram";
import { hideElems, showElems } from "utils/render-utils";

export const DATE_START = 1921;
export const INTERP_COLOR = d3.interpolateRgbBasis([
  "#F2F5FB",
  "#D0DDEB",
  "#7B9BC0",
  "#4F739F",
  "#112A57",
]);

export const NUM_OPTS = {
  demand: 5,
  carryover: 3,
  priority: 2,
  regs: 4,
  minflow: 5,
};

export const DEFAULT_OBJECTIVE = "DEL_CVP_PAG_N";
export const DEFAULT_SCENARIO = [1, 1, 0, 0, 0]; // expl0160
export const DEFAULT_DELIVS =
  OBJECTIVES_DATA[DEFAULT_OBJECTIVE][SCENARIO_KEY_STRING][
    serialize(...DEFAULT_SCENARIO)
  ][DELIV_KEY_STRING];

export const VARIATIONS = [
  [1, 1, 1, 0, 0], // expl0180
  [1, 2, 0, 0, 0], // expl0200
  [1, 1, 0, 0, 4], // expl0164
  [1, 1, 0, 3, 0], // expl0175
];

export const VARIATIONS_DELIVS = VARIATIONS.map(
  (vars) =>
    OBJECTIVES_DATA[DEFAULT_OBJECTIVE][SCENARIO_KEY_STRING][serialize(...vars)][
      DELIV_KEY_STRING
    ]
);

export const VARIATIONS_INTERPERS = VARIATIONS_DELIVS.map((varDelivs) =>
  d3
    .scaleLinear()
    .domain(ticksExact(0, 1, varDelivs.length))
    .range(
      varDelivs
        .map((v) => v / MAX_DELIVS)
        .sort()
        .reverse()
    )
    .clamp(true)
);

export const DEFAULT_INTERPER = d3
  .scaleLinear()
  .domain(ticksExact(0, 1, DEFAULT_DELIVS.length))
  .range(
    DEFAULT_DELIVS.map((v) => v / MAX_DELIVS)
      .sort()
      .reverse()
  )
  .clamp(true);

export const BAR_CHART_WIDTH = 800,
  BAR_CHART_HEIGHT = 400;

export const BAR_CHART_MARGIN = { top: 30, right: 30, bottom: 30, left: 60 };

export function serialize(demand, carryover, priority, regs, minflow) {
  let code = 0;
  code += minflow;
  code += NUM_OPTS.minflow * regs;
  code += NUM_OPTS.regs * NUM_OPTS.minflow * priority;
  code += NUM_OPTS.priority * NUM_OPTS.regs * NUM_OPTS.minflow * carryover;
  code +=
    NUM_OPTS.carryover *
    NUM_OPTS.priority *
    NUM_OPTS.regs *
    NUM_OPTS.minflow *
    demand;

  const finalKey = `expl${d3.format("0>4")(code)}`;

  return finalKey;
}

export function useTutorialState() {
  const [userGoal, setUserGoal] = useState(200);
  const [bucketInterper, setBucketInterper] = useState(() =>
    d3.scaleLinear().range([0, 0])
  );
  const [dropInterper, setDropInterper] = useState(() =>
    d3.scaleLinear().range([0, 0])
  );
  const [variationInterpers, setVariationInterpers] = useState(() =>
    VARIATIONS.map(() => d3.scaleLinear().range([0, 0]))
  );

  return {
    userGoal,
    setUserGoal,
    bucketInterper,
    setBucketInterper,
    dropInterper,
    setDropInterper,
    variationInterpers,
    setVariationInterpers,
  };
}

export function useTutorialGraph() {
  const d3Refs = useRef({});

  function initGraphArea() {
    const svgGroup = d3
      .select("#tut-bar-graph")
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

    const dataDescending = yearlyData
      .map((val, placeFromLeft) => ({
        val,
        placeFromLeft,
        year: placeFromLeft + DATE_START,
      }))
      .sort((a, b) => b.val - a.val);

    const x = d3
      .scaleBand()
      .domain(dataDescending.map(({ year }) => year).sort())
      .range([0, BAR_CHART_WIDTH])
      .padding(0.4);
    const y = d3
      .scaleLinear()
      .domain([0, MAX_DELIVS])
      .range([BAR_CHART_HEIGHT, 0]);

    const xaxis = d3
      .axisBottom(x)
      .tickSize(0)
      .tickValues(x.domain().filter((_, i) => i % 10 === 0));

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

    d3Refs.current = { x, xaxis, dataDescending };
  }

  function initBars() {
    const { x, dataDescending } = d3Refs.current;
    const y = d3
      .scaleLinear()
      .domain([0, MAX_DELIVS])
      .range([BAR_CHART_HEIGHT, 0]);

    d3.select(".svg-group")
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

  async function condenseBars() {
    const { x, xaxis, dataDescending } = d3Refs.current;
    const newWidth = BAR_CHART_WIDTH / 8;
    const svgGroup = d3.select(".svg-group");

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

export const DROP_VARIATIONS = [
  {
    idx: 0,
    scen: "0180",
    clas: "drop1",
  },
  {
    idx: 1,
    scen: "0200",
    clas: "drop2",
  },
  {
    idx: 2,
    scen: "0164",
    clas: "drop3",
  },
  {
    idx: 3,
    scen: "0175",
    clas: "drop4",
  },
];
