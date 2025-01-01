import { ticksExact } from "bucket-lib/utils";
import { settings as appSettings } from "settings";

import { calcDomLev, createInterpsFromDelivs } from "utils/data-utils";
import { placeDropsUsingPhysics, rotatePoint } from "utils/math-utils";
import { mapBy } from "utils/misc-utils";
import * as d3 from "d3";

// TODO optimize!!
function initWaterdrops(objectivesData, descriptionsData, settings) {
  console.time("init waterdrops");

  const groupKeys = objectivesData.OBJECTIVE_IDS;
  const memberKeys = settings
    ? objectivesData.SCENARIO_IDS.filter(
        (scenario) =>
          objectivesData.MIN_MAXES[settings.egoObjective][scenario][0] >=
          settings.minDelivery
      )
    : objectivesData.SCENARIO_IDS;

  const amtGroups = groupKeys.length;
  const amtPerGroup = memberKeys.length;

  const largeDropRad =
    Math.sqrt(amtPerGroup / Math.PI) *
    appSettings.LOD_1_RAD_PX *
    2 *
    appSettings.LOD_1_SMALL_DROP_PAD_FACTOR *
    appSettings.LOD_1_LARGE_DROP_PAD_FACTOR;
  const smallDropRad =
    appSettings.LOD_1_RAD_PX * appSettings.LOD_1_SMALL_DROP_PAD_FACTOR;

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
  const nodeKeyToIdx = [];
  const groupNodes = [];

  const groupToNodes = {};
  const groupKeyToIdx = {};

  const rankCache = {};

  let idx = 0;

  for (const nodeData of objectivesData.FLATTENED_DATA) {
    const { id, objective, scenario, deliveries } = nodeData;

    if (!memberKeys.includes(scenario)) continue;

    const [delivMin, delivMax] = objectivesData.MIN_MAXES[objective];

    const i = createInterpsFromDelivs(deliveries, delivMin, delivMax);
    const wds = ticksExact(0, 1, appSettings.LOD_1_LEVELS + 1).map((d) => i(d));

    const levs = wds.map(
      (w, i) =>
        Math.max(w, i == 0 ? appSettings.LOD_1_MIN_LEV_VAL : 0) *
        appSettings.LOD_1_RAD_PX
    );

    const groupID = objective;
    const memberID = scenario;

    if (rankCache[groupID] === undefined) {
      let arrRanks = [];
      for (let mkey of memberKeys) {
        arrRanks.push(
          objectivesData.DATA_GROUPINGS["objective"][groupID][mkey]
        );
      }

      let rankMap = {};

      arrRanks.sort(d3.ascending);

      for (let i = 0; i < arrRanks.length; i++) {
        rankMap[arrRanks[i]] = i;
      }

      rankCache[groupID] = rankMap;
    }

    const groupRank = objectivesData.DATA_GROUPINGS["objective"][groupID].rank;
    const memberRank =
      rankCache[groupID][
        objectivesData.DATA_GROUPINGS["objective"][groupID][memberID]
      ];

    const localTilt = Math.random() * 50 - 25;
    const parentTilt = largeNodesPos[groupRank].tilt;

    const { x, y } = smallNodesPos[memberRank];
    const [rotatedX, rotatedY] = rotatePoint(x, y, parentTilt);

    const node = {
      id,
      levs,
      maxLev: appSettings.LOD_1_RAD_PX,
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
    nodeKeyToIdx[id] = idx++;
  }

  idx = 0;

  for (const groupKey of groupKeys) {
    const { x, y, tilt } =
      largeNodesPos[objectivesData.DATA_GROUPINGS["objective"][groupKey].rank];
    groupNodes.push({
      x,
      y,
      tilt,
      key: groupKey,
      height: smallNodesPhys.height,
      nodes: groupToNodes[groupKey],
      display_name: descriptionsData[groupKey].display_name || groupKey,
    });

    groupKeyToIdx[groupKey] = idx++;
  }

  console.timeEnd("init waterdrops");

  return {
    nodes: nodes,
    groups: groupNodes,
    height: largeNodesPhys.height,
    groupKeyToIdx,
    nodeKeyToIdx,
  };
}

export { initWaterdrops };
