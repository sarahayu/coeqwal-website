import { ticksExact } from "bucket-lib/utils";
import {
  LOD_2_LARGE_DROP_PAD_FACTOR,
  LOD_2_LEVELS,
  LOD_2_MIN_LEV_VAL,
  LOD_2_RAD_PX,
  LOD_2_SMALL_DROP_PAD_FACTOR,
} from "settings";

import {
  DATA_GROUPINGS,
  FLATTENED_DATA,
  MAX_DELIVS,
  OBJECTIVE_IDS,
  SCENARIO_IDS,
} from "data/objectives-data";

import { calcDomLev, createInterpsFromDelivs } from "utils/data-utils";
import { placeDropsUsingPhysics } from "utils/math-utils";
import { mapBy } from "utils/misc-utils";

// TODO optimize!!
export function initWaterdrops(grouping) {
  const groupKeys = grouping === "objective" ? OBJECTIVE_IDS : SCENARIO_IDS;
  const memberKeys = grouping === "objective" ? SCENARIO_IDS : OBJECTIVE_IDS;

  const amtGroups = groupKeys.length;
  const amtPerGroup = memberKeys.length;

  const largeDropRad =
    Math.sqrt(amtPerGroup / Math.PI) *
    LOD_2_RAD_PX *
    2 *
    LOD_2_SMALL_DROP_PAD_FACTOR *
    LOD_2_LARGE_DROP_PAD_FACTOR;
  const smallDropRad = LOD_2_RAD_PX * LOD_2_SMALL_DROP_PAD_FACTOR;

  const largeNodesPhys = placeDropsUsingPhysics(
    0,
    0,
    groupKeys.map((p, idx) => ({
      r: largeDropRad,
      id: idx,
    }))
  );

  const largeNodesPos = mapBy(largeNodesPhys, ({ id }) => id);

  const smallNodesPhys = placeDropsUsingPhysics(
    0,
    0,
    memberKeys.map((s, idx) => ({
      r: smallDropRad,
      id: idx,
    }))
  );

  const smallNodesPos = mapBy(smallNodesPhys, ({ id }) => id);

  const nodes = [];
  const groupNodes = [];

  const groupToNodes = {};

  let idx = 0;

  for (const nodeData of FLATTENED_DATA) {
    const { id, objective, scenario, deliveries } = nodeData;

    const i = createInterpsFromDelivs(deliveries, MAX_DELIVS);
    const wds = ticksExact(0, 1, LOD_2_LEVELS + 1).map((d) => i(d));

    const levs = wds.map(
      (w, i) => Math.max(w, i == 0 ? LOD_2_MIN_LEV_VAL : 0) * LOD_2_RAD_PX
    );

    const groupID = grouping === "objective" ? objective : scenario;
    const memberID = grouping === "objective" ? scenario : objective;

    const groupRank = DATA_GROUPINGS[grouping][groupID].rank;
    const memberRank = DATA_GROUPINGS[grouping][groupID][id];

    const node = {
      id,
      levs,
      maxLev: LOD_2_RAD_PX,
      domLev: calcDomLev(levs),
      tilt: Math.random() * 50 - 25,
      dur: Math.random() * 100 + 400,
      x: smallNodesPos[memberRank].x,
      y: smallNodesPos[memberRank].y,
      group: groupID,
      key: memberID,
      globalX: largeNodesPos[groupRank].x + smallNodesPos[memberRank].x,
      globalY: largeNodesPos[groupRank].y + smallNodesPos[memberRank].y,
    };

    nodes.push(node);

    if (!groupToNodes[groupID]) groupToNodes[groupID] = [];

    groupToNodes[groupID].push(node);
  }

  for (const groupKey of groupKeys) {
    groupNodes.push({
      x: largeNodesPos[DATA_GROUPINGS[grouping][groupKey].rank].x,
      y: largeNodesPos[DATA_GROUPINGS[grouping][groupKey].rank].y,
      tilt: Math.random() * 50 - 25,
      key: groupKey,
      height: smallNodesPhys.height,
      nodes: groupToNodes[groupKey],
    });
  }

  return {
    nodes: nodes,
    groups: groupNodes,
    height: largeNodesPhys.height,
  };
}
