import React, { useContext, useLayoutEffect } from "react";
import { Scrollama, Step } from "react-scrollama";

import { AppContext } from "AppContext";

import { isState } from "utils/misc-utils";

import BucketGlyph from "bucket-lib/BucketGlyph";
import DotHistogram from "components/DotHistogram";
import WaterdropGlyph from "components/WaterdropGlyph";

import { hideElems } from "utils/render-utils";
import { constants } from "utils/tutorialview-utils";
import { useDataStory } from "hooks/useDataStory";

import { descriptionsData } from "data/descriptions-data";

export default function TutorialView() {
  const appCtx = useContext(AppContext);

  const { signalDOMReady, getSlidesInRange, storyVars } = useDataStory(appCtx);

  useLayoutEffect(
    function enterState() {
      if (isState(appCtx.state, "TutorialView")) {
        hideElems(
          ".bucket-wrapper, .vardrop, .var-scen-label, .vardrop .dot-histogram-wrapper, .main-histogram, .tut-comparer-graphics-wrapper"
        );

        signalDOMReady();

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
        <img
          src="./northdelta.png"
          alt="Map of California with northern delta area highlighted"
        />
        <DataStoryScrollama>
          {getSlidesInRange("howMuchIntro", "soCal").map((slide, i) => (
            <Step key={i} data={slide}>
              {slide.script}
              {i === 0 && (
                <button
                  className="skip-btn"
                  onClick={() => appCtx.setState({ state: "WideView" })}
                >
                  Skip intro
                </button>
              )}
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
        <OtherBigDroplet />
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
  const onStepEnter = async ({ data, direction }) => {
    if (direction === "up") return;
    data.animHandler?.do();
  };

  const onStepExit = async ({ data, direction }) => {
    if (direction === "down") return;
    data.animHandler?.undo();
  };

  return (
    <Scrollama offset={0.5} onStepEnter={onStepEnter} onStepExit={onStepExit}>
      {children}
    </Scrollama>
  );
}

function CallToExploreCard({ onClick }) {
  return (
    <div className="tut-text-card">
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

function OtherBigDroplet() {
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
        <WaterdropGlyph
          levelInterp={dropInterper}
          width={400}
          height={constants.BAR_CHART_HEIGHT}
          colorInterp={constants.INTERP_COLOR}
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
      <WaterdropGlyph
        levelInterp={interper}
        width={400}
        height={(constants.BAR_CHART_HEIGHT * 2) / 3}
        colorInterp={constants.INTERP_COLOR}
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
      />
      <p className="fancy-font objective-label">{label}</p>
    </div>
  );
}
