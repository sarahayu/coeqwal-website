import * as d3 from "d3";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import fuzzysort from "fuzzysort";

import { AppContext } from "AppContext";
import { descriptionsData } from "data/descriptions-data";
import { spatialData } from "data/spatial-data";
import { settings } from "settings";

import { avgCoords } from "utils/math-utils";
import { arrRemove, isState } from "utils/misc-utils";
import { generateTSpan, hideElems, showElems } from "utils/render-utils";
import { helpers } from "utils/wideview-helpers";
import { ActionButtons } from "components/ActionButtons";
import { BiCheck } from "react-icons/bi";
import { objectivesData } from "data/objectives-data";

export default function WideView() {
  const appCtx = useContext(AppContext);

  const [curScreenTransform, setCurScreenTransform] = useState({
    zoom: 1,
    mouseX: 0,
    mouseY: 0,
  });

  const firstStateEnterRef = useRef(true);
  const [currentHoveredDrop, setCurrentHoveredDrop] = useState(null);
  const [searchPrompt, setSearchPrompt] = useState(null);
  const [filterIsVisible, setFilterIsVisible] = useState(false);
  const [egoObjective, setEgoObjective] = useState(null);
  const [minDelivery, setMinDelivery] = useState(0);
  const [menuEgoObjective, setMenuEgoObjective] = useState(null);
  const [menuMinDelivery, setMenuMinDelivery] = useState(0);

  const enableZoomRef = useRef(false);

  useEffect(function initialize() {
    initSVGGraphics();

    const cleanup = registerEventListeners();

    helpers.drawMinimapSVG();

    return cleanup;
  }, []);

  useEffect(
    function initializeEgoObjective() {
      if (appCtx.waterdrops.groups && !egoObjective) {
        const obj = appCtx.waterdrops.groups[0].key;
        setEgoObjective(obj);
        setMinDelivery(objectivesData.RANGE_OF_MINS[obj][0]);
      }
    },
    [appCtx.waterdrops, egoObjective]
  );

  useEffect(
    function enterState() {
      if (isState(appCtx.state, "WideView")) {
        d3.select("body").style("overflow", "hidden");

        enableZoomRef.current = true;
        setCurScreenTransform((cst) => ({
          ...cst,
          zoom: appCtx.camera.curTransform.k,
        }));

        drawTHREEGraphics();
        drawSVGGraphics();

        showElems("#infobox, #mosaic-webgl, #mosaic-svg, #wide-group");

        firstStateEnterRef.current = false;

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

  useEffect(
    function updateVisibleScenarios() {
      if (!egoObjective || firstStateEnterRef.current) return;

      appCtx.updateWaterdrops({
        egoObjective: egoObjective,
        minDelivery: minDelivery,
      });
    },
    [egoObjective, minDelivery]
  );

  useEffect(
    function updateMenuMinDelivery() {
      if (menuEgoObjective)
        setMenuMinDelivery(objectivesData.RANGE_OF_MINS[menuEgoObjective][0]);
    },
    [menuEgoObjective]
  );

  useEffect(
    function resetCam() {
      if (firstStateEnterRef.current) return;

      const transitionDuration = appCtx.resetCamera();

      appCtx.setState({ state: "WideView", transitionDuration });
    },
    [appCtx.waterdrops]
  );

  const handleClickFilter = useCallback(
    function () {
      setMenuEgoObjective(egoObjective);
      setMenuMinDelivery(minDelivery);
      setFilterIsVisible(true);
    },
    [appCtx.waterdrops, egoObjective, minDelivery]
  );

  const handleClickDone = useCallback(
    function () {
      setFilterIsVisible(false);
      setEgoObjective(menuEgoObjective);
      setMinDelivery(menuMinDelivery);
    },
    [menuEgoObjective, menuMinDelivery]
  );

  const handleClickExamine = useCallback(
    function () {
      appCtx.setDisableCamAdjustments(true);

      const { x, y, height } =
        appCtx.waterdrops.groups[
          appCtx.waterdrops.groupKeyToIdx[appCtx.activeWaterdrops[0]]
        ];

      const newCamPos = [
        x,
        y,
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

      const startOpacity = appCtx.getOutlineOpacity(
        appCtx.camera.curTransform.k
      );
      helpers.fadeOutDrops(
        appCtx.dropsMesh,
        appCtx.scene,
        startOpacity,
        transitionDuration / 2
      );
    },
    [appCtx.getOutlineOpacity, appCtx.activeWaterdrops]
  );

  const handleClickCompare = useCallback(
    function () {
      appCtx.setDisableCamAdjustments(true);

      const dropsMidpoint = avgCoords(
        appCtx.activeWaterdrops.map((wkey) => {
          let wd =
            appCtx.waterdrops.groups[appCtx.waterdrops.groupKeyToIdx[wkey]];
          return [wd.x, wd.y];
        })
      );

      const newCamPos = [
        ...dropsMidpoint,
        appCtx.camera.getZFromFarHeight(
          appCtx.waterdrops.groups[0].height *
            2 *
            settings.SPREAD_1_2 *
            0.75 *
            2
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

      const startOpacity = appCtx.getOutlineOpacity(
        appCtx.camera.curTransform.k
      );
      helpers.fadeOutDrops(
        appCtx.dropsMesh,
        appCtx.scene,
        startOpacity,
        transitionDuration / 5
      );
    },
    [appCtx.getOutlineOpacity, appCtx.activeWaterdrops]
  );

  const handleClickDeselectAll = useCallback(function () {
    appCtx.setActiveWaterdrops([]);
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
      .attr("class", "instruction-text large-green-text fancy-font");
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

    for (const wd of appCtx.activeWaterdrops) {
      container.select(`.circlet#b${wd}`).classed("active", true);
    }

    const fontSize =
      (40 * appCtx.camera.getZFromFarHeight(appCtx.waterdrops.height)) /
      appCtx.camera.height;
    container
      .select(".instruction-text")
      .attr("x", 0 - appCtx.waterdrops.height * 0.6)
      .attr("y", -fontSize * 5)
      .attr("text-anchor", "end")
      .attr("font-size", fontSize)
      .call(
        generateTSpan(["click to interact", "scroll to zoom", "drag to pan"], 2)
      )
      .selectAll("tspan")
      .each(function (_, i) {
        d3.select(this).attr("dx", i * fontSize);
      });
  }

  function updateActiveDrops(d) {
    const container = d3.select("#wide-group");

    appCtx.setActiveWaterdrops((aw) => {
      if (aw.includes(d.key)) {
        aw = arrRemove(aw, d.key);

        container.select(`.circlet#b${d.key}`).classed("active", false);
      } else {
        aw.push(d.key);

        container.select(`.circlet#b${d.key}`).classed("active", true);
      }
      return [...aw];
    });
  }

  function hoverDrop(d) {
    setCurrentHoveredDrop({
      id: d.key,
      description: descriptionsData[d.key]?.desc || d.key,
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
          <div
            className="searchbox"
            tabIndex={-1}
            onBlur={(e) => {
              // https://stackoverflow.com/a/71530515
              const currentTarget = e.currentTarget;

              // Give browser time to focus the next element
              requestAnimationFrame(() => {
                // Check if the new focused element is a child of the original container
                if (!currentTarget.contains(document.activeElement)) {
                  setSearchPrompt(null);
                  d3.select(".results").style("display", "none");
                }
              });
            }}
          >
            <input
              type="text"
              placeholder="search"
              value={searchPrompt || ""}
              onChange={(e) => setSearchPrompt(e.target.value)}
              onFocus={() => {
                setSearchPrompt("");
                d3.select(".results").style("display", "flex");
              }}
            ></input>
            <div className="results" style={{ display: "none" }}>
              {searchResults.map(({ obj: wd }) => (
                <button
                  key={wd.key}
                  onClick={() => {
                    updateActiveDrops(wd);

                    setSearchPrompt(null);
                    d3.select(".results").style("display", "none");
                  }}
                >
                  {wd.display_name}
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
          handleClickFilter={handleClickFilter}
          handleClickDeselectAll={handleClickDeselectAll}
          handleClickCompare={handleClickCompare}
        />
      </div>
      {filterIsVisible && (
        <div id="filterbox">
          I'm only interested in scenarios where{" "}
          <select
            name="ego-obj"
            id="ego-obj"
            value={menuEgoObjective}
            onChange={(e) => void setMenuEgoObjective(e.target.value)}
          >
            {appCtx.waterdrops.groups.map((obj) => (
              <option
                key={descriptionsData[obj.key].id}
                value={descriptionsData[obj.key].id}
              >
                {descriptionsData[obj.key].display_name ||
                  descriptionsData[obj.key].id}
              </option>
            ))}
          </select>{" "}
          gets at least{" "}
          <span className="menu-min-deliv">
            {menuMinDelivery}
            <input
              type="range"
              name="min-deliv"
              id="min-deliv"
              value={menuMinDelivery}
              onChange={(e) => void setMenuMinDelivery(e.target.value)}
              min={objectivesData.RANGE_OF_MINS[menuEgoObjective][0]}
              max={objectivesData.RANGE_OF_MINS[menuEgoObjective][1]}
            />
          </span>{" "}
          TAF in deliveries.
          <button onClick={handleClickDone} className="fancy-font">
            <BiCheck />
            <span>Done</span>
          </button>
        </div>
      )}
    </>
  );
}
