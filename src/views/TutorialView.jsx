import React, { useContext, useLayoutEffect } from "react";
import { Scrollama, Step } from "react-scrollama";

import { AppContext } from "AppContext";

import { isState } from "utils/misc-utils";

import BucketGlyph from "bucket-lib/BucketGlyph";
import DotHistogram from "components/DotHistogram";
import WaterdropGlyph from "components/WaterdropGlyph";

import { hideElems } from "utils/render-utils";
import { constants } from "utils/tutorialview-utils";
import { useTutorialState } from "hooks/useTutorialState";
import { useTutorialComparer } from "hooks/useTutorialComparer";
import { useDataStory } from "hooks/useDataStory";

import { descriptionsData } from "data/descriptions-data";

export default function TutorialView() {
  const appCtx = useContext(AppContext);

  const tutorialState = useTutorialState();
  const tutorialComparer = useTutorialComparer();

  const getSlidesInRange = useDataStory({
    ...tutorialState,
    tutorialComparer,
  });

  useLayoutEffect(
    function enterState() {
      if (isState(appCtx.state, "TutorialView")) {
        hideElems(
          ".bucket-wrapper, .vardrop, .var-scen-label, .vardrop .dot-histogram-wrapper, .main-histogram, .tut-comparer-graphics-wrapper"
        );

        tutorialState.setReady(true);
        tutorialComparer.initComparer(appCtx.waterdrops, appCtx.camera);

        return function exitState() {
          appCtx.resetCamera(false);
          hideElems(".tutorial-view");
        };
      }
    },
    [appCtx.state]
  );

  const onStepEnter = async ({ data, direction }) => {
    if (direction === "up") return;
    data.animHandler?.do();
  };

  const onStepExit = async ({ data, direction }) => {
    if (direction === "down") return;
    data.animHandler?.undo();
  };

  if (!isState(appCtx.state, "TutorialView")) return;

  return (
    <div className="tutorial-view">
      <div className="card1">
        <p>
          <em>How much water do the people of California get?</em> Let's focus
          on two groups of people: the agriculture group in the north, and the
          refuge group in the south.
        </p>
        <img
          src="./northdelta.png"
          alt="Map of California with northern delta area highlighted"
        />
        <button
          className="skip-btn"
          onClick={() => appCtx.setState({ state: "WideView" })}
        >
          Skip intro
        </button>
      </div>
      <div className="scrollama scrollama-1">
        <div className="tut-graph-wrapper">
          <div className="tut-graph">
            <svg id="pag-bar-graph"></svg>
            <BucketGlyph
              levelInterp={tutorialState.bucketInterperPAG}
              width={300}
              height={constants.BAR_CHART_HEIGHT}
              colorInterp={constants.INTERP_COLOR}
            />
            <p className="fancy-font objective-label">
              {descriptionsData[constants.DEFAULT_OBJECTIVE].display_name}
            </p>
          </div>
          <div className="tut-graph">
            <svg id="prf-bar-graph"></svg>
            <BucketGlyph
              levelInterp={tutorialState.bucketInterperPRF}
              width={300}
              height={constants.BAR_CHART_HEIGHT}
              colorInterp={constants.INTERP_COLOR}
            />
            <p className="fancy-font objective-label">
              {descriptionsData[constants.COMP_OBJECTIVE].display_name}
            </p>
          </div>
        </div>
        <Scrollama
          offset={0.5}
          onStepEnter={onStepEnter}
          onStepExit={onStepExit}
        >
          {getSlidesInRange("barsAppear", "overallIfWantReliable").map(
            (slide, i) => (
              <Step key={i} data={slide}>
                {slide.script}
              </Step>
            )
          )}
        </Scrollama>
      </div>
      <div className="scrollama scrollama-2">
        <div className="tut-drop-graphics-wrapper">
          <div className="main-waterdrop">
            <WaterdropGlyph
              levelInterp={tutorialState.dropInterper}
              width={400}
              height={constants.BAR_CHART_HEIGHT}
              colorInterp={constants.INTERP_COLOR}
            />
            <p className="var-scen-label">
              scenario <span className="scen-number">{"0000"}</span>
            </p>
            <p className="fancy-font objective-label">
              {descriptionsData[constants.DEFAULT_OBJECTIVE].display_name}
            </p>
          </div>
          <div className="main-histogram">
            <DotHistogram
              width={210}
              height={140}
              data={constants.PAG_DELIVS}
              goal={tutorialState.userGoal}
              setGoal={(newGoal) => {
                tutorialState.setUserGoal(newGoal);
              }}
            />
          </div>
          {constants.DROP_VARIATIONS.map(({ idx, scen, clas, desc }) => (
            <div className={`vardrop ${clas}`} key={idx} desc={desc}>
              <WaterdropGlyph
                levelInterp={tutorialState.variationInterpers[idx]}
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
                data={constants.VARIATIONS_DELIVS[idx]}
                goal={tutorialState.userGoal}
                setGoal={(newGoal) => {
                  tutorialState.setUserGoal(newGoal);
                }}
              />
            </div>
          ))}
        </div>
        <div className="tut-comparer-graphics-wrapper">
          <svg id="comparer-graphics"></svg>
        </div>
        <Scrollama
          offset={0.5}
          onStepEnter={onStepEnter}
          onStepExit={onStepExit}
        >
          {getSlidesInRange("forNowLetsFocus", "letsBringRefuge").map(
            (slide, i) => (
              <Step key={i} data={slide}>
                {slide.script}
              </Step>
            )
          )}
        </Scrollama>
      </div>
      <div>
        <div className="tut-text-card">
          Thus, tradeoffs must often be made when managing California's water
          supply. What are the ways we can manage California's water, and how do
          their outcomes compare? Go to the next step to find out!
          <button
            className="fancy-font"
            onClick={() => appCtx.setState({ state: "WideView" })}
          >
            click to explore!
          </button>
        </div>
      </div>
    </div>
  );
}
