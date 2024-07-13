import * as d3 from "d3";

import { ticksExact } from "bucket-lib/utils";

import { SCENARIO_KEY_STRING, DELIV_KEY_STRING } from "data/objectives-data";

export function createInterps(obj_name, scen_name, data, maxDelivs) {
  const delivs =
    data[obj_name][SCENARIO_KEY_STRING][scen_name][DELIV_KEY_STRING];
  return d3
    .scaleLinear()
    .domain(ticksExact(0, 1, delivs.length))
    .range(delivs.map((v) => Math.min(1, v / maxDelivs)))
    .clamp(true);
}

export function createInterpsFromDelivs(delivs, maxDelivs) {
  return d3
    .scaleLinear()
    .domain(ticksExact(0, 1, delivs.length))
    .range(delivs.map((v) => Math.min(1, v / maxDelivs)))
    .clamp(true);
}

// TODO fix colors
export function calcDomLev(levs) {
  levs = [1, ...levs, 0];

  let mean = 0;
  for (let i = 0; i < levs.length - 1; i++) {
    const dif = levs[i] - levs[i + 1];
    mean += (dif * (i - 1)) / (levs.length + 4);
  }

  return mean;
}
