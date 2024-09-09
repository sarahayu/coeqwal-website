import * as d3 from "d3";
import { useState } from "react";
import { constants } from "utils/tutorialview-utils";

export function useDataStoryVars() {
  const [userGoal, setUserGoal] = useState(200);
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
