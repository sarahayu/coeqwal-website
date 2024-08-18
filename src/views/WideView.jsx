import * as d3 from "d3";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BiCross, BiNetworkChart } from "react-icons/bi";
import fuzzysort from "fuzzysort";

import { AppContext } from "AppContext";
import { descriptionsData } from "data/descriptions-data";
import { spatialData } from "data/spatial-data";
import { settings } from "settings";

import { avgCoords, dropCenterCorrection } from "utils/math-utils";
import { arrRemove, isState } from "utils/misc-utils";
import { generateTSpan, hideElems, showElems } from "utils/render-utils";

import { helpers } from "./wideview-helpers";

export default function WideView() {
  const appCtx = useContext(AppContext);

  const [curScreenTransform, setCurScreenTransform] = useState({
    zoom: 1,
    mouseX: 0,
    mouseY: 0,
  });

  const [currentHoveredDrop, setCurrentHoveredDrop] = useState(null);
  const [searchPrompt, setSearchPrompt] = useState(null);

  const enableZoomRef = useRef(false);
  const activeDropsRef = useRef([]);

  useEffect(function initialize() {
    if (!appCtx.waterdrops) return;

    initSVGGraphics();

    const cleanup = registerEventListeners();

    helpers.drawMinimapSVG();

    return cleanup;
  }, []);

  useEffect(
    function enterState() {
      if (isState(appCtx.state, "WideView")) {
        const { transitionDuration = 0 } = appCtx.state;
        d3.select("body").style("overflow", "hidden");

        enableZoomRef.current = true;
        setCurScreenTransform((cst) => ({
          ...cst,
          zoom: appCtx.camera.curTransform.k,
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
    [appCtx.state]
  );

  useEffect(
    function updateFontSizes() {
      if (enableZoomRef.current) {
        d3.select("#wide-group")
          .selectAll(".cloud-text")
          .each(
            helpers.fontSizer(
              curScreenTransform,
              appCtx.camera,
              appCtx.waterdrops.height
            )
          );
      }
    },
    [curScreenTransform]
  );

  const handleClickExamine = useCallback(function () {
    appCtx.setDisableCamAdjustments(true);

    const { x, y, height } = activeDropsRef.current[0];

    const newCamPos = [
      x,
      y - dropCenterCorrection({ height }),
      appCtx.camera.getZFromFarHeight(height * settings.SPREAD_1_2 * 1.5),
    ];

    const [startZoom, transitionDuration] = appCtx.zoomTo(
      newCamPos,
      function onFinish() {
        appCtx.setDisableCamAdjustments(false);
      }
    );

    startZoom();

    appCtx.setState({ state: "ExamineView", transitionDuration });

    const startOpacity = appCtx.getOutlineOpacity(appCtx.camera.curTransform.k);
    helpers.fadeOutDrops(
      appCtx.dropsMesh,
      appCtx.scene,
      startOpacity,
      transitionDuration / 2
    );
  }, []);

  const handleClickCompare = useCallback(function () {
    appCtx.setDisableCamAdjustments(true);

    const dropsMidpoint = avgCoords(
      activeDropsRef.current.map((w) => [w.x, w.y])
    );

    const newCamPos = [
      ...dropsMidpoint,
      appCtx.camera.getZFromFarHeight(
        appCtx.waterdrops.groups[0].height * 2 * settings.SPREAD_1_2 * 0.75 * 2
      ),
    ];

    const [startZoom, transitionDuration] = appCtx.zoomTo(
      newCamPos,
      function onFinish() {
        appCtx.setDisableCamAdjustments(false);
      }
    );

    startZoom();

    appCtx.setState({
      state: "CompareView",
      transitionDuration,
      viewCenter: dropsMidpoint,
    });

    const startOpacity = appCtx.getOutlineOpacity(appCtx.camera.curTransform.k);
    helpers.fadeOutDrops(
      appCtx.dropsMesh,
      appCtx.scene,
      startOpacity,
      transitionDuration / 5
    );
  }, []);

  const handleClickDeselectAll = useCallback(function () {
    appCtx.setActiveWaterdrops([]);
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
      .attr("x", 0 - appCtx.waterdrops.height * 0.6);
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

    appCtx.addZoomHandler(cameraListener);
    window.addEventListener("mousemove", mouseListener);

    return function cleanup() {
      window.removeEventListener("mousemove", mouseListener);
    };
  }

  function drawTHREEGraphics() {
    console.time("drawing");
    appCtx.dropsMesh.draw(appCtx.scene);
    console.timeEnd("drawing");

    appCtx.dropsMesh.updateVisibility(1);
    appCtx.dropsMesh.updateOutlineVisibility(
      appCtx.getOutlineOpacity(appCtx.camera.curTransform.k)
    );
  }

  function drawSVGGraphics() {
    const container = d3.select("#wide-group");

    helpers.updateLargeDropSVG(container, appCtx.waterdrops, {
      onClick: updateActiveDrops,
      onHover: hoverDrop,
      onUnhover: unhoverDrop,
    });

    for (const wd of activeDropsRef.current) {
      container.select(`.circlet#b${wd.key}`).classed("active", true);
    }

    const fontSize =
      (20 / appCtx.camera.height) *
      appCtx.camera.getZFromFarHeight(appCtx.waterdrops.height);
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

    appCtx.setActiveWaterdrops((aw) => {
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
      description: descriptionsData[d.key].desc,
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

  const searchResults = useMemo(() => {
    if (searchPrompt === null) return [];

    return fuzzysort.go(searchPrompt, appCtx.waterdrops.groups, {
      keys: [
        (obj) => descriptionsData[obj.key].id,
        (obj) => descriptionsData[obj.key].display_name,
        (obj) => descriptionsData[obj.key].desc,
      ],
      limit: 10,
      all: true,
    });
  }, [searchPrompt, appCtx.waterdrops]);

  return (
    <>
      <div id="infobox">
        <svg id="minimap"></svg>
        {currentHoveredDrop && (
          <div className="details">
            {!spatialData.SPATIAL_FEATURES[currentHoveredDrop.id] && (
              <p className="no-loc-data">No Location Data</p>
            )}
            <p className="curDesc">{currentHoveredDrop.description}</p>
            <p className="curKey">
              id: <span> {currentHoveredDrop.id} </span>
            </p>
          </div>
        )}
        {!currentHoveredDrop && (
          <div className="searchbox">
            <input
              type="text"
              placeholder="search"
              value={searchPrompt || ""}
              onChange={(e) => setSearchPrompt(e.target.value)}
              onFocus={() => {
                setSearchPrompt("");
                d3.select(".results").style("display", "flex");
              }}
              onBlur={() => {
                setTimeout(() => {
                  setSearchPrompt(null);
                  d3.select(".results").style("display", "none");
                }, 100);
              }}
            ></input>
            <div className="results" style={{ display: "none" }}>
              {searchResults.map(({ obj: wd }) => (
                <button key={wd.key} onClick={() => updateActiveDrops(wd)}>
                  {descriptionsData[wd.key].display_name ||
                    descriptionsData[wd.key].id}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="action-btn-wrapper">
        <ActionButtons
          appCtx={appCtx}
          handleClickExamine={handleClickExamine}
          handleClickDeselectAll={handleClickDeselectAll}
          handleClickCompare={handleClickCompare}
        />
      </div>
    </>
  );
}

function ActionButtons({
  appCtx,
  handleClickExamine,
  handleClickDeselectAll,
  handleClickCompare,
}) {
  let examineBtn, compareBtn;

  if (isState(appCtx.state, "WideView") && appCtx.activeWaterdrops.length) {
    if (appCtx.activeWaterdrops.length === 1) {
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
      {examineBtn}
      {compareBtn}
    </>
  );
}
