import { useContext, useLayoutEffect } from "react";
import { Step } from "react-scrollama";

import { AppContext } from "AppContext";

import { isState } from "utils/misc-utils";
import { useDataStory } from "hooks/useDataStory";
import { hideElems } from "utils/render-utils";

import { CallToExploreSection } from "components/CallToExploreSection";
import { CardBBox } from "components/CardBBox";
import { CompareBigDroplets } from "components/CompareBigDroplets";
import { CompareBucketCreationsBackground } from "components/CompareBucketCreationsBackground";
import { CompareScenariosGraphics } from "components/CompareScenariosGraphics";
import { DataStoryScrollama } from "components/DataStoryScrollama";
import { PointGroups } from "components/PointGroups";
import { TutHero } from "components/TutHero";
import { descriptionsData } from "data/descriptions-tutorial-data";
import { objectivesData } from "data/objectives-tutorial-data";
import { initWaterdrops } from "utils/waterdrop-utils";

const tutorialWaterdrops = initWaterdrops(
  objectivesData,
  descriptionsData,
  "objective"
);

export default function TutorialView() {
  const appCtx = useContext(AppContext);

  const { hookAnimations, getSlidesInRange, storyVars, index, setIndex } =
    useDataStory(tutorialWaterdrops, appCtx.camera);

  useLayoutEffect(
    function enterState() {
      if (isState(appCtx.state, "TutorialView")) {
        hideElems(
          ".tut-graph .bottle-wrapper, .vardrop, .var-scen-label, .vardrop .dot-histogram-wrapper, .main-histogram, .tut-comparer-graphics-wrapper"
        );

        hookAnimations();

        setIndex(-1);

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
      <button
        className="scrollama-next"
        onClick={() => {
          let elem = document.getElementById(`card-${index + 1}`);

          if (!elem) elem = document.getElementById("cte");

          elem.scrollIntoView({ behavior: "smooth" });
        }}
      >
        Click Here or Scroll to Continue
      </button>
      <TutHero appCtx={appCtx} />
      <div className="scrollama scrollama-create-buckets">
        <CompareBucketCreationsBackground
          appCtx={appCtx}
          storyVars={storyVars}
        />
        <DataStoryScrollama setCurrentIndex={setIndex}>
          {getSlidesInRange("barsExplain", "comparingTheTwo").map(
            (slide, i) => (
              <Step key={i} data={slide}>
                <CardBBox id={`card-${slide.idx}`}>{slide.script}</CardBBox>
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
        <DataStoryScrollama setCurrentIndex={setIndex}>
          {getSlidesInRange("forNowLetsFocus", "letsBringRefuge").map(
            (slide, i) => (
              <Step key={i} data={slide}>
                <CardBBox id={`card-${slide.idx}`}>{slide.script}</CardBBox>
              </Step>
            )
          )}
        </DataStoryScrollama>
      </div>
      <CallToExploreSection
        onClick={() => appCtx.setState({ state: "WideView" })}
      />
    </div>
  );
}
