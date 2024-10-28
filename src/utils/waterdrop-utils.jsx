import { ticksExact } from "bucket-lib/utils";
import { settings } from "settings";

import { calcDomLev, createInterpsFromDelivs } from "utils/data-utils";
import { placeDropsUsingPhysics, rotatePoint } from "utils/math-utils";
import { mapBy } from "utils/misc-utils";

// TODO optimize!!
function initWaterdrops(objectivesData, descriptionsData, grouping) {
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
    })),
    0.8
  );

  for (let i = 0; i < largeNodesPhys.length; i++) {
    largeNodesPhys[i].tilt = Math.random() * 40 - 20;
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

    const [delivMin, delivMax] = objectivesData.MIN_MAXES[objective];

    const i = createInterpsFromDelivs(deliveries, delivMin, delivMax);
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

    const localTilt = Math.random() * 50 - 25;
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
      display_name: descriptionsData[groupKey].display_name || groupKey,
    });
  }

  console.timeEnd("init waterdrops");

  return {
    nodes: nodes,
    groups: groupNodes,
    height: largeNodesPhys.height,
  };
}

export { initWaterdrops };
