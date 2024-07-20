import * as d3 from "d3";

import React, { useCallback, useEffect, useState } from "react";

import { AppContext } from "AppContext";

import { useStateRef } from "utils/misc-utils";
import { initWaterdrops } from "utils/app-utils";

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

console.time("drops mesh creating");
dropsMesh.createMesh(waterdrops);
console.timeEnd("drops mesh creating");

// pointsMesh.createMesh(waterdrops);

export default function App() {
  const [state, setState, stateRef] = useStateRef({});
  const [zoomCallbacks, setZoomCallbacks, zoomCallbacksRef] = useStateRef([]);
  const [activeWaterdrops, setActiveWaterdrops] = useState([]);
  const [goBack, setGoBack] = useState(null);
  const [
    disableCamAdjustments,
    setDisableCamAdjustments,
    disableCamAdjustmentsRef,
  ] = useStateRef(false);

  const getOutlineOpac = useCallback(
    d3
      .scaleLinear()
      .domain([
        appHeight / waterdrops.height,
        appHeight / waterdrops.groups[0].height,
      ])
      .range([0.1, 1])
      .clamp(true),
    []
  );

  useEffect(function initialize() {
    document.querySelector("#mosaic-webgl").appendChild(renderer.domElement);

    d3.select("#mosaic-svg")
      .attr("width", appWidth)
      .attr("height", appHeight)
      .append("g")
      .attr("class", "svg-trans");

    camera.mount(
      d3.select(".bubbles-wrapper").node(),
      d3.select("#mosaic-svg").select(".svg-trans").node()
    );
    camera.setZoomFn((transform) => {
      if (!disableCamAdjustmentsRef.current) {
        dropsMesh.updateOutlineVisibility(getOutlineOpac(transform.k));
      }

      for (const cb of zoomCallbacksRef.current) cb(transform);
    });
    camera.setSize(appWidth, appHeight);

    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera.camera);
    });

    resetCamera(false);
    setState({ state: "WideView" });
  }, []);

  const resetCamera = useCallback(function (animated = true, callback) {
    const pos = [
      0,
      -waterdrops.height * 0.08,
      camera.getZFromFarHeight(waterdrops.height),
    ];
    if (animated) {
      const { start } = zoomTo(pos, callback);
      start();
    } else {
      camera.callZoomFromWorldViewport({
        worldX: pos[0],
        worldY: -pos[1],
        farHeight: waterdrops.height,
      });
      callback && callback();
    }
  }, []);

  const zoomTo = useCallback(function (xyz, callback) {
    const i = camera.interpolateZoomCamera(xyz);

    const duration = i.duration / 2;

    const start = () => {
      const t = d3.timer((elapsed) => {
        const et = Math.min(elapsed / duration, 1);
        camera.callZoom(i(et));

        if (et === 1) {
          t.stop();
          callback && callback();
        }
      });
    };

    return {
      start,
      duration,
    };
  }, []);

  const addZoomHandler = useCallback(function (cb) {
    setZoomCallbacks((cbs) => [...cbs, cb]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        appWidth,
        appHeight,
        state,
        setState,
        activeWaterdrops,
        setActiveWaterdrops,
        setDisableCamAdjustments,
        waterdrops,
        scene,
        camera,
        renderer,
        pointsMesh,
        dropsMesh,
        setGoBack,
        zoomTo,
        resetCamera,
        getOutlineOpac,
        addZoomHandler,
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
