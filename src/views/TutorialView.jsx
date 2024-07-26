import * as d3 from "d3";
import React, { useContext, useEffect, useRef, useState } from "react";
import { Scrollama, Step } from "react-scrollama";

import { AppContext } from "AppContext";

import { isState, useStateRef, wrap } from "utils/misc-utils";

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

const DATE_START = 1921;
const INTERP_COLOR = d3.interpolateRgbBasis([
  "#F2F5FB",
  "#D0DDEB",
  "#7B9BC0",
  "#4F739F",
  "#112A57",
]);

const D_KEY = "demand",
  C_KEY = "carryover",
  P_KEY = "priority",
  R_KEY = "regs",
  M_KEY = "minflow";

const NUM_OPTS = {
  [D_KEY]: 5,
  [C_KEY]: 3,
  [P_KEY]: 2,
  [R_KEY]: 4,
  [M_KEY]: 5,
};

const THRESHOLDS = {};

Object.keys(NUM_OPTS).forEach(
  (variable) =>
    (THRESHOLDS[variable] = d3.scaleQuantize(
      ticksExact(0, 1, NUM_OPTS[variable])
    ))
);

const DEFAULT_SCENARIO = {
  demand: 1,
  carryover: 1,
  priority: 0,
  regs: 0,
  minflow: 0,
};

const VARIATIONS = [
  [1, 1, 1, 0, 0],
  [1, 2, 0, 0, 0],
  [1, 1, 0, 0, 4],
  [1, 1, 0, 3, 0],
];

const VARIATIONS_DELIVS = VARIATIONS.map(
  (vars) =>
    OBJECTIVES_DATA["DEL_CVP_PAG_N"][SCENARIO_KEY_STRING][serialize(...vars)][
      DELIV_KEY_STRING
    ]
);

