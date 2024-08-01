import * as d3 from "d3";

import { clamp, shuffle } from "utils/math-utils";
import { mapBy } from "utils/misc-utils";

const SCEN_DIVISOR = 1; // debugging purposes, don't render all scenarios to speed things up

export const MAX_DELIVS = 1200;
export const SCENARIO_KEY_STRING = "scens";
export const DELIV_KEY_STRING = "delivs";

export const OBJECTIVES_DATA = await (async function load() {
  const objs = await (await fetch("./objectives.json")).json();

  for (const obj of objs) {
    // shuffle so clusters of identical scenario results don't get processed deterministically
    for (const scen of shuffle(obj[SCENARIO_KEY_STRING])) {
      // data cleanup, clamping
      const unord = scen[DELIV_KEY_STRING].map((v) => clamp(v, 0, MAX_DELIVS));

      scen[DELIV_KEY_STRING] = unord.sort((a, b) => b - a);
    }
    obj[SCENARIO_KEY_STRING] = mapBy(
      obj[SCENARIO_KEY_STRING],
      ({ name }) => name
    );
  }

  console.log("DATA: loading objectives data");

  return mapBy(objs, ({ obj }) => obj);
})();

export const OBJECTIVE_IDS = Object.keys(OBJECTIVES_DATA);

const _SCENARIO_IDS = Object.keys(
  Object.values(OBJECTIVES_DATA)[0][SCENARIO_KEY_STRING]
);

export const SCENARIO_IDS = _SCENARIO_IDS.filter(
  (_, i) => i % SCEN_DIVISOR === 0
);

// Flattening hierarchical data makes it more flexible for classifying
// (from experience). id conveniently corresponds to index.
// Also cache classifications (by objective and by scenario, for now)
export const [FLATTENED_DATA, DATA_GROUPINGS] = (function preprocessData() {
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
