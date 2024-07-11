import * as d3 from "d3";
import * as THREE from "three";

import React, { useCallback, useEffect, useState } from "react";

import { ticksExact } from "bucket-lib/utils";
import {
  LOD_2_LARGE_DROP_PAD_FACTOR,
  LOD_2_LEVELS,
  LOD_2_MIN_LEV_VAL,
  LOD_2_RAD_PX,
  LOD_2_SMALL_DROP_PAD_FACTOR,
} from "settings";

import { AppContext } from "AppContext";

import {
  DATA_GROUPINGS,
  FLATTENED_DATA,
  MAX_DELIVS,
  OBJECTIVES_DATA,
  OBJECTIVE_IDS,
  SCENARIO_IDS,
} from "data/objectives-data";

import { calcDomLev, createInterps } from "utils/data-utils";
import { placeDropsUsingPhysics, toRadians } from "utils/math-utils";
import { mapBy, useStateRef } from "utils/misc-utils";

import WideView from "views/WideView";
import ExamineView from "views/ExamineView";
import CompareView from "views/CompareView";

import {
  scene,
  camera,
  renderer,
  dropsMesh,
  pointsMesh,
} from "three-resources";

// pre-calculate these so we don't lag later
const waterdrops = initWaterdrops("objective");

const appWidth = window.innerWidth,
  appHeight = window.innerHeight;

renderer.setSize(appWidth, appHeight);

// dropsMesh.createMesh(waterdrops);
pointsMesh.createMesh(waterdrops);

export default function App() {
  const [stateStack, setStateStack, stateStackRef] = useStateRef([]);
  const [activeWaterdrops, setActiveWaterdrops] = useState([]);
  const [goBack, setGoBack] = useState(null);

  useEffect(function initialize() {
    document.querySelector("#mosaic-webgl").appendChild(renderer.domElement);

    d3.select("#mosaic-svg")
      .attr("width", appWidth)
      .attr("height", appHeight)
      .append("g")
      .attr("class", "svg-trans");

    camera.mount(d3.select(".bubbles-wrapper").node());
    camera.setSize(appWidth, appHeight);

    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera.camera);
    });

    pushState({ state: "WideView" });
  }, []);

  const pushState = useCallback(({ state, transitioning }) => {
    setStateStack((stateStack) => {
      stateStack = [{ state, transitioning }, ...stateStack];
      console.log("after push: ", JSON.stringify(stateStack));
      return stateStack;
    });
  }, []);

  const popState = useCallback((n = 1) => {
    setStateStack((stateStack) => {
      for (let i = 0; i < n; i++) stateStack.shift();
      console.log("after pop: ", JSON.stringify(stateStack));
      return [...stateStack];
    });
  }, []);

  const zoomTo = useCallback((xyz, callback) => {
    const i = camera.getZoomInterpolator(xyz);

    const t = d3.timer((elapsed) => {
      const et = Math.min(elapsed / (i.duration / 2), 1);

      const [worldX, worldY, farHeight] = i(et);

      camera.callZoomFromWorldViewport({
        worldX,
        worldY,
        farHeight,
      });

      if (et === 1) {
        t.stop();
        callback();
      }
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        appWidth,
        appHeight,
        stateStack,
        pushState,
        popState,
        activeWaterdrops,
        setActiveWaterdrops,
        waterdrops,
        scene,
        camera,
        renderer,
        pointsMesh,
        dropsMesh,
        setGoBack,
        zoomTo,
      }}
    >
      <div className="bubbles-wrapper">
        <div id="mosaic-webgl"></div>
        <svg id="mosaic-svg"></svg>
      </div>
      <WideView />
      <ExamineView />
      <CompareView />
      {goBack && (
        <button className="go-back-btn" onClick={goBack}>
          ←
        </button>
      )}
    </AppContext.Provider>
  );
}

// TODO optimize!!
function initWaterdrops(grouping) {
  const groupKeys = grouping === "objective" ? OBJECTIVE_IDS : SCENARIO_IDS;
  const memberKeys = grouping === "objective" ? SCENARIO_IDS : OBJECTIVE_IDS;

  const amtGroups = groupKeys.length;
  const amtPerGroup = memberKeys.length;

  const largeDropRad = Math.max(
    1,
    Math.sqrt(amtPerGroup / Math.PI) *
      LOD_2_RAD_PX *
      2 *
      LOD_2_SMALL_DROP_PAD_FACTOR *
      LOD_2_LARGE_DROP_PAD_FACTOR
  );
  const smallDropRad = Math.max(2, LOD_2_RAD_PX * LOD_2_SMALL_DROP_PAD_FACTOR);

  const largeNodesPos = mapBy(
    placeDropsUsingPhysics(
      0,
      0,
      groupKeys.map((p, idx) => ({
        r: largeDropRad,
        id: idx,
      }))
    ),
    ({ id }) => id
  );

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
  const nodeIDtoIdx = {};

  let idx = 0;

  for (const node of FLATTENED_DATA) {
    const { id, objective, scenario, deliveries } = node;

    const i = createInterps(objective, scenario, OBJECTIVES_DATA, MAX_DELIVS);
    const wds = ticksExact(0, 1, LOD_2_LEVELS + 1).map((d) => i(d));

    const levs = wds.map(
      (w, i) => Math.max(w, i == 0 ? LOD_2_MIN_LEV_VAL : 0) * LOD_2_RAD_PX
    );

    const groupID = grouping === "objective" ? objective : scenario;
    const memberID = grouping === "objective" ? scenario : objective;

    const groupRank = DATA_GROUPINGS[grouping][groupID].rank;
    const memberRank = DATA_GROUPINGS[grouping][groupID][id];

    nodes.push({
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
    });

    nodeIDtoIdx[id] = idx++;
  }

  for (const groupKey of groupKeys) {
    groupNodes.push({
      x: largeNodesPos[DATA_GROUPINGS[grouping][groupKey].rank].x,
      y: largeNodesPos[DATA_GROUPINGS[grouping][groupKey].rank].y,
      tilt: Math.random() * 50 - 25,
      key: groupKey,
      height: smallNodesPhys.height,
    });
  }

  return {
    nodes: nodes,
    nodeIDtoIdx,
    groups: groupNodes,
  };
}