const VARIATIONS_INTERPERS = VARIATIONS_DELIVS.map((varDelivs) =>
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

export default function TutorialView() {
  const {
    waterdrops,
    state,
    setState,
    camera,
    zoomTo,
    setActiveWaterdrops,
    activeWaterdrops,
    setDisableCamAdjustments,
    getOutlineOpac,
    addZoomHandler,
  } = useContext(AppContext);

  const [slide, setSlide] = useState(0);
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
  const d3Refs = useRef({});

  const width = 800,
    height = 400;

  const margin = { top: 30, right: 30, bottom: 30, left: 60 };

  useEffect(function initialize() {
    //
  }, []);

  useEffect(
    function enterState() {
      if (isState(state, "TutorialView")) {
        document.querySelector(".bucket-wrapper").style.display = "none";
        const svgContainer = d3.select("#tut-bar-graph");
        d3.selectAll(".vardrop").style("display", "none");
        d3.selectAll(".vardrop p").style("display", "none");
        d3.selectAll(".vardrop > :last-child").style("display", "none");
        d3.select(".main-histogram").style("display", "none");

        const svgGroup = svgContainer
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .attr("opacity", 1)
          .append("g")
          .attr("class", "svg-group")
          .attr("transform", `translate(${margin.left},${margin.top})`);

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
          .range([0, width])
          .padding(0.4);
        const y = d3.scaleLinear().domain([0, MAX_DELIVS]).range([height, 0]);

        const xaxis = d3
          .axisBottom(x)
          .tickSize(0)
          .tickValues(x.domain().filter((_, i) => i % 10 === 0));

        svgGroup.append("g").attr("class", "anim-xaxis");
        svgGroup.append("g").attr("class", "axis-y");
        svgGroup
          .select(".anim-xaxis")
          .attr("opacity", 1)
          .attr("transform", `translate(0, ${height})`)
          .call(xaxis)
          .selectAll("text")
          .attr("transform", "translate(-10,0)rotate(-45)")
          .style("text-anchor", "end");
        svgGroup.select(".axis-y").call(d3.axisLeft(y));

        d3Refs.current.x = x;
        d3Refs.current.xaxis = xaxis;
        d3Refs.current.dataDescending = dataDescending;

        return function exitState() {
          d3.select(".tutorial-view").style("display", "none");
          d3.select("#mosaic-webgl").style("display", "initial");
          d3.select("#mosaic-svg").style("display", "initial");
        };
      }
    },
    [state]
  );

  const [currentStepIndex, setCurrentStepIndex] = useState(null);
  const maxSlideReachedRef = useRef(-1);

  const onStepEnter = async ({ data, direction }) => {
    setCurrentStepIndex(data);

    if (direction === "up") return;

    if (data <= maxSlideReachedRef.current) return;

    maxSlideReachedRef.current = data;

    const svgGroup = d3.select(".svg-group");
    const { x, xaxis, dataDescending } = d3Refs.current;
    const y = d3.scaleLinear().domain([0, MAX_DELIVS]).range([height, 0]);

    if (data === 2) {
      svgGroup
        .selectAll(".bars")
        .data(dataDescending, (d) => d.placeFromLeft)
        .join("rect")
        .attr("class", "bars")
        .attr("x", (d) => x(d.year))
        .attr("y", height)
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("opacity", 1)
        .attr("fill", "steelblue")
        .transition()
        .duration(500)
        .delay((d) => d.placeFromLeft * 10)
        .attr("y", (d) => y(d.val))
        .attr("height", (d) => height - y(d.val));
    }

    if (data === 4) {
      const newWidth = width / 8;

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
            100 +
            (1 - (1 - d.placeFromLeft / dataDescending.length) ** 4) * 1000
        )
        .duration(500)
        .attr("width", newWidth)
        .attr("x", (d) => width / 2 - newWidth / 2)
        .end();

      svgGroup
        .select(".anim-xaxis")
        .transition()
        .transition(500)
        .attr("transform", `translate(0, ${height + 50})`)
        .attr("opacity", 0);

      bars.transition().delay(500).attr("x", 0);

      svgGroup
        .transition()
        .delay(500)
        .attr(
          "transform",
          `translate(${margin.left + width / 2 - newWidth / 2},${margin.top})`
        );
    }

    if (data === 5) {
      document.querySelector(".bucket-wrapper").style.display = "initial";
      d3.select("#tut-bar-graph").attr("opacity", 0);

      setBucketInterper(() =>
        d3
          .scaleLinear()
          .domain(
            ticksExact(
              0,
              1,
              OBJECTIVES_DATA["DEL_CVP_PAG_N"][SCENARIO_KEY_STRING][
                serialize(...Object.values(DEFAULT_SCENARIO))
              ][DELIV_KEY_STRING].length
            )
          )
          .range(
            OBJECTIVES_DATA["DEL_CVP_PAG_N"][SCENARIO_KEY_STRING][
              serialize(...Object.values(DEFAULT_SCENARIO))
            ][DELIV_KEY_STRING].map((v) => v / MAX_DELIVS)
              .sort()
              .reverse()
          )
          .clamp(true)
      );
    }

    if (data === 6) {
      setDropInterper(() =>
        d3
          .scaleLinear()
          .domain(
            ticksExact(
              0,
              1,
              OBJECTIVES_DATA["DEL_CVP_PAG_N"][SCENARIO_KEY_STRING][
                serialize(...Object.values(DEFAULT_SCENARIO))
              ][DELIV_KEY_STRING].length
            )
          )
          .range(
            OBJECTIVES_DATA["DEL_CVP_PAG_N"][SCENARIO_KEY_STRING][
              serialize(...Object.values(DEFAULT_SCENARIO))
            ][DELIV_KEY_STRING].map((v) => v / MAX_DELIVS)
              .sort()
              .reverse()
          )
          .clamp(true)
      );
    }

    if (data === 8) {
      d3.selectAll(".vardrop").style("display", "initial");
    }

    if (data === 9) {
      d3.selectAll(".vardrop path").style("stroke-dasharray", "none");
      setVariationInterpers(VARIATIONS_INTERPERS);
    }

    if (data === 10) {
      d3.selectAll(".vardrop p").style("display", "block");
    }

    if (data === 11) {
      d3.select(".drop1").classed("highlighted", true);
    }

    if (data === 12) {
      d3.select(".drop1").classed("highlighted", false);
      d3.select(".drop1-border").style("visibility", "hidden");
      d3.selectAll(".vardrop p").style("opacity", "0.5");
      d3.selectAll(".vardrop p, .vardrop span").style("color", "gray");
      d3.selectAll(".drop1 > :first-child, .drop3 > :first-child")
        .transition()
        .style("transform", "translate(-50px, 15px) scale(0.5)");
      d3.selectAll(".drop2 > :first-child, .drop4 > :first-child")
        .transition()
        .style("transform", "translate(50px, 15px) scale(0.5)");
      d3.select(".main-histogram").style("display", "initial");
      d3.select(".main-waterdrop")
        .transition()
        .style("transform", "translateY(-100px) scale(0.5)");
      d3.selectAll(".vardrop > :last-child").style("display", "initial");
      d3.selectAll(".vardrop > :last-child").style("display", "initial");
    }
  };

  if (!isState(state, "TutorialView")) return;

  return (
    <div className="tutorial-view">
      <div className="card1">
        <p>
          <em>How much water do the people of California get?</em> For starters,
          let's focus on the agriculture sector in the north of the delta.
        </p>
        <img
          src="./northdelta.png"
          alt="Map of California with northern delta area highlighted"
        />
      </div>
      <div className="scrollama scrollama-1">
        <div className="tut-graph-wrapper">
          <svg id="tut-bar-graph"></svg>
          <BucketGlyph
            levelInterp={bucketInterper}
            width={300}
            height={height}
            colorInterp={INTERP_COLOR}
          />
        </div>
        <Scrollama offset={0.5} onStepEnter={onStepEnter}>
          <Step data={2} key={2}>
            <div className="tut-text-card">
              This is the average yearly amount of water this group receives,
              specifically from the <b>Central Valley Project</b>, one of two
              water municipalities in California.
            </div>
          </Step>
          <Step data={3} key={3}>
            <div className="tut-text-card">
              Here, it is presented as a bar graph, with the bottom axis
              representing the year and the side axis representing the amount of
              water in thousand acre-feet (TAF).
            </div>
          </Step>
          <Step data={4} key={4}>
            <div className="tut-text-card">
              We'll condense this bar graph into a single bar with a filled
              gradient.
            </div>
          </Step>
          <Step data={5} key={5}>
            <div className="tut-text-card" style={{ marginBottom: "80vh" }}>
              What we get is a bucket of water showing which water levels are
              most likely, with the darker areas being the most likely water
              levels.
            </div>
          </Step>
        </Scrollama>
      </div>
      <div className="scrollama scrollama-2">
        <div className="tut-drop-graphics-wrapper">
          <div className="main-waterdrop">
            <WaterdropGlyph
              levelInterp={dropInterper}
              width={400}
              height={height}
              colorInterp={INTERP_COLOR}
            />
          </div>
          <div className="main-histogram">
            <DotHistogram
              width={210}
              height={140}
              data={
                OBJECTIVES_DATA["DEL_CVP_PAG_N"][SCENARIO_KEY_STRING][
                  serialize(...Object.values(DEFAULT_SCENARIO))
                ][DELIV_KEY_STRING]
              }
              goal={userGoal}
              setGoal={(newGoal) => {
                setUserGoal(newGoal);
              }}
            />
          </div>
          <div className="vardrop drop1">
            <WaterdropGlyph
              levelInterp={variationInterpers[0]}
              width={400}
              height={(height * 2) / 3}
              colorInterp={INTERP_COLOR}
            />
            <p>
              scenario <span className="scen-number">0180</span>
            </p>
            <DotHistogram
              shortForm
              width={210}
              height={140}
              data={VARIATIONS_DELIVS[0]}
              goal={userGoal}
              setGoal={(newGoal) => {
                setUserGoal(newGoal);
              }}
            />
          </div>
          <div className="vardrop drop2">
            <WaterdropGlyph
              levelInterp={variationInterpers[1]}
              width={400}
              height={(height * 2) / 3}
              colorInterp={INTERP_COLOR}
            />
            <p>
              scenario <span className="scen-number">0200</span>
            </p>
            <DotHistogram
              shortForm
              width={210}
              height={140}
              data={VARIATIONS_DELIVS[1]}
              goal={userGoal}
              setGoal={(newGoal) => {
                setUserGoal(newGoal);
              }}
            />
          </div>
          <div className="vardrop drop3">
            <WaterdropGlyph
              levelInterp={variationInterpers[2]}
              width={400}
              height={(height * 2) / 3}
              colorInterp={INTERP_COLOR}
            />
            <p>
              scenario <span className="scen-number">0164</span>
            </p>
            <DotHistogram
              shortForm
              width={210}
              height={140}
              data={VARIATIONS_DELIVS[2]}
              goal={userGoal}
              setGoal={(newGoal) => {
                setUserGoal(newGoal);
              }}
            />
          </div>
          <div className="vardrop drop4">
            <WaterdropGlyph
              levelInterp={variationInterpers[3]}
              width={400}
              height={(height * 2) / 3}
              colorInterp={INTERP_COLOR}
            />
            <p>
              scenario <span className="scen-number">0175</span>
            </p>
            <DotHistogram
              shortForm
              width={210}
              height={140}
              data={VARIATIONS_DELIVS[3]}
              goal={userGoal}
              setGoal={(newGoal) => {
                setUserGoal(newGoal);
              }}
            />
          </div>
        </div>
        <Scrollama offset={0.5} onStepEnter={onStepEnter}>
          <Step data={6} key={6}>
            <div className="tut-text-card">
              Here it is as a drop of water. We see here that the lightest color
              reaches the midpoint of the maximum water possible, meaning that
              there is a chance that this group will receive 600 TAF of water.
            </div>
          </Step>
          <Step data={7} key={7}>
            <div className="tut-text-card">
              The darker colors, however, indicate that it's more likely this
              group will receive less than a quarter of the maximum, or around
              300 TAF. As we'll later see, this is not a lot compared to other
              areas of California.
            </div>
          </Step>
          <Step data={8} key={8}>
            <div className="tut-text-card">
              But what if we could <em>change reality</em>? What if we could
              increase the likelihood of getting as much water as possible by
              changing the way we manage it?
            </div>
          </Step>
          <Step data={9} key={9}>
            <div className="tut-text-card">
              Fortunately, we can explore those possibilities with the help of a
              simulator called
              <b> CalSim</b>.
            </div>
          </Step>
          <Step data={10} key={10}>
            <div className="tut-text-card">
              These variations are called <em>scenarios</em> and are labelled
              with unique numbers.
            </div>
          </Step>
          <Step data={11} key={11}>
            <div className="tut-text-card">
              At a glance, we can easily see that scenario 0180 appears to be
              the best scenario since the darker water levels reach higher than
              those of the other scenarios. To more concretely compare these
              scenarios, however, we'll use a different view.
            </div>
          </Step>
          <Step data={12} key={12}>
            <div className="tut-text-card" style={{ marginBottom: "120vh" }}>
              Try moving the red line to change the minimum demand and see how
              well each of these scenarios meet those demands.
            </div>
          </Step>
        </Scrollama>
      </div>
      <div>
        <div className="tut-text-card">
          What are the ways we can manage California's water, and what are their
          outcomes? Go to the next step to find out!
          <button
            className="fancy-font"
            onClick={() => setState({ state: "WideView" })}
          >
            click to explore!
          </button>
        </div>
      </div>
    </div>
  );
}

function serialize(demand, carryover, priority, regs, minflow) {
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
