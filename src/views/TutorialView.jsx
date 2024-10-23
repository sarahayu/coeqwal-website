import * as d3 from "d3";
import React, { useContext, useEffect, useLayoutEffect, useRef } from "react";
import { Scrollama, Step } from "react-scrollama";

import { AppContext } from "AppContext";

import { isState } from "utils/misc-utils";

import BucketGlyph from "components/BucketGlyph";
import DropletGlyph from "components/DropletGlyph";
import DotHistogram from "components/DotHistogram";

import { hideElems } from "utils/render-utils";
import { constants } from "utils/tutorialview-utils";
import { useDataStory } from "hooks/useDataStory";

import { descriptionsData } from "data/descriptions-data";
import { spatialData } from "data/spatial-data";

export default function TutorialView() {
  const appCtx = useContext(AppContext);

  const { hookAnimations, getSlidesInRange, storyVars } = useDataStory(appCtx);

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
      <div className="scrollama scrollama-locations">
        <Minimap />
        <SkipBtn onClick={() => appCtx.setState({ state: "WideView" })} />
        <DataStoryScrollama>
          {getSlidesInRange("howMuchIntro", "soCal").map((slide, i) => (
            <Step key={i} data={slide}>
              {slide.script}
            </Step>
          ))}
        </DataStoryScrollama>
      </div>
      <div className="scrollama scrollama-create-buckets">
        <CompareBucketCreationsGraphics storyVars={storyVars} />
        <DataStoryScrollama>
          {getSlidesInRange("barsAppear", "overallIfWantReliable").map(
            (slide, i) => (
              <Step key={i} data={slide}>
                {slide.script}
              </Step>
            )
          )}
        </DataStoryScrollama>
      </div>
      <div className="scrollama scrollama-compare-scenobjs">
        <CompareScenariosGraphics storyVars={storyVars} />
        <CompareBigDroplets />
        <DataStoryScrollama>
          {getSlidesInRange("forNowLetsFocus", "letsBringRefuge").map(
            (slide, i) => (
              <Step key={i} data={slide}>
                {slide.script}
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

function DataStoryScrollama({ children }) {
  const onStepEnter = async ({ data, direction, element }) => {
    if (direction === "up") return;
    data.animHandler?.do();
    d3.select(element).transition().style("opacity", 1);
  };

  const onStepExit = async ({ data, direction, element }) => {
    if (direction === "down") return;
    data.animHandler?.undo();
    d3.select(element).transition().style("opacity", 0.2);
  };

  return (
    <Scrollama offset={0.8} onStepEnter={onStepEnter} onStepExit={onStepExit}>
      {children}
    </Scrollama>
  );
}

function Minimap({}) {
  useEffect(function initialize() {
    const width = 400,
      height = 500;

    const drawnRegions = [constants.PAG_OBJECTIVE, constants.PRF_OBJECTIVE];

    const minimap = d3
      .select("#tut-minimap")
      .attr("width", width)
      .attr("height", height);

    const proj = d3
      .geoMercator()
      .scale(2000)
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
      .attr("fill", "transparent");
  }, []);

  return <svg className="tut-minimap" id="tut-minimap"></svg>;
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
    <div className="tut-text-card cte">
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
        label={descriptionsData[constants.PAG_OBJECTIVE]?.display_name}
        bucketInterper={storyVars.bucketInterperPAG}
      />
      <BucketCreationGraphics
        id={"prf-bar-graph"}
        label={descriptionsData[constants.PRF_OBJECTIVE]?.display_name}
        bucketInterper={storyVars.bucketInterperPRF}
      />
    </div>
  );
}

function CompareScenariosGraphics({ storyVars }) {
  return (
    <div className="tut-drop-graphics-wrapper">
      <MainWaterdropGraphics
        objectiveLabel={descriptionsData[constants.PAG_OBJECTIVE]?.display_name}
        dropInterper={storyVars.dropInterper}
        histData={constants.PAG_DELIVS}
        goal={storyVars.userGoal}
        setGoal={(newGoal) => {
          storyVars.setUserGoal(newGoal);
        }}
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
      />
    </div>
  );
}

function CompareBigDroplets() {
  return (
    <div className="tut-comparer-graphics-wrapper">
      <svg id="comparer-graphics"></svg>
    </div>
  );
}

function MainWaterdropGraphics({
  objectiveLabel,
  dropInterper,
  histData,
  goal,
  setGoal,
}) {
  return (
    <>
      <div className="main-waterdrop">
        <DropletGlyph
          levelInterp={dropInterper}
          width={400}
          height={constants.BAR_CHART_HEIGHT}
          colorInterp={constants.INTERP_COLOR}
          resolution={4}
        />
        <p className="var-scen-label">
          scenario <span className="scen-number">{"0000"}</span>
        </p>
        <p className="fancy-font objective-label">{objectiveLabel}</p>
      </div>
      <div className="main-histogram">
        <DotHistogram
          width={210}
          height={140}
          data={histData}
          goal={goal}
          setGoal={setGoal}
        />
      </div>
    </>
  );
}

function VariationWaterdropGraphics({ variations, goal, setGoal }) {
  return variations.map(({ idx, scen, clas, desc, interper, histData }) => (
    <div className={`vardrop ${clas}`} key={idx} desc={desc}>
      <DropletGlyph
        levelInterp={interper}
        width={400}
        height={(constants.BAR_CHART_HEIGHT * 2) / 3}
        colorInterp={constants.INTERP_COLOR}
        resolution={4}
      />
      <p className="var-scen-label">
        scenario <span className="scen-number">{scen}</span>
      </p>
      <DotHistogram
        shortForm
        width={210}
        height={140}
        data={histData}
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
        colorInterp={constants.INTERP_COLOR}
        resolution={4}
      />
      <p className="fancy-font objective-label">{label}</p>
    </div>
  );
}
