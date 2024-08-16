import * as d3 from "d3";

import React, { useCallback, useEffect, useRef, useState } from "react";

import { AppContext } from "AppContext";

import { initWaterdrops } from "utils/app-utils";

import WideView from "views/WideView";
import ExamineView from "views/ExamineView";
import TutorialView from "views/TutorialView";
import CompareView from "views/CompareView";

import { scene, camera, renderer, dropsMesh } from "three-resources";
import { OBJECTIVE_GOALS_MAP } from "data/objectives-data";

// pre-calculate these so we don't lag later
const waterdrops = initWaterdrops("objective");

const appWidth = window.innerWidth,
  appHeight = window.innerHeight;

renderer.setSize(appWidth, appHeight);

console.time("drops mesh creating");
dropsMesh.createMesh(waterdrops);
console.timeEnd("drops mesh creating");

export default function App() {
  const [state, setState] = useState({});
  const [activeWaterdrops, setActiveWaterdrops] = useState([]);
  const [goBack, setGoBack] = useState(null);
  const [goals, setGoals] = useState(OBJECTIVE_GOALS_MAP);

  const zoomCallbacksRef = useRef([]);
  const disableCamAdjustmentsRef = useRef(false);

  const getOutlineOpacity = useCallback(
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

    d3.select("#mosaic-svg").attr("width", appWidth).attr("height", appHeight);

    camera.create({
      width: appWidth,
      height: appHeight,
      webglElement: d3.select(".bubbles-wrapper").node(),
      svgElement: d3.select("#mosaic-svg").select(".svg-trans").node(),
      zoomFn: (transform) => {
        if (!disableCamAdjustmentsRef.current) {
          dropsMesh.updateOutlineVisibility(getOutlineOpacity(transform.k));
        }

        for (const cb of zoomCallbacksRef.current) cb(transform);
      },
    });

    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera.camera);
    });

    resetCamera(false);
    setState({ state: "TutorialView" });
  }, []);

  const resetCamera = useCallback(function (animated = true, callback) {
    const farHeight = waterdrops.height * 1.2;
    const pos = [
      0,
      -waterdrops.height * 0.08,
      camera.getZFromFarHeight(farHeight),
    ];

    let transitionDuration = 0;

    if (animated) {
      const [start, dur] = zoomTo(pos, callback);
      transitionDuration = dur;

      start();
    } else {
      camera.callZoomFromWorldViewport({
        worldX: pos[0],
        worldY: -pos[1],
        farHeight,
      });
      callback && callback();
    }

    return transitionDuration;
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

    return [start, duration];
  }, []);

  const addZoomHandler = useCallback(function (cb) {
    zoomCallbacksRef.current.push(cb);
  }, []);

  const setDisableCamAdjustments = useCallback(function (disable) {
    disableCamAdjustmentsRef.current = disable;
  });

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
        dropsMesh,
        setGoBack,
        zoomTo,
        resetCamera,
        getOutlineOpacity,
        addZoomHandler,
        goals,
        setGoals,
      }}
    >
      <div className="bubbles-wrapper">
        <div id="mosaic-webgl"></div>
        <svg id="mosaic-svg">
          <g className="svg-trans"></g>
        </svg>
      </div>
      <TutorialView />
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
