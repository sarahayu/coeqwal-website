import * as d3 from "d3";
import { useState } from "react";
import { constants } from "utils/tutorialview-utils";

export function useTutorialState() {
  const [userGoal, setUserGoal] = useState(200);
  const [ready, setReady] = useState(false);
  const [bucketInterperPAG, setBucketInterperPAG] = useState(() =>
    d3.scaleLinear().range([0, 0])
  );
  const [bucketInterperPRF, setBucketInterperPRF] = useState(() =>
    d3.scaleLinear().range([0, 0])
  );
  const [dropInterper, setDropInterper] = useState(() =>
    d3.scaleLinear().range([0, 0])
  );
  const [variationInterpers, setVariationInterpers] = useState(() =>
    constants.VARIATIONS.map(() => d3.scaleLinear().range([0, 0]))
  );

  return {
    userGoal,
    setUserGoal,
    ready,
    setReady,
    bucketInterperPAG,
    setBucketInterperPAG,
    bucketInterperPRF,
    setBucketInterperPRF,
    dropInterper,
    setDropInterper,
    variationInterpers,
    setVariationInterpers,
  };
}
