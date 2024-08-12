import * as d3 from "d3";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { BiCross, BiNetworkChart } from "react-icons/bi";

import { AppContext } from "AppContext";
import { DESCRIPTIONS_DATA } from "data/descriptions-data";
import { SPATIAL_FEATURES } from "data/spatial-data";
import { SPREAD_1_2 } from "settings";
import { dropsMesh, scene } from "three-resources";

import { avgCoords, dropCenterCorrection } from "utils/math-utils";
import { arrRemove, isState } from "utils/misc-utils";
import {
  drawMinimapSVG,
  fadeOutDrops,
  fontSizer,
  updateLargeDropSVG,
} from "utils/wideview-utils";
import { generateTSpan, hideElems, showElems } from "utils/render-utils";

export default function WideView() {
  const {
    waterdrops,
    state,
    setState,
    camera,
    zoomTo,
    setActiveWaterdrops,
    activeWaterdrops,
    setDisableCamAdjustments,
    getOutlineOpacity,
    addZoomHandler,
  } = useContext(AppContext);

  const [curScreenTransform, setCurScreenTransform] = useState({
    zoom: 1,
    mouseX: 0,
    mouseY: 0,
  });

  const [currentHoveredDrop, setCurrentHoveredDrop] = useState(null);

  const enableZoomRef = useRef(false);
  const activeDropsRef = useRef([]);

  useEffect(function initialize() {
    initSVGGraphics();

    const cleanup = registerEventListeners();

    drawMinimapSVG();

    return cleanup;
  }, []);

  useEffect(
    function enterState() {
      if (isState(state, "WideView")) {
        const { transitionDuration = 0 } = state;
        d3.select("body").style("overflow", "hidden");

        enableZoomRef.current = true;
        setCurScreenTransform((cst) => ({
          ...cst,
          zoom: camera.curTransform.k,
        }));

        drawTHREEGraphics();
        drawSVGGraphics();

        showElems("#infobox, #mosaic-webgl, #mosaic-svg, #wide-group");

        return function exitState() {
          hideElems("#infobox, #wide-group");

          enableZoomRef.current = false;
        };
      }
    },
    [state]
  );

  useEffect(
    function updateFontSizes() {
      if (enableZoomRef.current) {
        d3.select("#wide-group")
          .selectAll(".cloud-text")
          .each(fontSizer(curScreenTransform, camera, waterdrops.height));
      }
    },
    [curScreenTransform]
  );

  const handleClickExamine = useCallback(function () {
    setDisableCamAdjustments(true);

    const { x, y, height } = activeDropsRef.current[0];

    const newCamPos = [
      x,
      y - dropCenterCorrection({ height }),
      camera.getZFromFarHeight(height * SPREAD_1_2 * 1.5),
    ];

    const [startZoom, transitionDuration] = zoomTo(
      newCamPos,
      function onFinish() {
        setDisableCamAdjustments(false);
      }
    );

    startZoom();

    setState({ state: "ExamineView", transitionDuration });

    const startOpacity = getOutlineOpacity(camera.curTransform.k);
    fadeOutDrops(dropsMesh, scene, startOpacity, transitionDuration / 2);
  }, []);

  const handleClickCompare = useCallback(function () {
    setDisableCamAdjustments(true);

    const dropsMidpoint = avgCoords(
      activeDropsRef.current.map((w) => [w.x, w.y])
    );

    const newCamPos = [
      ...dropsMidpoint,
      camera.getZFromFarHeight(
        waterdrops.groups[0].height * 2 * SPREAD_1_2 * 0.75 * 2
      ),
    ];

    const [startZoom, transitionDuration] = zoomTo(
      newCamPos,
      function onFinish() {
        setDisableCamAdjustments(false);
      }
    );

    startZoom();

    setState({
      state: "CompareView",
      transitionDuration,
      viewCenter: dropsMidpoint,
    });

    const startOpacity = getOutlineOpacity(camera.curTransform.k);
    fadeOutDrops(dropsMesh, scene, startOpacity, transitionDuration / 5);
  }, []);

  const handleClickDeselectAll = useCallback(function () {
    setActiveWaterdrops([]);
    activeDropsRef.current = [];
    d3.selectAll("#wide-group .circlet").classed("active", false);
  }, []);

  function initSVGGraphics() {
    hideElems("#infobox, #mosaic-webgl, #mosaic-svg");

    const svgGroup = d3
      .select("#mosaic-svg")
      .select(".svg-trans")
      .append("g")
      .attr("id", "wide-group");

    svgGroup
      .append("text")
      .attr("class", "instruction-text large-gray-text fancy-font")
      .attr("x", 0 - waterdrops.height * 0.6);
  }

  function registerEventListeners() {
    const cameraListener = (transform) => {
      setCurScreenTransform((ti) => ({
        ...ti,
        zoom: transform.k,
      }));
    };

    const mouseListener = (e) => {
      setCurScreenTransform((ti) => ({
        ...ti,
        mouseX: e.x,
        mouseY: e.y,
      }));
    };

    addZoomHandler(cameraListener);
    window.addEventListener("mousemove", mouseListener);

    return function cleanup() {
      window.removeEventListener("mousemove", mouseListener);
    };
  }

  function drawTHREEGraphics() {
    console.time("drawing");
    dropsMesh.draw(scene);
    console.timeEnd("drawing");

    dropsMesh.updateVisibility(1);
    dropsMesh.updateOutlineVisibility(getOutlineOpacity(camera.curTransform.k));
  }

  function drawSVGGraphics() {
    const container = d3.select("#wide-group");

    updateLargeDropSVG(container, waterdrops, {
      onClick: updateActiveDrops,
      onHover: hoverDrop,
      onUnhover: unhoverDrop,
    });

    for (const wd of activeDropsRef.current) {
      container.select(`.circlet#b${wd.key}`).classed("active", true);
    }

    const fontSize =
      (20 / camera.height) * camera.getZFromFarHeight(waterdrops.height);
    container
      .select(".instruction-text")
      .attr("y", -fontSize * 5)
      .attr("text-anchor", "end")
      .attr("font-size", fontSize)
      .call(
        generateTSpan(
          ["click to interact.", "scroll to zoom.", "drag to pan."],
          2
        )
      )
      .selectAll("tspan")
      .each(function (_, i) {
        d3.select(this).attr("dx", i * 5);
      });
  }

  function updateActiveDrops(d) {
    const container = d3.select("#wide-group");

    setActiveWaterdrops((aw) => {
      if (aw.includes(d.key)) {
        aw = arrRemove(aw, d.key);
        activeDropsRef.current = arrRemove(activeDropsRef.current, d);

        container.select(`.circlet#b${d.key}`).classed("active", false);
      } else {
        aw.push(d.key);
        activeDropsRef.current.push(d);

        container.select(`.circlet#b${d.key}`).classed("active", true);
      }
      return [...aw];
    });
  }

  function hoverDrop(d) {
    setCurrentHoveredDrop({
      id: d.key,
      description: DESCRIPTIONS_DATA[d.key].desc,
    });

    d3.select("#minimap")
      .select(".outline." + d.key)
      .attr("fill", "gray");
  }

  function unhoverDrop(d) {
    setCurrentHoveredDrop(null);

    d3.select("#minimap")
      .select(".outline." + d.key)
      .attr("fill", "transparent");
  }

  let examineBtn, compareBtn;

  if (isState(state, "WideView") && activeWaterdrops.length) {
    if (activeWaterdrops.length === 1) {
      examineBtn = (
        <button
          onClick={handleClickExamine}
          className="wide-view-action-btn fancy-font"
        >
          <BiCross />
          <span>examine</span>
        </button>
      );
    } else {
      compareBtn = (
        <>
          <button
            onClick={handleClickDeselectAll}
            className="fancy-font supplement-btn"
          >
            <span>deselect all</span>
          </button>
          <button
            onClick={handleClickCompare}
            className="wide-view-action-btn fancy-font"
          >
            <BiNetworkChart />
            <span>compare</span>
          </button>
        </>
      );
    }
  }

  return (
    <>
      <div id="infobox">
        <svg id="minimap"></svg>
        {currentHoveredDrop && (
          <div className="details">
            {!SPATIAL_FEATURES[currentHoveredDrop.id] && (
              <p className="no-loc-data">No Location Data</p>
            )}
            <p className="curDesc">{currentHoveredDrop.description}</p>
            <p className="curKey">
              id: <span> {currentHoveredDrop.id} </span>
            </p>
          </div>
        )}
      </div>
      <div className="action-btn-wrapper">
        {examineBtn}
        {compareBtn}
      </div>
    </>
  );
}
