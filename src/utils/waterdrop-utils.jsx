import * as d3 from "d3";
import { ticksExact } from "bucket-lib/utils";
import { settings } from "settings";

import { objectivesData } from "data/objectives-data";

import { calcDomLev, createInterpsFromDelivs } from "utils/data-utils";
import { placeDropsUsingPhysics, rotatePoint } from "utils/math-utils";
import { mapBy } from "utils/misc-utils";

// TODO optimize!!
function initWaterdrops(grouping) {
  console.time("init waterdrops");
  const groupKeys =
    grouping === "objective"
      ? objectivesData.OBJECTIVE_IDS
      : objectivesData.SCENARIO_IDS;
  const memberKeys =
    grouping === "objective"
      ? objectivesData.SCENARIO_IDS
      : objectivesData.OBJECTIVE_IDS;

  const amtGroups = groupKeys.length;
  const amtPerGroup = memberKeys.length;

  const largeDropRad =
    Math.sqrt(amtPerGroup / Math.PI) *
    settings.LOD_1_RAD_PX *
    2 *
    settings.LOD_1_SMALL_DROP_PAD_FACTOR *
    settings.LOD_1_LARGE_DROP_PAD_FACTOR;
  const smallDropRad =
    settings.LOD_1_RAD_PX * settings.LOD_1_SMALL_DROP_PAD_FACTOR;

  const largeNodesPhys = placeDropsUsingPhysics(
    0,
    0,
    groupKeys.map((p, idx) => ({
      r: largeDropRad,
      id: idx,
    }))
  );

  for (let i = 0; i < largeNodesPhys.length; i++) {
    largeNodesPhys[i].tilt = 0;
  }

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

  for (const nodeData of objectivesData.FLATTENED_DATA) {
    const { id, objective, scenario, deliveries } = nodeData;

    const i = createInterpsFromDelivs(
      deliveries,
      d3.max(
        objectivesData.OBJECTIVES_DATA[objective][
          objectivesData.SCENARIO_KEY_STRING
        ]["expl0000"][objectivesData.DELIV_KEY_STRING]
      )
    );
    const wds = ticksExact(0, 1, settings.LOD_1_LEVELS + 1).map((d) => i(d));

    const levs = wds.map(
      (w, i) =>
        Math.max(w, i == 0 ? settings.LOD_1_MIN_LEV_VAL : 0) *
        settings.LOD_1_RAD_PX
    );

    const groupID = grouping === "objective" ? objective : scenario;
    const memberID = grouping === "objective" ? scenario : objective;

    const groupRank = objectivesData.DATA_GROUPINGS[grouping][groupID].rank;
    const memberRank = objectivesData.DATA_GROUPINGS[grouping][groupID][id];

    const localTilt = 0;
    const parentTilt = largeNodesPos[groupRank].tilt;

    const { x, y } = smallNodesPos[memberRank];
    const [rotatedX, rotatedY] = rotatePoint(x, y, parentTilt);

    const node = {
      id,
      levs,
      maxLev: settings.LOD_1_RAD_PX,
      domLev: calcDomLev(levs),
      tilt: localTilt,
      dur: Math.random() * 100 + 400,
      x,
      y,
      group: groupID,
      key: memberID,
      globalX: largeNodesPos[groupRank].x + rotatedX,
      globalY: largeNodesPos[groupRank].y + rotatedY,
      globalTilt: parentTilt + localTilt,
    };

    nodes.push(node);

    if (!groupToNodes[groupID]) groupToNodes[groupID] = [];

    groupToNodes[groupID].push(node);
  }

  for (const groupKey of groupKeys) {
    const { x, y, tilt } =
      largeNodesPos[objectivesData.DATA_GROUPINGS[grouping][groupKey].rank];
    groupNodes.push({
      x,
      y,
      tilt,
      key: groupKey,
      height: smallNodesPhys.height,
      nodes: groupToNodes[groupKey],
    });
  }

  console.timeEnd("init waterdrops");

  return {
    nodes: nodes,
    groups: groupNodes,
    height: largeNodesPhys.height,
  };
}

export const waterdrops = initWaterdrops("objective");
