import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

import { interpolateWatercolorBlue, ticksExact } from "bucket-lib/utils";
import {
  DELIV_KEY_STRING,
  MAX_DELIVS,
  OBJECTIVES_DATA,
  SCENARIO_KEY_STRING,
} from "data/objectives-data";
import yearlyData from "data/yearly.json";
import { DESCRIPTIONS_DATA } from "data/descriptions-data";
import { LOD_1_LEVELS } from "settings";
import { SPREAD_1_2 } from "settings";
import { DROPLET_SHAPE, circlet, hideElems, showElems } from "./render-utils";
import { LOD_1_RAD_PX } from "settings";
import { avgCoords, dropCenterCorrection } from "./math-utils";
import { calcLinesAndPositions, getWaterdropGroups } from "./compareview-utils";
import { genUUID, wrap } from "./misc-utils";
import { deserialize, serialize } from "./data-utils";
import { gradientUpdate } from "./render-utils";
import { gradientInit } from "./render-utils";

export const DATE_START = 1921;
export const INTERP_COLOR = d3.interpolateRgbBasis([
  "#F2F5FB",
  "#D0DDEB",
  "#7B9BC0",
  "#4F739F",
  "#112A57",
]);

export const DEFAULT_OBJECTIVE = "DEL_CVP_PAG_N";
export const COMP_OBJECTIVE = "DEL_CVP_PRF_S";
export const DEFAULT_SCENARIO = deserialize("0000");
export const PAG_DELIVS =
  OBJECTIVES_DATA[DEFAULT_OBJECTIVE][SCENARIO_KEY_STRING][
    serialize(...DEFAULT_SCENARIO)
  ][DELIV_KEY_STRING];
export const PRF_DELIVS =
  OBJECTIVES_DATA[COMP_OBJECTIVE][SCENARIO_KEY_STRING][
    serialize(...DEFAULT_SCENARIO)
  ][DELIV_KEY_STRING];

