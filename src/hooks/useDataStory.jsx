import { useCallback, useEffect, useRef, useState } from "react";
import { scripts } from "utils/story-scripts";
import { animations as anims } from "./data-story-anims";

export function useDataStory(deps) {
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

  useEffect(
    function initialize() {
      if (!deps.ready) return;

      const context = { deps };

      const chartAnimGroup = anims.initChartAnimGroup(context);
      const bucketsFillAnim = anims.initBucketsFillAnim(context);
      const dropFillAnim = anims.initDropFillAnim(context);
      const changeRealityAnim = anims.initChangeRealityAnim(context);
      const fillVarDropsAnim = anims.initFillVarDropsAnim(context);
      const highlightBestAnim = anims.initHighlightBestAnim(context);
      const showQuantilesAnim = anims.initShowQuantilesAnim(context);
      const comparerAnimGroup = anims.initComparerAnimGroup(context);

      const _slides = [
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
          // no anims
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
    [deps.ready]
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

  return getFromTo;
}

function attachScripts(slides) {
  return slides.map((slide) => ({
    ...slide,
    script: scripts[slide.name],
  }));
}
