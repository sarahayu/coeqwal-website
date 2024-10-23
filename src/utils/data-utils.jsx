import * as d3 from "d3";

import { ticksExact } from "bucket-lib/utils";

import { objectivesData } from "data/objectives-data";

export function createInterps(obj_name, scen_name, data, maxDelivs) {
  const delivs =
    data[obj_name][objectivesData.SCENARIO_KEY_STRING][scen_name][
      objectivesData.DELIV_KEY_STRING
    ];
  return d3
    .scaleLinear()
    .domain(ticksExact(0, 1, delivs.length))
    .range(delivs.map((v) => Math.min(1, v / maxDelivs)))
    .clamp(true);
}

export function createInterpsFromDelivs(delivs, minDelivs, maxDelivs) {
  return d3
    .scaleLinear()
    .domain(ticksExact(0, 1, delivs.length))
    .range(
      delivs.map((v) => Math.min(1, (v - minDelivs) / (maxDelivs - minDelivs)))
    )
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

export const SETT_NAME_SHORT = ["D", "C", "P", "R", "M"];
export const SETT_NAME_FULL = [
  "Demand",
  "Carryover",
  "Priority",
  "Regs.",
  "Min. Flow",
];
export const SETT_VAL_STEPS = [
  [1, 0.9, 0.8, 0.7, 0.6].reverse(), // demand
  [1.0, 1.2, 1.3], // carryover
  [0, 1], // priority
  [1, 2, 3, 4], // regs
  [0, 0.4, 0.6, 0.7, 0.8], // minflow
];

export const SETT_NUM_OPTS = {
  demand: SETT_VAL_STEPS[0].length,
  carryover: SETT_VAL_STEPS[1].length,
  priority: SETT_VAL_STEPS[2].length,
  regs: SETT_VAL_STEPS[3].length,
  minflow: SETT_VAL_STEPS[4].length,
};

export function deserialize(scenStr) {
  let scenNum = parseInt(scenStr);

  const minflow = scenNum % SETT_NUM_OPTS.minflow;
  scenNum = (scenNum - minflow) / SETT_NUM_OPTS.minflow;

  const regs = scenNum % SETT_NUM_OPTS.regs;
  scenNum = (scenNum - regs) / SETT_NUM_OPTS.regs;

  const priority = scenNum % SETT_NUM_OPTS.priority;
  scenNum = (scenNum - priority) / SETT_NUM_OPTS.priority;

  const carryover = scenNum % SETT_NUM_OPTS.carryover;
  scenNum = (scenNum - carryover) / SETT_NUM_OPTS.carryover;

  // reverse demand values so that 0 is low demand and 4 is high demand
  const demand = scenNum % SETT_NUM_OPTS.demand;
  const demandReverse = SETT_NUM_OPTS.demand - 1 - demand;

  return [demandReverse, carryover, priority, regs, minflow];
}

export function serialize(demand, carryover, priority, regs, minflow) {
  // reverse demand values so that 0 is low demand and 4 is high demand
  const demandReverse = SETT_NUM_OPTS.demand - 1 - demand;
  let code = 0;
  code += minflow;
  code += SETT_NUM_OPTS.minflow * regs;
  code += SETT_NUM_OPTS.regs * SETT_NUM_OPTS.minflow * priority;
  code +=
    SETT_NUM_OPTS.priority *
    SETT_NUM_OPTS.regs *
    SETT_NUM_OPTS.minflow *
    carryover;
  code +=
    SETT_NUM_OPTS.carryover *
    SETT_NUM_OPTS.priority *
    SETT_NUM_OPTS.regs *
    SETT_NUM_OPTS.minflow *
    demandReverse;

  const finalKey = `expl${d3.format("0>4")(code)}`;

  return finalKey;
}
