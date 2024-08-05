import * as d3 from "d3";
import React, { useContext, useEffect, useRef, useState } from "react";

import { AppContext } from "AppContext";
import DotHistogram from "components/DotHistogram";
import SceneSettingSubcard from "components/SceneSettingSubcard";
import { FLATTENED_DATA, KEY_SETTINGS_MAP } from "data/objectives-data";
import { SPREAD_1_2 } from "settings";

import { DESCRIPTIONS_DATA } from "data/descriptions-data";
import { updateColorDrops, updateSmallDropSVG } from "utils/examineview-utils";
import { arrRemove, isState } from "utils/misc-utils";
import { hideElems, removeElems, showElems } from "utils/render-utils";
import { deserialize } from "utils/data-utils";
import { useDragPanels } from "utils/drag-panels";

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
  const previewMinidropRef = useRef(null);
  const curMinidropsRef = useRef(null);

  const [colorSetting, setColorSetting] = useState(null);
  const [camTransform, setCamTransform] = useState(d3.zoomIdentity);
  const { panels, setPanels, onPanelDragStart, getPanelStyle } =
    useDragPanels(camTransform);

  useEffect(function initialize() {
    d3.select("#mosaic-svg")
      .select(".svg-trans")
      .append("g")
      .attr("id", "examine-group")
      .append("circle")
      .attr("class", "highlight-circle");

    addZoomHandler(function (transform) {
      setCamTransform(transform);
    });
  }, []);

  useEffect(
    function enterState() {
      if (isState(state, "ExamineView")) {
        const transitionDelay = state.transitionDuration;
        const container = d3.select("#examine-group");
        curMinidropsRef.current = waterdrops.groups.find(
          (g) => g.key === activeWaterdrops[0]
        );

        updateSmallDropSVG(
          container,
          curMinidropsRef.current,
          transitionDelay / 2,
          {
            onClick: updateActiveMinidrops,
            onHover: hoverDrop,
            onUnhover: unhoverDrop,
          }
        );

        setGoBack(() => () => {
          setState({ state: "WideView" });

          resetCamera();
        });

        setCamTransform(camera.curTransform);
        showElems("#examine-group");

        return function exitState() {
          removeElems(".small-drop, .circlet", container);
          hideElems("#examine-group");

          setPanels([]);
          activeMinidropsRef.current = [];
          previewMinidropRef.current = null;
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

  function addDetailPanel(dropId) {
    const { x: groupX, y: groupY } = curMinidropsRef.current;
    const { x, y, id, key } = waterdrops.nodes[dropId];
    setPanels((p) => {
      if (p.findIndex(({ id: pid }) => id === pid) !== -1) return p;
      const newPanel = {
        text: key.slice(4),
        x: groupX + x * SPREAD_1_2,
        y: groupY + y * SPREAD_1_2,
        offsetX: 20,
        offsetY: 40,
        id,
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

  function updateActiveMinidrops(d) {
    const container = d3.select("#examine-group");
    if (activeMinidropsRef.current.includes(d.id)) {
      arrRemove(activeMinidropsRef.current, d.id);
      container.select(".circlet.i" + d.id).classed("active", false);

      removeDetailPanel(d.id);
    } else {
      activeMinidropsRef.current.push(d.id);
      container.select(".circlet.i" + d.id).classed("active", true);

      addDetailPanel(d.id);
    }
  }

  function hoverDrop(d) {
    if (!activeMinidropsRef.current.includes(d.id)) {
      previewMinidropRef.current = d.id;
      addDetailPanel(d.id);
    }
  }

  function unhoverDrop(d) {
    if (previewMinidropRef.current === d.id) {
      previewMinidropRef.current = null;
      if (!activeMinidropsRef.current.includes(d.id)) {
        removeDetailPanel(d.id);
      }
    }
  }

  if (isState(state, "ExamineView")) {
    return (
      <>
        <h1 className="examine-large-label">
          {DESCRIPTIONS_DATA[activeWaterdrops[0]].display_name ||
            DESCRIPTIONS_DATA[activeWaterdrops[0]].id}
        </h1>
        {panels.map(({ text, x, y, id, offsetX, offsetY }) => (
          <div
            className="panel examine-panel"
            key={id}
            style={getPanelStyle({ x, y, offsetX, offsetY })}
            onMouseDown={(e) => onPanelDragStart(e, { id })}
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
        ))}
      </>
    );
  }
}
