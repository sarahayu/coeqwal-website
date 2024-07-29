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
import { avgCoords } from "./math-utils";
import { calcLinesAndPositions, getWaterdropGroups } from "./compareview-utils";
import { genUUID, wrap } from "./misc-utils";

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

export const COMP_OBJECTIVE = "DEL_CVP_PRF_S";

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
      [COMP_OBJECTIVE, DEFAULT_OBJECTIVE],
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

    x = -(groupsRef.current.groupPositions[1][0] * k) + camera.width / 2;
    y = groupsRef.current.groupPositions[1][1] * k + camera.height / 2;

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
    setActiveMinidrop("expl0160");
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
    scen: "0180",
    clas: "drop1",
    desc: "increase priority",
  },
  {
    idx: 1,
    scen: "0200",
    clas: "drop2",
    desc: "increase carryover",
  },
  {
    idx: 2,
    scen: "0164",
    clas: "drop3",
    desc: "increase min. flow",
  },
  {
    idx: 3,
    scen: "0175",
    clas: "drop4",
    desc: "increase regs.",
  },
];

function updateDropsSVG(container, waterdropGroups, { onHover }) {
  container
    .selectAll(".large-drop")
    .data(waterdropGroups.groups)
    .join((enter) => {
      return enter.append("g").each(function ({ nodes, height, key }) {
        d3.select(this)
          .call((s) => {
            s.append("text")
              .style("font-size", (height * SPREAD_1_2) / 15)
              .attr("class", "fancy-font water-group-label")
              .attr("text-anchor", "middle");
          })
          .attr("class", "large-drop " + key)
          .selectAll(".small-drop")
          .data(nodes)
          .enter()
          .append("g")
          .attr("class", "small-drop")
          .each(function ({ levs }) {
            const s = d3.select(this);
            s.append("rect")
              .attr("class", "bbox")
              .style("visibility", "hidden");

            const randId = genUUID();

            const stops = d3
              .select(this)
              .append("defs")
              .append("linearGradient")
              .attr("id", `${randId}`)
              .attr("x1", "0%")
              .attr("x2", "0%")
              .attr("y1", "0%")
              .attr("y2", "100%");
            stops.append("stop").attr("stop-color", "transparent");
            stops.append("stop").attr("stop-color", "transparent");

            levs.forEach((_, i) => {
              for (let j = 0; j < 2; j++) {
                stops
                  .append("stop")
                  .attr(
                    "stop-color",
                    interpolateWatercolorBlue(i / LOD_1_LEVELS)
                  );
              }
            });

            s.append("path")
              .attr("d", DROPLET_SHAPE)
              .attr("class", "outline")
              .attr("fill", "none")
              .attr("stroke", "lightgray")
              .attr("stroke-width", 0.05);

            s.append("path")
              .attr("class", "fill")
              .attr("d", DROPLET_SHAPE)
              .attr("fill", `url(#${randId})`);
          });
      });
    })
    .attr("display", "initial")
    .attr(
      "transform",
      (_, i) =>
        `translate(${waterdropGroups.groupPositions[i][0]}, ${waterdropGroups.groupPositions[i][1]})`
    )
    .each(function ({ nodes, key, height }) {
      d3.select(this)
        .call((s) => {
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
        })
        .selectAll(".small-drop")
        .data(nodes)
        .attr("display", "initial")
        .attr(
          "transform",
          ({ x, y }) => `translate(${x * SPREAD_1_2}, ${y * SPREAD_1_2})`
        )
        .on("mouseenter", function (e, d) {
          onHover && onHover(d);
        })
        .each(function ({ levs, maxLev }, i) {
          const s = d3.select(this);

          s.select(".outline").attr(
            "transform",
            `scale(${LOD_1_RAD_PX * 0.95})`
          );
          s.select(".fill").attr("transform", `scale(${LOD_1_RAD_PX})`);

          s.selectAll("stop").each(function (_, i) {
            let actI = Math.floor(i / 2);
            const isEnd = i % 2;

            if (isEnd === 0) actI -= 1;

            if (actI === -1) {
              d3.select(this).attr("offset", `${0}%`);
            } else if (actI === levs.length) {
              d3.select(this).attr("offset", `100%`);
            } else {
              d3.select(this).attr(
                "offset",
                `${(1 - levs[actI] / maxLev) * 100}%`
              );
            }
          });

          const dropBBox = s.select(".fill").node().getBBox();

          s.select(".bbox")
            .attr("x", dropBBox.x)
            .attr("y", dropBBox.y)
            .attr("width", dropBBox.width)
            .attr("height", dropBBox.height);
        });
    });
}
