import * as d3 from "d3";
import React, { useContext, useEffect, useRef, useState } from "react";

import { AppContext } from "AppContext";
import DotHistogram from "components/DotHistogram";
import SceneSettingSubcard from "components/SceneSettingSubcard";
import { FLATTENED_DATA, KEY_SETTINGS_MAP } from "data/objectives-data";
import { SPREAD_1_2 } from "settings";

import { DESCRIPTIONS_DATA } from "data/descriptions-data";
import { updateColorDrops, updateSmallDropSVG } from "utils/examineview-utils";
import { arrRemove, isState, useStateRef } from "utils/misc-utils";
import {
  generateTSpan,
  hideElems,
  removeElems,
  screenToWorld,
  showElems,
  worldToScreen,
} from "utils/render-utils";
import { deserialize } from "utils/data-utils";
import { clipEnds, dist } from "utils/math-utils";
import { radToDeg } from "three/src/math/MathUtils";
import { useDragPanels } from "hooks/useDragPanels";
import { LOD_1_RAD_PX } from "settings";

export default function ExamineView() {
  const {
    state,
    setState,
    setGoBack,
    resetCamera,
    activeWaterdrops,
    waterdrops,
    camera,
    addZoomHandler,
    goals,
    setGoals,
  } = useContext(AppContext);

  const activeMinidropsRef = useRef([]);
  const curMinidropsRef = useRef(null);

  const [colorSetting, setColorSetting] = useState(null);
  const [camTransform, setCamTransform, camTransformRef] = useStateRef(
    d3.zoomIdentity
  );
  const { panels, panelsRef, setPanels, onPanelDragStart, getPanelStyle } =
    useDragPanels(camTransform);
  const [hoveredCard, setHoveredCard] = useState(null);
  const removePreviewRef = useRef(null);

  useEffect(function initialize() {
    const svgGroup = d3
      .select("#mosaic-svg")
      .select(".svg-trans")
      .append("g")
      .attr("id", "examine-group");

    svgGroup.append("circle").attr("class", "highlight-circle");

    svgGroup.append("path").attr("class", "connect-line");

    svgGroup.append("text").attr("class", "instruction-text large-gray-text");
    svgGroup.append("text").attr("class", "large-drop-label large-gray-text");

    addZoomHandler(function (transform) {
      setCamTransform(transform);
    });
  }, []);

  useEffect(
    function enterState() {
      if (isState(state, "ExamineView")) {
        const { transitionDuration = 0 } = state;
        const container = d3.select("#examine-group");
        curMinidropsRef.current = waterdrops.groups.find(
          (g) => g.key === activeWaterdrops[0]
        );

        updateSmallDropSVG(
          container,
          curMinidropsRef.current,
          transitionDuration / 2,
          {
            onClick: updateActiveMinidrops,
            onHover: hoverDrop,
            onUnhover: unhoverDrop,
          }
        );

        setTimeout(positionTexts, transitionDuration * 1.2);

        setGoBack(() => () => {
          const transitionDuration = resetCamera();

          setState({ state: "WideView", transitionDuration });
        });

        setCamTransform(camera.curTransform);
        showElems("#examine-group");

        return function exitState() {
          removeElems(".small-drop, .circlet", container);
          hideElems("#examine-group");
          d3.selectAll(
            "#examine-group .instruction-text, #examine-group .large-drop-label"
          ).attr("opacity", 0);

          setPanels([]);
          activeMinidropsRef.current = [];
          curMinidropsRef.current = null;
          setGoBack(null);
        };
      }
    },
    [state]
  );

  useEffect(
    function highlightWithColor() {
      const container = d3.select("#examine-group");
      if (colorSetting === null) {
        hideElems(".color-drop", container);
        showElems(".small-drop", container);
        return;
      }

      const getOpacity = (key) => {
        return KEY_SETTINGS_MAP[key][colorSetting];
      };

      const colors = ["red", "orange", "blue", "green", "magenta"];

      updateColorDrops(
        container,
        curMinidropsRef.current,
        getOpacity,
        colors[colorSetting]
      );
      showElems(".color-drop", container);
      hideElems(".small-drop", container);
    },
    [colorSetting]
  );

  function positionTexts() {
    const instrFontSize =
      (16 / camera.height) *
      camera.getZFromFarHeight(
        curMinidropsRef.current.height * SPREAD_1_2 * 1.5
      );

    d3.select("#examine-group .instruction-text")
      .attr(
        "x",
        curMinidropsRef.current.x -
          curMinidropsRef.current.height * SPREAD_1_2 * 0.8
      )
      .attr("y", curMinidropsRef.current.y - instrFontSize)
      .attr("opacity", 0)
      .attr("text-anchor", "end")
      .attr("font-size", instrFontSize)
      .call(
        generateTSpan(["click to show panels.", "you can drag panels."], 1.6)
      )
      .call((s) => {
        s.transition().attr("opacity", 1);
      })
      .selectAll("tspan")
      .each(function (_, i) {
        d3.select(this).attr("dx", i * 3);
      });

    const labelFontSize =
      (20 / camera.height) *
      camera.getZFromFarHeight(
        curMinidropsRef.current.height * SPREAD_1_2 * 1.5
      );
    const margin = labelFontSize;

    const [worldX, worldY] = camera.screenToWorld(0, 0);

    d3.select("#examine-group .large-drop-label")
      .attr("x", worldX + margin)
      .attr("y", worldY + margin)
      .attr("opacity", 0)
      .attr("text-anchor", "start")
      .attr("font-size", labelFontSize)
      .call(
        generateTSpan(
          DESCRIPTIONS_DATA[activeWaterdrops[0]].display_name ||
            DESCRIPTIONS_DATA[activeWaterdrops[0]].id,
          1.2
        )
      )
      .transition()
      .attr("opacity", 1);
  }

  function addDetailPanel(dropId, preview = false, forceReplace = false) {
    const { x: groupX, y: groupY } = curMinidropsRef.current;
    const { x, y, id, key } = waterdrops.nodes[dropId];
    setPanels((p) => {
      if (p.findIndex(({ id: pid }) => id === pid) !== -1) {
        if (!forceReplace) return p;

        arrRemove(p, (_p) => _p.id === id);
      }
      const newPanel = {
        text: key.slice(4),
        x: groupX + x * SPREAD_1_2,
        y: groupY + y * SPREAD_1_2,
        offsetX: 20,
        offsetY: 40,
        id,
        preview,
        panelKey: preview ? -1 : dropId,
      };

      return [...p, newPanel];
    });
  }

  function removeDetailPanel(dropId) {
    setPanels((p) => {
      arrRemove(p, ({ id }) => dropId === id);

      return [...p];
    });
  }

  function removePreviewPanel() {
    setPanels((p) => {
      arrRemove(p, ({ panelKey }) => panelKey === -1);

      return [...p];
    });
  }

  function updateActiveMinidrops(d) {
    const container = d3.select("#examine-group");
    if (activeMinidropsRef.current.includes(d.id)) {
      arrRemove(activeMinidropsRef.current, d.id);
      container.select(".circlet.i" + d.id).classed("active", false);
      removeDetailPanel(d.id);
      setHoveredCard(null);
    } else {
      removeDetailPanel(d.id);
      activeMinidropsRef.current.push(d.id);
      container.select(".circlet.i" + d.id).classed("active", true);
      addDetailPanel(d.id);
      setHoveredCard(d.id);
    }
  }

  function hoverDrop(d) {
    if (activeMinidropsRef.current.includes(d.id)) {
      d3.select(`.examine-panel.p${d.id}`).style("z-index", 100);
      setHoveredCard(d.id);
    } else {
      if (removePreviewRef.current) {
        clearTimeout(removePreviewRef.current);
        removePreviewPanel();
      }
      addDetailPanel(d.id, true);
    }
  }

  function unhoverDrop(d) {
    if (!activeMinidropsRef.current.includes(d.id)) {
      removePreviewRef.current = setTimeout(() => {
        removeDetailPanel(d.id);
        removePreviewRef.current = null;
      }, 100);
    }

    setHoveredCard((hc) => (hc === d.id ? null : hc));
    d3.select(`.examine-panel.p${d.id}`).style("z-index", 0);
  }

  function drawLineConnect(id) {
    if (panelsRef.current.findIndex(({ id: pid }) => id === pid) === -1) return;

    const { x: circleX, y: circleY } = panelsRef.current.find(
      (p) => p.id === id
    );

    const [cx, cy] = camera.worldToScreen(circleX, circleY);

    const panelBox = d3
      .select(`.examine-panel.p${id}`)
      .node()
      .getBoundingClientRect();
    const [px, py] = [
      panelBox.left + panelBox.width / 2,
      panelBox.top + panelBox.height / 2,
    ];

    const diffX = px - cx;
    const diffY = py - cy;

    let left, top;
    const margin = 5;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      top = 0;
      left = (diffX < 0 ? 1 : -1) * (panelBox.width / 2 - margin);
    } else {
      left = 0;
      top = (diffY < 0 ? 1 : -1) * (panelBox.height / 2 - margin);
    }

    const line = clipEnds(
      [
        [cx, cy],
        [px + left, py + top],
      ],
      8,
      0
    );

    return line;
  }

  if (isState(state, "ExamineView")) {
    return (
      <>
        {panels.map(
          ({ text, x, y, id, offsetX, offsetY, panelKey, preview }) => (
            <div
              className={`panel examine-panel p${id} ${
                preview ? "preview" : ""
              }`}
              key={preview ? -1 : id}
              style={getPanelStyle({ x, y, offsetX, offsetY })}
              onMouseDown={(e) => !preview && onPanelDragStart(e, { id })}
              onMouseEnter={() => !preview && hoverDrop({ id })}
              onMouseLeave={() => !preview && unhoverDrop({ id })}
            >
              <div className="panel-tab">
                scenario <span>{text}</span>
              </div>
              <DotHistogram
                width={300}
                height={200}
                data={FLATTENED_DATA[id].deliveries}
                goal={goals[activeWaterdrops[0]]}
                setGoal={(newGoal) => {
                  setGoals((g) => {
                    g[activeWaterdrops[0]] = newGoal;
                    return { ...g };
                  });
                }}
              />
              <SceneSettingSubcard
                settings={deserialize(text)}
                setColorSetting={setColorSetting}
              />
            </div>
          )
        )}
        {hoveredCard && (
          <ConnectLine connectLine={drawLineConnect(hoveredCard)} />
        )}
      </>
    );
  }
}

function ConnectLine({ connectLine }) {
  return (
    <div className="connect-line" style={getConnectStyle(...connectLine)}>
      <div className="connect-line-container"></div>
    </div>
  );
}

function getConnectStyle(from, to) {
  const width = dist(from, to);
  const rot = radToDeg(Math.atan2(to[1] - from[1], to[0] - from[0]));
  return {
    left: `${from[0]}px`,
    top: `${from[1]}px`,
    width: `${width}px`,
    rotate: `${rot}deg`,
  };
}
