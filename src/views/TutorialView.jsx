import { useContext, useLayoutEffect, useState } from "react";
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
import { BiSkipPrevious } from "react-icons/bi";

const tutorialWaterdrops = initWaterdrops(objectivesData, descriptionsData);

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

  const [hasEnteredCTE, setHasEnteredCTE] = useState(false);

  if (!isState(appCtx.state, "TutorialView")) return;

  return (
    <div className="tutorial-view">
      <div className="tutorial-btns">
        {index !== -1 && (
          <button
            className="scrollama-prev"
            title="go to previous slide"
            onClick={() => {
              if (hasEnteredCTE) {
                document
                  .getElementById(`card-${index}`)
                  .scrollIntoView({ behavior: "smooth" });
              } else {
                let elem = document.getElementById(`card-${index - 1}`);

                if (!elem) {
                  elem = document.getElementById("tut-hero");
                }

                elem.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            <BiSkipPrevious />
          </button>
        )}
        {!hasEnteredCTE && (
          <button
            className="scrollama-next"
            onClick={() => {
              let elem = document.getElementById(`card-${index + 1}`);

              if (!elem) {
                elem = document.getElementById("cte");
              }

              elem.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Click Here or Scroll to Continue
          </button>
        )}
      </div>
      <TutHero appCtx={appCtx} />
      <div className="scrollama scrollama-create-buckets">
        <CompareBucketCreationsBackground
          appCtx={appCtx}
          storyVars={storyVars}
        />
        <DataStoryScrollama
          onSlideEnter={({ data }) => {
            setIndex(data.idx);
          }}
          onSlideExit={({ data, direction }) => {
            if (direction === "up") setIndex(data.idx - 1);
            else if (!document.getElementById(`card-${index + 1}`))
              setHasEnteredCTE(true);
          }}
        >
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
        <DataStoryScrollama
          onSlideEnter={({ data }) => {
            setHasEnteredCTE(false);
            setIndex(data.idx);
          }}
          onSlideExit={({ data, direction }) => {
            if (direction === "up") setIndex(data.idx - 1);
            else if (!document.getElementById(`card-${index + 1}`))
              setHasEnteredCTE(true);
          }}
        >
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
