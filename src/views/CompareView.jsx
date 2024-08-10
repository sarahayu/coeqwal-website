import * as d3 from "d3";
import React, { useContext, useEffect, useRef, useState } from "react";

import { AppContext } from "AppContext";
import DotHistogram from "components/DotHistogram";
import SceneSettingStickers from "components/SceneSettingStickers";
import { FLATTENED_DATA, KEY_SETTINGS_MAP } from "data/objectives-data";
import { SPREAD_1_2 } from "settings";

import { avgCoords } from "utils/math-utils";
import { isState } from "utils/misc-utils";
import { hideElems, removeElems, showElems } from "utils/render-utils";

import {
  calcLinesAndPositions,
  getWaterdropGroups,
  updateColorDrops,
  updateDropsSVG,
  updateLabelSVG,
  updateScenIndicatorsSVG,
} from "utils/compareview-utils";
import { deserialize } from "utils/data-utils";
import { useDragPanels } from "hooks/useDragPanels";

export default function CompareView() {
  const {
    state,
    setState,
    setGoBack,
    resetCamera,
    activeWaterdrops,
    waterdrops,
    camera,
    goals,
    setGoals,
    addZoomHandler,
  } = useContext(AppContext);

  const [activeMinidrop, setActiveMinidrop] = useState();
  const [colorSetting, setColorSetting] = useState(null);
  const [camTransform, setCamTransform] = useState(d3.zoomIdentity);
  const { panels, setPanels, onPanelDragStart, getPanelStyle } =
    useDragPanels(camTransform);

  const groupsRef = useRef();
  const centerRef = useRef();

  const getScreenDropHeight = () =>
    groupsRef.current.groups[0].height * SPREAD_1_2;

  useEffect(function initialize() {
    const container = d3
      .select("#mosaic-svg")
      .select(".svg-trans")
      .append("g")
      .attr("id", "compare-group");

    container.append("text").attr("id", "member-variable");
    container.append("text").attr("id", "member-label");

    addZoomHandler(function (transform) {
      setCamTransform(transform);
    });
  }, []);

  useEffect(
    function enterState() {
      if (isState(state, "CompareView")) {
        const container = d3.select("#compare-group");

        const { viewCenter, transitionDuration = 0 } = state;

        centerRef.current = viewCenter;

        groupsRef.current = getWaterdropGroups(
          activeWaterdrops,
          waterdrops,
          viewCenter
        );

        updateDropsSVG(container, groupsRef.current, transitionDuration / 5, {
          onHover: (d) => {
            setActiveMinidrop({ key: d.key });
          },
        });

        hideElems(".large-gray-text", container);

        setTimeout(() => {
          setActiveMinidrop({ key: groupsRef.current.groups[0].nodes[0].key });
          showElems(
            "#member-variable, #member-label, .large-gray-text",
            container
          );
          showElems(".comp-settings", d3, "flex");
        }, transitionDuration + 500);

        setGoBack(() => () => {
          const transitionDuration = resetCamera();

          setState({ state: "WideView", transitionDuration });
        });

        setCamTransform(camera.curTransform);

        return function exitState() {
          removeElems(".large-drop, .circlet, .comp-line", container);

          hideElems("#member-variable, #member-label", container);
          hideElems(".comp-settings");

          setPanels([]);
          setGoBack(null);
        };
      }
    },
    [state]
  );

  useEffect(
    function updateCirclets() {
      if (activeMinidrop) {
        const [positions, lines, nodes] = calcLinesAndPositions(
          groupsRef.current,
          activeMinidrop.key
        );

        setPanels(makePanelsFromNodes(nodes));
        updateLabelSVG(
          avgCoords(positions),
          activeMinidrop.key.slice(4),
          getScreenDropHeight()
        );
        updateScenIndicatorsSVG(positions, lines);
      }
    },
    [activeMinidrop]
  );

  useEffect(
    function highlightWithColor() {
      const container = d3.select("#compare-group");
      if (colorSetting === null) {
        hideElems(".color-drop-group", container);
        showElems(".large-drop", container);
        return;
      }

      const getOpacity = (key) => {
        return KEY_SETTINGS_MAP[key][colorSetting];
      };

      const colors = ["red", "orange", "blue", "green", "magenta"];

      updateColorDrops(
        container,
        groupsRef.current,
        getOpacity,
        colors[colorSetting]
      );
      showElems(".color-drop-group", container);
      hideElems(".large-drop", container);
    },
    [colorSetting]
  );

  function makePanelsFromNodes(nodes) {
    return (p) => {
      return nodes.map((n, i) => {
        let ox = 0,
          oy = 0;

        if (p[i]) {
          ox = p[i].offsetX;
          oy = p[i].offsetY;
        }

        const [x, y, isLeft] = getIdealGroupPos(
          groupsRef.current.groupPositions[i],
          centerRef.current
        );

        return {
          text: n.key,
          x,
          y,
          id: groupsRef.current.groups[i].key,
          nodeID: n.id,
          isLeft,
          offsetX: ox,
          offsetY: oy,
        };
      });
    };
  }

  function getIdealGroupPos([x, y], [centerX, centerY]) {
    let newX = x,
      newY = y;

    const correctionX = groupsRef.current.groups[0].height * 2;

    if (newX < centerX) newX -= correctionX;
    else newX += correctionX;

    return [newX, newY, newX < centerX];
  }

  return (
    <>
      {activeMinidrop && (
        <SceneSettingStickers
          settings={deserialize(activeMinidrop.key.slice(4))}
          setColorSetting={setColorSetting}
        />
      )}
      {panels.map(({ x, y, id, isLeft, offsetX, offsetY, nodeID }, i) => (
        <div
          className={"panel compare-panel" + (isLeft ? " left" : "")}
          key={i}
          style={getPanelStyle({ x, y, offsetX, offsetY })}
          onMouseDown={(e) => onPanelDragStart(e, { id })}
        >
          <DotHistogram
            width={300}
            height={200}
            data={FLATTENED_DATA[nodeID].deliveries}
            goal={goals[id]}
            setGoal={(newGoal) => {
              setGoals((g) => {
                g[id] = newGoal;
                return { ...g };
              });
            }}
          />
        </div>
      ))}
    </>
  );
}
