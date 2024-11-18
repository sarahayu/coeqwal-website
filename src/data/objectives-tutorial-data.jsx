import * as d3 from "d3";
import { SETT_NUM_OPTS, deserialize } from "utils/data-utils";

import { shuffle } from "utils/math-utils";
import { mapBy } from "utils/misc-utils";

async function initObjectivesData() {
  const MAX_DELIVS = 800;
  const SCENARIO_KEY_STRING = "scens";
  const DELIV_KEY_STRING = "delivs";
  const BASELINE_YRLY_KEY_STRING = "baseline_yearly";
  const BASELINE_SCEN = "expl0000";

  const OBJECTIVES_DATA = await (async function load() {
    console.log("DATA: loading objectives tutorial data");

    const objs = await (await fetch("./objectives_tutorial.json")).json();

    for (const obj of objs) {
      // shuffle so clusters of identical scenario results don't get processed deterministically
      for (const scen of shuffle(obj[SCENARIO_KEY_STRING])) {
        // save the baseline yearly data, don't order it
        if (scen["name"] === BASELINE_SCEN) {
          obj[BASELINE_YRLY_KEY_STRING] = Array.from(scen[DELIV_KEY_STRING]);
        }

        // sort data since we'll be using ordered data for all our vizes
        scen[DELIV_KEY_STRING] = scen[DELIV_KEY_STRING].sort(d3.descending);
      }
      obj[SCENARIO_KEY_STRING] = mapBy(
        obj[SCENARIO_KEY_STRING],
        ({ name }) => name
      );
    }

    return mapBy(objs, ({ obj }) => obj);
  })();

  const OBJECTIVE_IDS = Object.keys(OBJECTIVES_DATA);

  const OBJECTIVE_GOALS_MAP = (function initDefaults() {
    const goalMap = {};
    for (let i = 0; i < OBJECTIVE_IDS.length; i++)
      goalMap[OBJECTIVE_IDS[i]] = 200;
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
      scenario: {},
    };

    // for ordering later
    const means = [];

    let idx = 0;
    for (const obj of OBJECTIVE_IDS) {
      for (const scen of SCENARIO_IDS) {
        if (!dataGroupings["objective"][obj])
          dataGroupings["objective"][obj] = [];

        if (!dataGroupings["scenario"][scen])
          dataGroupings["scenario"][scen] = [];

        dataGroupings["objective"][obj].push(idx);
        dataGroupings["scenario"][scen].push(idx);

        const deliveries =
          OBJECTIVES_DATA[obj][SCENARIO_KEY_STRING][scen][DELIV_KEY_STRING];

        flattenedData.push({
          id: idx,
          objective: obj,
          scenario: scen,
          deliveries,
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
          mean: d3.mean(ids.map((id) => flattenedData[id].deliveries).flat()),
        });
      }

      const sortedObjScens = objScens.sort((a, b) => b.mean - a.mean);

      orderedDataGroupings[criteria] = {};

      for (let i = 0; i < sortedObjScens.length; i++) {
        const { key, sorted } = sortedObjScens[i];
        const IDtoRank = {};

        for (let j = 0; j < sorted.length; j++) {
          IDtoRank[sorted[j]] = j;
        }
        orderedDataGroupings[criteria][key] = IDtoRank;
        orderedDataGroupings[criteria][key].rank = i;
      }
    }

    return [flattenedData, orderedDataGroupings];
  })();

  return {
    MAX_DELIVS,
    SCENARIO_KEY_STRING,
    DELIV_KEY_STRING,
    BASELINE_YRLY_KEY_STRING,
    BASELINE_SCEN,
    OBJECTIVES_DATA,
    OBJECTIVE_IDS,
    OBJECTIVE_GOALS_MAP,
    SCENARIO_IDS,
    KEY_SETTINGS_MAP,
    MIN_MAXES,
    FLATTENED_DATA,
    DATA_GROUPINGS,
  };
}

export const objectivesData = await initObjectivesData();
