import * as d3 from "d3";
import React, {
  forwardRef,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { Scrollama, Step } from "react-scrollama";

import { AppContext } from "AppContext";

import { isState } from "utils/misc-utils";

import BucketGlyph from "components/BucketGlyph";
import DropletGlyph from "components/DropletGlyph";
import DotHistogram from "components/DotHistogram";

import { hideElems } from "utils/render-utils";
import { constants } from "utils/tutorialview-utils";
import { useDataStory } from "hooks/useDataStory";

import { descriptionsData } from "data/descriptions-tutorial-data";
import { spatialData } from "data/spatial-data";
import { initWaterdrops } from "utils/waterdrop-utils";
import { objectivesData } from "data/objectives-tutorial-data";

const tutorialWaterdrops = initWaterdrops(
  objectivesData,
  descriptionsData,
  "objective"
);

export default function TutorialView() {
  const appCtx = useContext(AppContext);

  const { hookAnimations, getSlidesInRange, storyVars } = useDataStory(
    tutorialWaterdrops,
    appCtx.camera
  );

  useLayoutEffect(
    function enterState() {
      if (isState(appCtx.state, "TutorialView")) {
        hideElems(
          ".bucket-wrapper, .vardrop, .var-scen-label, .vardrop .dot-histogram-wrapper, .main-histogram, .tut-comparer-graphics-wrapper"
        );

        hookAnimations();

        return function exitState() {
          appCtx.resetCamera(false);
          hideElems(".tutorial-view");
        };
      }
    },
    [appCtx.state]
  );

  if (!isState(appCtx.state, "TutorialView")) return;

  return (
    <div className="tutorial-view">
      <div className="tut-hero">
        <h1>
          Watering <br /> the Future
        </h1>
        <MapCalifornia />
        <p>
          Water is limited in California, yet everyone needs it. So how can we
          deal with the agricultural, environmental, urban, and other water
          demands of California?
        </p>
        <p>
          To start off, we'll focus on two groups: the{" "}
          <span id="ag-group">agriculture group in the north</span> and the{" "}
          <span id="ref-group">refuge group in the south.</span>
        </p>
        <p>Scroll through this page to explore!</p>
        <SkipBtn onClick={() => appCtx.setState({ state: "WideView" })} />
      </div>
      <PointGroups />
      <div className="scrollama scrollama-create-buckets">
        <div className="create-buckets-section">
          <h2>From Bar Graphs to Buckets</h2>
          <p>
            This is the average yearly amount of water each group receives,
            specifically from the <b>Central Valley Project</b>, one of two
            water municipalities in California.
          </p>
          <div className="explain-results">
            <p>
              Comparing the two, we see that the maximum water level for the
              agriculture group is more than the refuge group. Additionally, the
              refuge group's water level is more consistent than that of the
              agriculture group, with the most likely water levels hovering at
              around 1/3 maximum capacity.
            </p>
            <p>
              But the agriculture group has some chances of reaching higher than
              the refuge group's most likely water level, judging from the light
              blue levels that are situated above the 1/3 mark.
            </p>
            <p>
              Overall, if we want a reliable supply we would want the refuge
              group's deliveries, but if we want a chance at higher supplies of
              water however with more inconsistent results, we would want the
              agriculture group's deliveries.
            </p>
          </div>
          <CompareBucketCreationsGraphics
            storyVars={storyVars}
            size={appCtx.appHeight * 0.4}
          />
        </div>
        <DataStoryScrollama>
          {getSlidesInRange("barsExplain", "comparingTheTwo").map(
            (slide, i) => (
              <Step key={i} data={slide}>
                <CardBBox>{slide.script}</CardBBox>
              </Step>
            )
          )}
        </DataStoryScrollama>
      </div>
      <div className="scrollama scrollama-compare-scenobjs scenarios-section">
        <CompareScenariosGraphics
          storyVars={storyVars}
          size={appCtx.appHeight * 0.4}
        />
        <CompareBigDroplets />
        <DataStoryScrollama>
          {getSlidesInRange("forNowLetsFocus", "letsBringRefuge").map(
            (slide, i) => (
              <Step key={i} data={slide}>
                <CardBBox>{slide.script}</CardBBox>
              </Step>
            )
          )}
        </DataStoryScrollama>
      </div>
      <CallToExploreCard
        onClick={() => appCtx.setState({ state: "WideView" })}
      />
    </div>
  );
}

const CardBBox = forwardRef(function CardBBox({ children }, ref) {
  return (
    <div ref={ref} className="tut-text-card-wrapper">
      {children}
    </div>
  );
});

function DataStoryScrollama({ children }) {
  const onStepEnter = async ({ data, direction, element }) => {
    if (direction === "up") return;
    data.animHandler?.do();
  };

  const onStepExit = async ({ data, direction, element }) => {
    if (direction === "down") return;
    data.animHandler?.undo();
  };

  const onStepProgress = async ({ data, direction, element, progress }) => {
    const whiteness = d3
      .scaleLinear()
      .domain([0, 0.4, 0.8, 1])
      .range([100, 255, 255, 200])(progress);

    d3.select(element)
      .select("div")
      .style(
        "transform",
        `perspective(800px) rotateX(${d3
          .scaleLinear()
          .domain([0, 0.4, 0.8, 1])
          .range([-90, 0, 0, 90])(progress)}deg) `
      )
      .style(
        "background-color",
        `rgb(${whiteness}, ${whiteness}, ${whiteness}) `
      );
  };

  return (
    <Scrollama
      offset={0.8}
      onStepEnter={onStepEnter}
      onStepExit={onStepExit}
      onStepProgress={onStepProgress}
      threshold={1}
    >
      {children}
    </Scrollama>
  );
}

function MapCalifornia({}) {
  useEffect(function initialize() {
    const height = window.innerHeight,
      width = height * 0.9;

    const drawnRegions = [constants.PAG_OBJECTIVE, constants.PRF_OBJECTIVE];

    const minimap = d3
      .select("#tut-map-california")
      .attr("width", width)
      .attr("height", height);

    const proj = d3
      .geoMercator()
      .scale((3000 * height) / 800)
      .center(spatialData.CALIFORNIA_CENTER)
      .translate([width / 2, height / 2]);

    const lineGeom = [
      ...spatialData.SPATIAL_DATA.features.filter((f) =>
        drawnRegions.includes(f.properties.CalLiteID)
      ),
      spatialData.CALIFORNIA_OUTLINE,
    ];

    minimap
      .selectAll("path")
      .data(lineGeom)
      .join("path")
      .attr("d", (d) => d3.geoPath().projection(proj)(d))
      .attr("class", (d) => "outline " + d.properties.CalLiteID)
      .attr("stroke", (d) => (d.properties.CalLiteID ? "transparent" : "gray"))
      .attr("stroke-width", 1)
      .style("transform-origin", (d) => {
        const [x, y] = proj(d.geometry.coordinates[0][0][0]);

        return `${x}px ${y}px`;
      })
      .attr("fill", "none");

    minimap
      .select(`.${constants.PAG_OBJECTIVE}`)
      .attr("fill", constants.PAG_COLOR);
    minimap
      .select(`.${constants.PRF_OBJECTIVE}`)
      .attr("fill", constants.PRF_COLOR);
  }, []);

  return <svg className="tut-map-california" id="tut-map-california"></svg>;
}

function PointGroups() {
  useEffect(function initialize() {
    const width =
        window.innerWidth * 0.9 /* leave room for scrollbar on the right */,
      height = window.innerHeight;
    const overlaySVG = d3
      .select("#tut-point-groups")
      .attr("width", width)
      .attr("height", height)
      .style("z-index", -1);

    const startPAG = d3
        .select(`.${constants.PAG_OBJECTIVE}`)
        .node()
        .getBoundingClientRect(),
      endPAG = d3.select("#ag-group").node().getBoundingClientRect();
    const startPRF = d3
        .select(`.${constants.PRF_OBJECTIVE}`)
        .node()
        .getBoundingClientRect(),
      endPRF = d3.select("#ref-group").node().getBoundingClientRect();

    const pagLine = [
      [startPAG.x + startPAG.width / 2, startPAG.y + startPAG.height / 2],
      [endPAG.x + endPAG.width / 2, endPAG.y + endPAG.height / 2],
    ];
    const prfLine = [
      [startPRF.x + startPRF.width / 2, startPRF.y + startPRF.height / 2],
      [endPRF.x + endPRF.width / 2, endPRF.y + endPRF.height / 2],
    ];

    const pagPointer = [
      pagLine[0],
      [
        (pagLine[0][0] + pagLine[1][0]) / 2,
        (pagLine[0][1] + pagLine[1][1]) / 2 - height / 10,
      ],
      pagLine[1],
    ];

    const prfPointer = [
      prfLine[0],
      [
        (prfLine[0][0] + prfLine[1][0]) / 2,
        (prfLine[0][1] + prfLine[1][1]) / 2 - height / 10,
      ],
      prfLine[1],
    ];

    overlaySVG
      .append("path")
      .attr(
        "d",
        d3
          .line()
          .x((d) => d[0])
          .y((d) => d[1])
          .curve(d3.curveBasis)(pagPointer)
      )
      .attr("stroke", constants.PAG_COLOR)
      .attr("stroke-dasharray", "5 5")
      .attr("fill", "transparent");

    overlaySVG
      .append("path")
      .attr(
        "d",
        d3
          .line()
          .x((d) => d[0])
          .y((d) => d[1])
          .curve(d3.curveBasis)(prfPointer)
      )
      .attr("stroke", constants.PRF_COLOR)
      .attr("stroke-dasharray", "5 5")
      .attr("fill", "transparent");
  }, []);

  return <svg id="tut-point-groups"></svg>;
}

function SkipBtn({ onClick }) {
  useEffect(function mountFadeOutEffect() {
    const startPos = document.documentElement.scrollTop;
    const buffer = 50;

    window.addEventListener("scroll", function () {
      const curPos = document.documentElement.scrollTop;
      const opac = Math.max(0, 1 - (curPos - startPos) / buffer);

      d3.select(".skip-btn").style("opacity", opac);
    });
  }, []);
  return (
    <button className="skip-btn" onClick={onClick}>
      Skip intro
    </button>
  );
}

function CallToExploreCard({ onClick }) {
  return (
    <div className="cte">
      Thus, tradeoffs must often be made when managing California's water
      supply. What are the ways we can manage California's water, and how do
      their outcomes compare? Go to the next step to find out!
      <button className="fancy-font" onClick={onClick}>
        click to explore!
      </button>
    </div>
  );
}

function CompareBucketCreationsGraphics({ storyVars }) {
  return (
    <div className="tut-graph-wrapper">
      <BucketCreationGraphics
        id={"pag-bar-graph"}
        label={descriptionsData[constants.PAG_OBJECTIVE].display_name}
        bucketInterper={storyVars.bucketInterperPAG}
      />
      <BucketCreationGraphics
        id={"prf-bar-graph"}
        label={descriptionsData[constants.PRF_OBJECTIVE].display_name}
        bucketInterper={storyVars.bucketInterperPRF}
      />
    </div>
  );
}

function CompareScenariosGraphics({ storyVars, size }) {
  return (
    <div className="tut-drop-graphics-wrapper">
      <h2>Seeing Scenarios</h2>
      <div className="waterdrop-graphics-wrapper">
        <div className="waterdrop-explain-pag">
          <p>
            For now, let's focus on the agriculture group. Here it is as a drop
            of water. We see here that the lightest color reaches approximately
            the midpoint of the maximum capacity, meaning that there is a chance
            600 TAF of water will be delivered to this group.
          </p>
          <p>
            The darker colors, however, indicate that it's more likely that
            slightly less than 600 TAF of water will be delivered — around 500
            TAF. As we'll later see, this is not a lot compared to other areas
            of California.
          </p>
        </div>
        <MainWaterdropGraphics
          objectiveLabel={
            descriptionsData[constants.PAG_OBJECTIVE].display_name
          }
          dropInterper={storyVars.dropInterper}
          histData={constants.PAG_DELIVS}
          histRange={[0, objectivesData.MIN_MAXES[constants.PAG_OBJECTIVE][1]]}
          goal={storyVars.userGoal}
          setGoal={(newGoal) => {
            storyVars.setUserGoal(newGoal);
          }}
          size={size}
        />
        <VariationWaterdropGraphics
          variations={constants.DROP_VARIATIONS.map((variation) => ({
            ...variation,
            interper: storyVars.variationInterpers[variation.idx],
            histData: constants.VARIATIONS_DELIVS[variation.idx],
          }))}
          goal={storyVars.userGoal}
          setGoal={(newGoal) => {
            storyVars.setUserGoal(newGoal);
          }}
          histRange={[0, objectivesData.MIN_MAXES[constants.PAG_OBJECTIVE][1]]}
          size={size}
        />
      </div>
    </div>
  );
}

function CompareBigDroplets() {
  return (
    <div className="tut-comparer-graphics-wrapper">
      <p className="bigdrop-describe">
        These are all possible scenarios sorted bottom-to-top by decreasing
        average deliveries.
      </p>
      <p className="bigdrop-explain">
        Let's bring back the refuge group. The scenarios that benefit the
        agriculture group do not always benefit the refuge group, and vice
        versa. Hover over the waterdrops to see how the same scenarios place for
        each objective. (Can you find a scenario that benefits both?)
      </p>
      <svg id="comparer-graphics"></svg>
    </div>
  );
}

function MainWaterdropGraphics({
  objectiveLabel,
  dropInterper,
  histData,
  histRange,
  goal,
  setGoal,
  size,
}) {
  return (
    <>
      <div className="main-waterdrop">
        <DropletGlyph
          levelInterp={dropInterper}
          width={size}
          height={size}
          resolution={4}
        />
        <p className="var-scen-label">
          scenario <span className="scen-number">{"0000"}</span>
        </p>
        <p className="fancy-font objective-label">{objectiveLabel}</p>
        <p className="volume-not-height">
          Water supply represented by volume of water inside droplet, not height
          of water level
        </p>
      </div>
      <div className="main-histogram">
        <DotHistogram
          width={size}
          height={(size * 2) / 3}
          data={histData}
          range={histRange}
          goal={goal}
          setGoal={setGoal}
        />
      </div>
    </>
  );
}

function VariationWaterdropGraphics({
  variations,
  goal,
  setGoal,
  histRange,
  size,
}) {
  return variations.map(({ idx, scen, clas, desc, interper, histData }) => (
    <div className={`vardrop ${clas}`} key={idx} desc={desc}>
      <DropletGlyph
        levelInterp={interper}
        width={size * 0.7}
        height={size * 0.7}
        resolution={4}
      />
      <p className="var-scen-label">
        scenario <span className="scen-number">{scen}</span>
      </p>
      <DotHistogram
        shortForm
        width={size}
        height={(size * 2) / 3}
        data={histData}
        range={histRange}
        goal={goal}
        setGoal={setGoal}
      />
    </div>
  ));
}

function BucketCreationGraphics({ id, bucketInterper, label }) {
  return (
    <div className="tut-graph">
      <svg id={id}></svg>
      <BucketGlyph
        levelInterp={bucketInterper}
        width={300}
        height={constants.BAR_CHART_HEIGHT}
        resolution={4}
      />
      <p className="fancy-font objective-label">{label}</p>
    </div>
  );
}
