import * as d3 from "d3";
import { SETT_NUM_OPTS, deserialize } from "utils/data-utils";

import { shuffle } from "utils/math-utils";
import { mapBy } from "utils/misc-utils";

const SCEN_DIVISOR = 1; // debugging purposes, don't render all scenarios to speed things up

async function initObjectivesData() {
  const MAX_DELIVS = 1200;
  const SCENARIO_KEY_STRING = "scens";
  const DELIV_KEY_STRING = "delivs";
  const BASELINE_SCEN = "expl0000";

  const OBJECTIVES_DATA = await (async function load() {
    console.log("DATA: loading objectives data");

    const objs = await (await fetch("./objectives_v3.json")).json();

    const chosenScenarios = objs[0][SCENARIO_KEY_STRING].filter(
      (s, i) => i % SCEN_DIVISOR === 0 || s === "expl0000"
    ).map(({ name }) => name);

    for (const obj of objs) {
      // shuffle so clusters of identical scenario results don't get processed deterministically
      const shuffledScens = shuffle(obj[SCENARIO_KEY_STRING]);

      // iterate backwards to remove unneeded scenarios
      for (let i = shuffledScens.length - 1; i >= 0; i--) {
        const scen = shuffledScens[i];

        if (chosenScenarios.includes(scen.name)) {
          // sort data since we'll be using ordered data for all our vizes
          scen[DELIV_KEY_STRING].sort(d3.descending);
        } else {
          shuffledScens.splice(i, 1);
        }
      }

      obj[SCENARIO_KEY_STRING] = mapBy(
        obj[SCENARIO_KEY_STRING],
        ({ name }) => name
      );
    }

    return mapBy(objs, ({ obj }) => obj);
  })();

  const OBJECTIVE_IDS = Object.keys(OBJECTIVES_DATA);

  // set default goals to 0TAF, we may want to change this on a per-objective basis
  const OBJECTIVE_GOALS_MAP = (function initDefaults() {
    const goalMap = {};
    for (let i = 0; i < OBJECTIVE_IDS.length; i++)
      goalMap[OBJECTIVE_IDS[i]] = 0;
    return goalMap;
  })();

  const SCENARIO_IDS = Object.keys(
    Object.values(OBJECTIVES_DATA)[0][SCENARIO_KEY_STRING]
  );

  const KEY_SETTINGS_MAP = (function preprocessData() {
    const map = {};
    const optArr = Object.values(SETT_NUM_OPTS);

    for (let i = 0; i < SCENARIO_IDS.length; i++) {
      const key = SCENARIO_IDS[i];

      map[key] = deserialize(key.slice(4)).map((v, i) => (v + 1) / optArr[i]);
    }

    return map;
  })();

  const MIN_MAXES = (function () {
    const minmaxes = {};

    for (const objective of OBJECTIVE_IDS) {
      const baselineMax = d3.max(
        OBJECTIVES_DATA[objective][SCENARIO_KEY_STRING][BASELINE_SCEN][
          DELIV_KEY_STRING
        ]
      );

      const scenariosMin = d3.min(
        SCENARIO_IDS.map((scenario) =>
          d3.min(
            OBJECTIVES_DATA[objective][SCENARIO_KEY_STRING][scenario][
              DELIV_KEY_STRING
            ]
          )
        )
      );

      // minmaxes[objective] = [scenariosMin, baselineMax];
      minmaxes[objective] = [0, baselineMax];

      for (const scenario of SCENARIO_IDS) {
        minmaxes[objective][scenario] = d3.extent(
          OBJECTIVES_DATA[objective][SCENARIO_KEY_STRING][scenario][
            DELIV_KEY_STRING
          ]
        );
      }
    }

    return minmaxes;
  })();

  const RANGE_OF_MINS = (function () {
    const minmaxes = {};

    for (const objective of OBJECTIVE_IDS) {
      minmaxes[objective] = d3.extent(
        SCENARIO_IDS.map((scenario) =>
          d3.min(
            OBJECTIVES_DATA[objective][SCENARIO_KEY_STRING][scenario][
              DELIV_KEY_STRING
            ]
          )
        )
      );
    }

    return minmaxes;
  })();

  // Flattening hierarchical data makes it more flexible for classifying.
  // id conveniently corresponds to index.
  // Also cache classifications (by objective and by scenario, for now).
  // TODO: change flattened_data to an iterator type function?
  const [FLATTENED_DATA, DATA_GROUPINGS] = (function preprocessData() {
    const flattenedData = [];
    const dataGroupings = {
      objective: {},
    };

    // for ordering later
    const means = [];

    let idx = 0;
    for (const obj of OBJECTIVE_IDS) {
      for (const scen of SCENARIO_IDS) {
        if (!dataGroupings["objective"][obj])
          dataGroupings["objective"][obj] = [];

        dataGroupings["objective"][obj].push(idx);

        const deliveries =
          OBJECTIVES_DATA[obj][SCENARIO_KEY_STRING][scen][DELIV_KEY_STRING];

        const minmax = d3.range(deliveries);

        flattenedData.push({
          id: idx,
          objective: obj,
          scenario: scen,
          deliveries,
          minmax,
        });

        means.push(d3.mean(deliveries));

        idx++;
      }
    }

    const orderedDataGroupings = {};

    for (const criteria of Object.keys(dataGroupings)) {
      const objScens = [];
      for (const key of Object.keys(dataGroupings[criteria])) {
        const ids = dataGroupings[criteria][key];
        const sortedObjScens = ids.sort((a, b) => means[b] - means[a]);
        objScens.push({
          key,
          sorted: sortedObjScens,
          mean: d3.mean(
            ids
              .map((id) => {
                const deliveries = flattenedData[id].deliveries;
                const maxVal = MIN_MAXES[flattenedData[id].objective][1];
                return deliveries.map((delivery) => delivery / maxVal);
              })
              .flat()
          ),
        });
      }

      const sortedObjScens = objScens.sort((a, b) => b.mean - a.mean);

      orderedDataGroupings[criteria] = {};

      for (let i = 0; i < sortedObjScens.length; i++) {
        const { key, sorted } = sortedObjScens[i];
        const keyToRank = {};

        for (let j = 0; j < sorted.length; j++) {
          keyToRank[flattenedData[sorted[j]].scenario] = j;
        }
        orderedDataGroupings[criteria][key] = keyToRank;
        orderedDataGroupings[criteria][key].rank = i;
      }
    }

    return [flattenedData, orderedDataGroupings];
  })();

  return {
    MAX_DELIVS,
    SCENARIO_KEY_STRING,
    DELIV_KEY_STRING,
    BASELINE_SCEN,
    OBJECTIVES_DATA,
    OBJECTIVE_IDS,
    OBJECTIVE_GOALS_MAP,
    SCENARIO_IDS,
    KEY_SETTINGS_MAP,
    MIN_MAXES,
    RANGE_OF_MINS,
    FLATTENED_DATA,
    DATA_GROUPINGS,
  };
}

export const objectivesData = await initObjectivesData();
