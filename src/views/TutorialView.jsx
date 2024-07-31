import * as d3 from "d3";
import React, {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { Scrollama, Step } from "react-scrollama";

import { AppContext } from "AppContext";

import { isState } from "utils/misc-utils";

import BucketGlyph from "bucket-lib/BucketGlyph";
import DotHistogram from "components/DotHistogram";
import WaterdropGlyph from "components/WaterdropGlyph";
import { hideElems, showElems } from "utils/render-utils";
import {
  BAR_CHART_HEIGHT,
  DEFAULT_DELIVS,
  DEFAULT_INTERPER,
  INTERP_COLOR,
  VARIATIONS_DELIVS,
  VARIATIONS_INTERPERS,
  useTutorialGraph,
  useTutorialState,
  useTutorialComparer,
  DROP_VARIATIONS,
} from "utils/tutorialview-utils";

export default function TutorialView() {
  const { state, setState, waterdrops, camera } = useContext(AppContext);

  const {
    userGoal,
    setUserGoal,
    bucketInterper,
    setBucketInterper,
    dropInterper,
    setDropInterper,
    variationInterpers,
    setVariationInterpers,
  } = useTutorialState();

  const { initGraphArea, initBars, condenseBars } = useTutorialGraph();
  const { initComparer, introDrop2 } = useTutorialComparer();

  const maxSlideReachedRef = useRef(-1);

  useLayoutEffect(
    function enterState() {
      if (isState(state, "TutorialView")) {
        hideElems(
          ".bucket-wrapper, .vardrop, .vardroplabel, .vardrop .dot-histogram-wrapper, .main-histogram, .tut-comparer-graphics-wrapper"
        );

        initGraphArea();
        initComparer(waterdrops, camera);

        return function exitState() {
          hideElems(".tutorial-view");
        };
      }
    },
    [state]
  );

  const actions = useMemo(
    () => ({
      2: () => {
        initBars();
      },

      4: () => {
        condenseBars();
      },

      5: () => {
        d3.select(".bucket-wrapper").style("display", "initial");
        d3.select("#tut-bar-graph").attr("opacity", 0);

        setBucketInterper(() => DEFAULT_INTERPER);
      },

      6: () => {
        setDropInterper(() => DEFAULT_INTERPER);
      },

      8: () => {
        d3.selectAll(".vardrop")
          .style("display", "initial")
          .classed("hasarrow", true);
      },

      9: () => {
        d3.selectAll(".vardrop path").style("stroke-dasharray", "none");
        setVariationInterpers(VARIATIONS_INTERPERS);
      },

      10: () => {
        d3.selectAll(".vardroplabel").style("display", "block");
      },

      11: () => {
        d3.select(".drop1").classed("highlighted", true);
      },

      12: () => {
        d3.select(".drop1").classed("highlighted", false);
        d3.selectAll(".vardrop").classed("hasarrow", false);

        d3.selectAll(".vardroplabel").style("opacity", "0.5");
        d3.selectAll(".vardroplabel, .scen-number").style("color", "gray");

        d3.select(".main-waterdrop")
          .transition()
          .style("transform", "translateY(-100px) scale(0.5)");
        d3.selectAll(".drop1 .waterdrop-wrapper, .drop3 .waterdrop-wrapper")
          .transition()
          .style("transform", "translate(-50px, 15px) scale(0.5)");
        d3.selectAll(".drop2 .waterdrop-wrapper, .drop4 .waterdrop-wrapper")
          .transition()
          .style("transform", "translate(50px, 15px) scale(0.5)");

        d3.select(".main-histogram").style("display", "initial");
        d3.selectAll(".vardrop .dot-histogram-wrapper").style(
          "display",
          "initial"
        );
      },

      13: () => {
        hideElems(".scrollama-2 .tut-drop-graphics-wrapper");
        showElems(".scrollama-2 .tut-comparer-graphics-wrapper");
      },

      15: () => {
        introDrop2();
      },
    }),
    []
  );

  const onStepEnter = async ({ data, direction }) => {
    if (direction === "up") return;

    if (data > maxSlideReachedRef.current) {
      maxSlideReachedRef.current = data;
      if (actions[data]) actions[data]();
    }
  };

  if (!isState(state, "TutorialView")) return;

  return (
    <div className="tutorial-view">
      <div className="card1">
        <p>
          <em>How much water do the people of California get?</em> For starters,
          let's focus on the agriculture sector north of the delta.
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
            height={BAR_CHART_HEIGHT}
            colorInterp={INTERP_COLOR}
          />
        </div>
        <Scrollama offset={0.5} onStepEnter={onStepEnter}>
          <Step data={2}>
            <div className="tut-text-card">
              This is the average yearly amount of water this group receives,
              specifically from the <b>Central Valley Project</b>, one of two
              water municipalities in California.
            </div>
          </Step>
          <Step data={3}>
            <div className="tut-text-card">
              Here, it is presented as a bar graph, with the bottom axis
              representing the year and the side axis representing the amount of
              water delivered in thousand acre-feet (TAF).
            </div>
          </Step>
          <Step data={4}>
            <div className="tut-text-card">
              We'll condense this bar graph into a single bar with a filled
              gradient.
            </div>
          </Step>
          <Step data={5}>
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
              height={BAR_CHART_HEIGHT}
              colorInterp={INTERP_COLOR}
            />
          </div>
          <div className="main-histogram">
            <DotHistogram
              width={210}
              height={140}
              data={DEFAULT_DELIVS}
              goal={userGoal}
              setGoal={(newGoal) => {
                setUserGoal(newGoal);
              }}
            />
          </div>
          {DROP_VARIATIONS.map(({ idx, scen, clas, desc }) => (
            <div className={`vardrop ${clas}`} key={idx} desc={desc}>
              <WaterdropGlyph
                levelInterp={variationInterpers[idx]}
                width={400}
                height={(BAR_CHART_HEIGHT * 2) / 3}
                colorInterp={INTERP_COLOR}
              />
              <p className="vardroplabel">
                scenario <span className="scen-number">{scen}</span>
              </p>
              <DotHistogram
                shortForm
                width={210}
                height={140}
                data={VARIATIONS_DELIVS[idx]}
                goal={userGoal}
                setGoal={(newGoal) => {
                  setUserGoal(newGoal);
                }}
              />
            </div>
          ))}
        </div>
        <div className="tut-comparer-graphics-wrapper">
          <svg id="comparer-graphics"></svg>
        </div>
        <Scrollama offset={0.5} onStepEnter={onStepEnter}>
          <Step data={6}>
            <div className="tut-text-card">
              Here it is as a drop of water. We see here that the lightest color
              reaches the midpoint of the maximum water possible, meaning that
              there is a chance 600 TAF of water will be delivered to this
              group.
            </div>
          </Step>
          <Step data={7}>
            <div className="tut-text-card">
              The darker colors, however, indicate that it's more likely that
              less than a quarter of the maximum, or around 300 TAF, will be
              delivered. As we'll later see, this is not a lot compared to other
              areas of California.
            </div>
          </Step>
          <Step data={8}>
            <div className="tut-text-card">
              But what if we could <em>change reality</em>? What if we could
              increase the likelihood of delivering as much water as possible by
              changing the way we manage it?
            </div>
          </Step>
          <Step data={9}>
            <div className="tut-text-card">
              Fortunately, we can explore those possibilities with the help of a
              simulator called
              <b> CalSim</b>.
            </div>
          </Step>
          <Step data={10}>
            <div className="tut-text-card">
              These variations are called <em>scenarios</em> and are labelled
              with unique numbers.
            </div>
          </Step>
          <Step data={11}>
            <div className="tut-text-card">
              At a glance, we can easily see that scenario 0180 appears to be
              the best scenario since the darker water levels reach higher than
              those of the other scenarios. To more concretely compare these
              scenarios, however, we'll use a different view.
            </div>
          </Step>
          <Step data={12}>
            <div className="tut-text-card" style={{ marginBottom: "120vh" }}>
              Try moving the red line to change the minimum demand and see how
              well each of these scenarios meet those demands.
            </div>
          </Step>
          <Step data={13}>
            <div className="tut-text-card">
              We'll collect all the possible scenarios and sort them by their
              average deliveries.
            </div>
          </Step>
          <Step data={14}>
            <div className="tut-text-card">
              So why don't we just choose the best scenario? Well, it's because
              it's not just this group that wants water. Other groups, which we
              call <em>objectives</em>, want scenarios that best fit{" "}
              <em>them.</em>
            </div>
          </Step>
          <Step data={15}>
            <div className="tut-text-card" style={{ marginBottom: "120vh" }}>
              For example, the refuge group south of the delta. The scenarios
              that benefit the agriculture group do not always benefit the
              refuge group, and vice versa. Hover over the waterdrops to see how
              the same scenarios place for each objective. (Can you find a
              scenario that benefits both?)
            </div>
          </Step>
        </Scrollama>
      </div>
      <div>
        <div className="tut-text-card">
          Thus, tradeoffs must often be made when managing California's water
          supply. What are the ways we can manage California's water, and how do
          their outcomes compare? Go to the next step to find out!
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
