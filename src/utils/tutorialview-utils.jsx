import * as d3 from "d3";

import { ticksExact, levelToDropletLevel } from "bucket-lib/utils";

import { objectivesData } from "data/objectives-tutorial-data";

function initConstants() {
  const BAR_CHART_WIDTH = 500,
    BAR_CHART_HEIGHT = 400;

  const INTERP_COLOR = d3.interpolateRgbBasis([
    "#F2F5FB",
    "#D0DDEB",
    "#7B9BC0",
    "#4F739F",
    "#112A57",
  ]);

  const PAG_OBJECTIVE = "DEL_CVP_PAG_N";
  const PRF_OBJECTIVE = "DEL_CVP_PRF_S";

  const PAG_COLOR = "#808C54";
  const PRF_COLOR = "#60A4BF";

  const DEFAULT_SCENARIO = "expl0000";

  const PAG_DELIVS =
    objectivesData.OBJECTIVES_DATA[PAG_OBJECTIVE][
      objectivesData.SCENARIO_KEY_STRING
    ][DEFAULT_SCENARIO][objectivesData.DELIV_KEY_STRING];
  const PRF_DELIVS =
    objectivesData.OBJECTIVES_DATA[PRF_OBJECTIVE][
      objectivesData.SCENARIO_KEY_STRING
    ][DEFAULT_SCENARIO][objectivesData.DELIV_KEY_STRING];

  const VARIATIONS = [
    "expl0020", // change priority
    "expl0080", // increase carryover
    "expl0480", // decrease demand
    "expl0004", // increase minflow
  ];

  const VARIATIONS_DELIVS = VARIATIONS.map(
    (vars) =>
      objectivesData.OBJECTIVES_DATA[PAG_OBJECTIVE][
        objectivesData.SCENARIO_KEY_STRING
      ][vars][objectivesData.DELIV_KEY_STRING]
  );

  const VARIATIONS_INTERPERS = VARIATIONS_DELIVS.map(
    (varDelivs) => (val) =>
      levelToDropletLevel(
        d3
          .scaleLinear()
          .domain(ticksExact(0, 1, varDelivs.length))
          .range(
            varDelivs
              .map((v) => v / objectivesData.MAX_DELIVS)
              .sort()
              .reverse()
          )
          .clamp(true)(val)
      )
  );

  const PAG_INTERPER = (val) =>
    d3
      .scaleLinear()
      .domain(ticksExact(0, 1, PAG_DELIVS.length))
      .range(
        PAG_DELIVS.map((v) => v / objectivesData.MAX_DELIVS)
          .sort()
          .reverse()
      )
      .clamp(true)(val);

  const PAG_INTERPER_DROP = (val) =>
    levelToDropletLevel(
      d3
        .scaleLinear()
        .domain(ticksExact(0, 1, PAG_DELIVS.length))
        .range(
          PAG_DELIVS.map((v) => v / objectivesData.MAX_DELIVS)
            .sort()
            .reverse()
        )
        .clamp(true)(val)
    );

  const PRF_INTERPER = (val) =>
    d3
      .scaleLinear()
      .domain(ticksExact(0, 1, PRF_DELIVS.length))
      .range(
        PRF_DELIVS.map((v) => v / objectivesData.MAX_DELIVS)
          .sort()
          .reverse()
      )
      .clamp(true)(val);

  const DROP_VARIATIONS = [
    {
      idx: 0,
      scen: "0020",
      clas: "drop1",
      desc: "change priority",
    },
    {
      idx: 1,
      scen: "0080",
      clas: "drop2",
      desc: "increase carryover",
    },
    {
      idx: 2,
      scen: "0480",
      clas: "drop3",
      desc: "decrease demand",
    },
    {
      idx: 3,
      scen: "0004",
      clas: "drop4",
      desc: "increase minimum flow",
    },
  ];

  const MAX_DELIVS = objectivesData.MAX_DELIVS;

  return {
    BAR_CHART_WIDTH,
    BAR_CHART_HEIGHT,
    INTERP_COLOR,
    PAG_OBJECTIVE,
    PRF_OBJECTIVE,
    PAG_COLOR,
    PRF_COLOR,
    DEFAULT_SCENARIO,
    PAG_DELIVS,
    PRF_DELIVS,
    VARIATIONS,
    VARIATIONS_DELIVS,
    VARIATIONS_INTERPERS,
    PAG_INTERPER,
    PAG_INTERPER_DROP,
    PRF_INTERPER,
    DROP_VARIATIONS,
    MAX_DELIVS,
  };
}

const constants = initConstants();

export { constants };