export const VARIATIONS = [
  deserialize("0020"), // change priority
  deserialize("0080"), // increase carryover
  deserialize("0480"), // decrease demand
  deserialize("0004"), // increase minflow
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

export const PAG_INTERPER = d3
  .scaleLinear()
  .domain(ticksExact(0, 1, PAG_DELIVS.length))
  .range(
    PAG_DELIVS.map((v) => v / MAX_DELIVS)
      .sort()
      .reverse()
  )
  .clamp(true);

export const PRF_INTERPER = d3
  .scaleLinear()
  .domain(ticksExact(0, 1, PRF_DELIVS.length))
  .range(
    PRF_DELIVS.map((v) => v / MAX_DELIVS)
      .sort()
      .reverse()
  )
  .clamp(true);

export const BAR_CHART_WIDTH = 500,
  BAR_CHART_HEIGHT = 400;

export const BAR_CHART_MARGIN = { top: 40, right: 30, bottom: 40, left: 60 };

export function useTutorialState() {
  const [userGoal, setUserGoal] = useState(200);
  const [bucketInterperPAG, setBucketInterperPAG] = useState(() =>
    d3.scaleLinear().range([0, 0])
  );
  const [bucketInterperPRF, setBucketInterperPRF] = useState(() =>
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
    bucketInterperPAG,
    setBucketInterperPAG,
    bucketInterperPRF,
    setBucketInterperPRF,
    dropInterper,
    setDropInterper,
    variationInterpers,
    setVariationInterpers,
  };
}

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

export function useTutorialComparer() {
  const [activeMinidrop, setActiveMinidrop] = useState();
  const groupsRef = useRef();
  const camCentersRef = useRef({});

  useEffect(
    function updateCirclets() {
      if (activeMinidrop) {
        const [positions, lines] = calcLinesAndPositions(
          groupsRef.current,
          activeMinidrop
        );

        updateLabel(avgCoords(positions));
        updateScenIndicators(positions, lines);
      }
    },
    [activeMinidrop]
  );

  function initComparer(waterdrops, camera) {
    groupsRef.current = getWaterdropGroups(
      [DEFAULT_OBJECTIVE, COMP_OBJECTIVE],
      waterdrops,
      [0, 0]
    );

    const farHeight = waterdrops.groups[0].height * 2 * SPREAD_1_2 * 0.75;
    const k = camera.height / farHeight;

    let x = camera.width / 2;
    let y = camera.height / 2;

    const camMidpoint = {
      x,
      y,
      k,
    };

    x = -(groupsRef.current.groupPositions[0][0] * k) + camera.width / 2;
    y = groupsRef.current.groupPositions[0][1] * k + camera.height / 2;

    const camFirstDrop = {
      x,
      y,
      k,
    };

    camCentersRef.current.firstDrop = camFirstDrop;
    camCentersRef.current.midpoint = camMidpoint;

    const container = d3
      .select("#comparer-graphics")
      .attr("width", window.innerWidth)
      .attr("height", window.innerHeight)
      .append("g")
      .attr("class", "svg-group")
      .attr(
        "transform",
        d3.zoomIdentity
          .translate(camFirstDrop.x, camFirstDrop.y)
          .scale(camFirstDrop.k)
      );

    const indicatorGroup = container
      .append("g")
      .attr("class", "indicator-group");

    indicatorGroup.append("text").attr("id", "member-variable");
    indicatorGroup.append("text").attr("id", "member-label");

    updateDropsSVG(container, groupsRef.current, {
      onHover: (d) => {
        setActiveMinidrop(d.key);
      },
    });

    setActiveMinidrop("expl0000");
    hideElems(`.large-drop.${COMP_OBJECTIVE}, .indicator-group`, container);
  }

  function updateLabel(pos) {
    const [textX, textY] = pos;

    const smallTextSize =
      (groupsRef.current.groups[0].height * SPREAD_1_2) / 15;
    const largeTextSize =
      (groupsRef.current.groups[0].height * SPREAD_1_2) / 10;

    d3.select("#comparer-graphics")
      .select("#member-label")
      .text("scenario")
      .attr("font-size", smallTextSize)
      .transition()
      .duration(100)
      .attr("x", textX)
      .attr("y", textY - smallTextSize * 1.5);

    d3.select("#comparer-graphics")
      .select("#member-variable")
      .attr("font-size", largeTextSize)
      .text(activeMinidrop.slice(4))
      .transition()
      .duration(100)
      .attr("x", textX)
      .attr("y", textY);
  }

  function updateScenIndicators(positions, lines) {
    d3.select("#comparer-graphics .indicator-group")
      .selectAll(".circlet")
      .data(positions)
      .join("circle")
      .attr("class", "circlet")
      .call(circlet)
      .attr("r", LOD_1_RAD_PX * 1.5)
      .transition()
      .duration(100)
      .attr("cx", (d) => d[0])
      .attr("cy", (d) => d[1]);

    d3.select("#comparer-graphics .indicator-group")
      .selectAll(".comp-line")
      .data(lines)
      .join("path")
      .attr("class", "comp-line")
      .transition()
      .duration(100)
      .attr("d", (d) => d3.line()(d));
  }

  function introDrop2() {
    const container = d3.select("#comparer-graphics");

    container
      .select(".svg-group")
      .transition()
      .attr(
        "transform",
        d3.zoomIdentity
          .translate(
            camCentersRef.current.midpoint.x,
            camCentersRef.current.midpoint.y
          )
          .scale(camCentersRef.current.midpoint.k)
      );

    showElems(`.large-drop.${COMP_OBJECTIVE}, .indicator-group`, container);
  }

  return { initComparer, introDrop2 };
}

export const DROP_VARIATIONS = [
  {
    idx: 0,
    scen: "0020",
    clas: "drop1",
    desc: "change priority",
  },
  {
    idx: 1,
    scen: "0080",
    clas: "drop2",
    desc: "increase carryover",
  },
  {
    idx: 2,
    scen: "0480",
    clas: "drop3",
    desc: "decrease demand",
  },
  {
    idx: 3,
    scen: "0004",
    clas: "drop4",
    desc: "increase minimum flow",
  },
];

function updateDropsSVG(container, waterdropGroups, { onHover }) {
  container
    .selectAll(".large-drop")
    .data(waterdropGroups.groups)
    .join((enter) => {
      return enter.append("g").each(function (group, i) {
        d3.select(this).call(
          largeDropInit(group, waterdropGroups.groupPositions[i])
        );
      });
    })
    .attr("transform", (_, i) => {
      const groupPos = waterdropGroups.groupPositions[i];
      return `translate(${groupPos[0]}, ${groupPos[1]})`;
    })
    .each(function (group) {
      d3.select(this)
        .call(largeDropUpdate(group))
        .selectAll(".small-drop")
        .on("mouseenter", function (e, d) {
          onHover && onHover(d);
        });
    });
}

function largeDropInit({ nodes, height, key }) {
  return (s) => {
    s.attr("class", "large-drop " + key);

    s.append("circle")
      .attr("class", "highlight-circle")
      .attr("stroke", "none")
      .attr("fill", "yellow")
      .attr("r", LOD_1_RAD_PX * 2);

    s.append("text")
      .style("font-size", (height * SPREAD_1_2) / 15)
      .attr("class", "fancy-font water-group-label")
      .attr("text-anchor", "middle");

    s.selectAll(".small-drop")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "small-drop")
      .each(function (node) {
        d3.select(this).call(smallDropInit(node));
      });
  };
}

