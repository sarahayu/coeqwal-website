import { useCallback, useEffect, useRef, useState } from "react";
import { scripts } from "utils/story-scripts";
import { useDataStoryVars } from "hooks/useDataStoryVars";
import { useCompareLargeDrops } from "hooks/useCompareLargeDrops";
import { animations as anims } from "./data-story-anims";

export function useDataStory(appCtx) {
  /*
    slides = [
        name: string,
        animHandler: {
            do: someFunctionToDoAnimation,
            undo: someFunctionToReverseAnimation,
        }
    ]
     */
  const [slides, setSlides] = useState([]);
  const [domReady, setDomReady] = useState(false);

  const signalDOMReady = useCallback(function () {
    setDomReady(true);
  });

  const storyVars = useDataStoryVars();
  const largeDropComparer = useCompareLargeDrops();

  useEffect(
    function initialize() {
      if (!domReady) return;

      largeDropComparer.initComparer(appCtx.waterdrops, appCtx.camera);
      const context = {
        deps: {
          ...storyVars,
          largeDropComparer,
        },
      };

      const chartAnimGroup = anims.initChartAnimGroup(context);
      const bucketsFillAnim = anims.initBucketsFillAnim(context);
      const dropFillAnim = anims.initDropFillAnim(context);
      const changeRealityAnim = anims.initChangeRealityAnim(context);
      const fillVarDropsAnim = anims.initFillVarDropsAnim(context);
      const showScenLabelAnim = anims.initShowScenLabelAnim(context);
      const highlightBestAnim = anims.initHighlightBestAnim(context);
      const showQuantilesAnim = anims.initShowQuantilesAnim(context);
      const comparerAnimGroup = anims.initComparerAnimGroup(context);

      const _slides = [
        {
          name: "howMuchIntro",
          // animHandler: chartAnimGroup.barsAppear,
        },
        {
          name: "norCal",
          // animHandler: chartAnimGroup.barsAppear,
        },
        {
          name: "soCal",
          // animHandler: chartAnimGroup.barsAppear,
        },
        {
          name: "barsAppear",
          animHandler: chartAnimGroup.barsAppear,
        },
        {
          name: "barsExplain",
          // no anims
        },
        {
          name: "barsCondense",
          animHandler: chartAnimGroup.barsCondense,
        },
        {
          name: "bucketsFill",
          animHandler: bucketsFillAnim,
        },
        {
          name: "comparingTheTwo",
          // no anims
        },
        {
          name: "butTheAgGroup",
          // no anims
        },
        {
          name: "overallIfWantReliable",
          // no anims
        },
        {
          name: "forNowLetsFocus",
          animHandler: dropFillAnim,
        },
        {
          name: "darkerColsIndic",
          // no anims
        },
        {
          name: "ifChangeReality",
          animHandler: changeRealityAnim,
        },
        {
          name: "fortunateCanExplore",
          animHandler: fillVarDropsAnim,
        },
        {
          name: "theseVarsCalled",
          animHandler: showScenLabelAnim,
        },
        {
          name: "atAGlance",
          animHandler: highlightBestAnim,
        },
        {
          name: "tryMoveRed",
          animHandler: showQuantilesAnim,
        },
        {
          name: "collectAllScen",
          animHandler: comparerAnimGroup.showPAG,
        },
        {
          name: "soWhyNot",
          // no anims
        },
        {
          name: "letsBringRefuge",
          animHandler: comparerAnimGroup.showPRF,
        },
      ];

      setSlides(_slides);
    },
    [domReady]
  );

  const getFromTo = useCallback(
    function (from, to) {
      let idxFrom, idxTo;

      for (let i = 0; i < slides.length; i++) {
        if (slides[i].name === from) idxFrom = i;
        else if (slides[i].name === to) {
          idxTo = i;
          break;
        }
      }

      return attachScripts(slides.slice(idxFrom, idxTo + 1));
    },
    [slides]
  );

  return {
    signalDOMReady,
    getSlidesInRange: getFromTo,
    storyVars,
  };
}

function attachScripts(slides) {
  return slides.map((slide) => ({
    ...slide,
    script: scripts[slide.name],
  }));
}
