import * as d3 from "d3";

import { useCallback, useEffect, useRef, useState } from "react";

import { objectivesData } from "data/objectives-data";
import { threeResources } from "three-resources";
import { waterdrops } from "utils/waterdrop-utils";

const appWidth = window.innerWidth,
  appHeight = window.innerHeight;

export default function useAppState() {
  const [state, setState] = useState({});
  const [activeWaterdrops, setActiveWaterdrops] = useState([]);
  const [goBack, setGoBack] = useState(null);
  const [goals, setGoals] = useState(objectivesData.OBJECTIVE_GOALS_MAP);

  const zoomCallbacksRef = useRef([]);
  const disableCamAdjustmentsRef = useRef(false);

  useEffect(function initialize() {
    threeResources.renderer.setSize(appWidth, appHeight);

    console.time("drops mesh creating");
    threeResources.dropsMesh.createMesh(waterdrops);
    console.timeEnd("drops mesh creating");

    document
      .querySelector("#mosaic-webgl")
      .appendChild(threeResources.renderer.domElement);

    d3.select("#mosaic-svg").attr("width", appWidth).attr("height", appHeight);

    const outlineOpacity = d3
      .scaleLinear()
      .domain([
        appHeight / waterdrops.height,
        appHeight / waterdrops.groups[0].height,
      ])
      .range([0.1, 1])
      .clamp(true);

    threeResources.camera.create({
      width: appWidth,
      height: appHeight,
      webglElement: d3.select(".bubbles-wrapper").node(),
      svgElement: d3.select("#mosaic-svg").select(".svg-trans").node(),
      zoomFn: (transform) => {
        if (!disableCamAdjustmentsRef.current) {
          threeResources.dropsMesh.updateOutlineVisibility(
            outlineOpacity(transform.k)
          );
        }

        for (const cb of zoomCallbacksRef.current) cb(transform);
      },
    });

    threeResources.renderer.setAnimationLoop(() => {
      threeResources.renderer.render(
        threeResources.scene,
        threeResources.camera.camera
      );
    });

    setState({ state: "TutorialView" });
  }, []);

  const getOutlineOpacity = useCallback(
    (val) =>
      d3
        .scaleLinear()
        .domain([
          appHeight / waterdrops.height,
          appHeight / waterdrops.groups[0].height,
        ])
        .range([0.1, 1])
        .clamp(true)(val),
    []
  );

  const resetCamera = useCallback(function (animated = true, callback) {
    const farHeight = waterdrops.height * 1.2;
    const pos = [
      0,
      -waterdrops.height * 0.08,
      threeResources.camera.getZFromFarHeight(farHeight),
    ];

    let transitionDuration = 0;

    if (animated) {
      const [start, dur] = zoomTo(pos, callback);
      transitionDuration = dur;

      start();
    } else {
      threeResources.camera.callZoomFromWorldViewport({
        worldX: pos[0],
        worldY: -pos[1],
        farHeight,
      });
      callback && callback();
    }

    return transitionDuration;
  }, []);

  const zoomTo = useCallback(function (worldPos, callback) {
    const i = threeResources.camera.interpolateZoomCamera(worldPos);

    const duration = i.duration / 2;

    const start = () => {
      const t = d3.timer((elapsed) => {
        const et = Math.min(elapsed / duration, 1);
        threeResources.camera.callZoom(i(et));

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

  return {
    appWidth,
    appHeight,
    state,
    setState,
    activeWaterdrops,
    setActiveWaterdrops,
    setDisableCamAdjustments,
    waterdrops,
    goBack,
    setGoBack,
    zoomTo,
    resetCamera,
    getOutlineOpacity,
    addZoomHandler,
    goals,
    setGoals,
    ...threeResources,
  };
}