function smallDropInit({ key, levs, x, y }) {
  return (s) => {
    s.append("rect").attr("class", "bbox").style("visibility", "hidden");

    const randId = `tut-grad-${genUUID()}`;

    s.call(gradientInit(levs, randId));

    if (key === "expl0000") {
      d3.select(s.node().parentNode)
        .select(".highlight-circle")
        .attr("cx", x * SPREAD_1_2)
        .attr(
          "cy",
          y * SPREAD_1_2 - dropCenterCorrection({ rad: LOD_1_RAD_PX })
        );
    }

    s.append("path")
      .attr("d", DROPLET_SHAPE)
      .attr("class", "outline")
      .attr("transform", `scale(${LOD_1_RAD_PX * 0.95})`);

    s.append("path")
      .attr("class", "fill")
      .attr("d", DROPLET_SHAPE)
      .attr("fill", `url(#${randId})`)
      .attr("transform", `scale(${LOD_1_RAD_PX})`);
  };
}

function largeDropUpdate({ nodes, key, height }) {
  return (s) => {
    const t = s.select("text");

    t.selectAll("*").remove();

    const lines = wrap(
      DESCRIPTIONS_DATA[key].display_name || DESCRIPTIONS_DATA[key].id
    ).split("\n");

    lines.forEach((line, i) => {
      t.append("tspan")
        .attr("x", 0)
        .attr("y", (height / 2) * SPREAD_1_2)
        .attr("dy", `${i}em`)
        .text(line);
    });

    s.selectAll(".small-drop")
      .data(nodes)
      .attr("display", "initial")
      .attr(
        "transform",
        ({ x, y }) => `translate(${x * SPREAD_1_2}, ${y * SPREAD_1_2})`
      )
      .each(function (node) {
        d3.select(this).call(smallDropUpdate(node));
      });
  };
}

function smallDropUpdate({ levs, maxLev }) {
  return (s) => {
    s.call(gradientUpdate(levs, maxLev));

    const dropBBox = s.select(".fill").node().getBBox();

    s.select(".bbox")
      .attr("x", dropBBox.x)
      .attr("y", dropBBox.y)
      .attr("width", dropBBox.width)
      .attr("height", dropBBox.height);
  };
}
