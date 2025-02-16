import * as d3 from "d3";

import { ticksExact } from "bucket-lib/utils";

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

// TODO combine these arrays to just one array of objects
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

export const SETT_DESC = [
  String.raw`Reduce total agriculture demands
(1) Reduce 40%
(2) Reduce 30%
(3) Reduce 20%
(4) Reduce 10%
(5) Baseline`,

  String.raw`Modify balance of reservoir storage and delivery
(1) Baseline
(2) Increase carryover (relative to delivery) 10%
(3) Increase carryover to 20%`,

  String.raw`Modify how CVP cuts are distributed during times of shortage
(1) Baseline
(2) Equal cuts`,

  String.raw`Selective removal/activation of D1641 regulations
(1) Baseline (all "on")
(2) No NDO, Rio Vista min flows
(3) No X2/salinity
(4) Combined no NDO + no X2`,

  String.raw`Modify/add minimum flow on Central Valley tributaries
(1) Baseline
(2) 40% unimpaired flow on main tributaries
(3) 60% unimpaired flow
(4) 70% unimpaired flow
(5) 80% unimpaired flow`,
];

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
