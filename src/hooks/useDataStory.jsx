import { useCallback, useState } from "react";

import { useCompareLargeDrops } from "hooks/useCompareLargeDrops";
import { useDataStoryVars } from "hooks/useDataStoryVars";
import { animations as anims } from "utils/data-story-anims";
import { scripts } from "utils/story-scripts";

export function useDataStory(waterdrops, camera) {
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

  const storyVars = useDataStoryVars();
  const largeDropComparer = useCompareLargeDrops();

  const hookAnimations = useCallback(
    function () {
      largeDropComparer.initComparer(waterdrops, camera);
      const context = {
        deps: {
          ...storyVars,
          largeDropComparer,
        },
      };

      const showLocationAnimGroup = anims.initShowLocationAnimGroup(context);
      const chartAnimGroup = anims.initChartAnimGroup(context);
      const bucketsFillAnim = anims.initBucketsFillAnim(context);
      const moveBucketsAnim = anims.initMoveBucketsAnim(context);
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
          // no anims
        },
        {
          name: "norCal",
          animHandler: showLocationAnimGroup.showPAG,
        },
        {
          name: "soCal",
          animHandler: showLocationAnimGroup.showPRF,
        },
        {
          name: "barsExplain",
          animHandler: chartAnimGroup.barsAppear,
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
          animHandler: moveBucketsAnim,
        },
        {
          name: "forNowLetsFocus",
          animHandler: dropFillAnim,
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
          name: "soWhyNot",
          animHandler: comparerAnimGroup.showPAG,
        },
        {
          name: "letsBringRefuge",
          animHandler: comparerAnimGroup.showPRF,
        },
      ];

      setSlides(_slides.map((s, i) => ({ ...s, idx: i })));
    },
    [waterdrops, camera]
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
    hookAnimations,
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
