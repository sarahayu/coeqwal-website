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

export const NUM_OPTS = {
  demand: 5,
  carryover: 3,
  priority: 2,
  regs: 4,
  minflow: 5,
};

export function deserialize(scenStr) {
  let scenNum = parseInt(scenStr);

  const minflow = scenNum % NUM_OPTS.minflow;
  scenNum = (scenNum - minflow) / NUM_OPTS.minflow;

  const regs = scenNum % NUM_OPTS.regs;
  scenNum = (scenNum - regs) / NUM_OPTS.regs;

  const priority = scenNum % NUM_OPTS.priority;
  scenNum = (scenNum - priority) / NUM_OPTS.priority;

  const carryover = scenNum % NUM_OPTS.carryover;
  scenNum = (scenNum - carryover) / NUM_OPTS.carryover;

  // reverse demand values so that 0 is low demand and 4 is high demand
  const demand = scenNum % NUM_OPTS.demand;
  const demandReverse = NUM_OPTS.demand - 1 - demand;

  return [demandReverse, carryover, priority, regs, minflow];
}

export function serialize(demand, carryover, priority, regs, minflow) {
  // reverse demand values so that 0 is low demand and 4 is high demand
  const demandReverse = NUM_OPTS.demand - 1 - demand;
  let code = 0;
  code += minflow;
  code += NUM_OPTS.minflow * regs;
  code += NUM_OPTS.regs * NUM_OPTS.minflow * priority;
  code += NUM_OPTS.priority * NUM_OPTS.regs * NUM_OPTS.minflow * carryover;
  code +=
    NUM_OPTS.carryover *
    NUM_OPTS.priority *
    NUM_OPTS.regs *
    NUM_OPTS.minflow *
    demandReverse;

  const finalKey = `expl${d3.format("0>4")(code)}`;

  return finalKey;
}
