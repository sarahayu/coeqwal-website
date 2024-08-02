import * as d3 from "d3";
import React, { useContext, useEffect, useRef, useState } from "react";

import { AppContext } from "AppContext";
import DotHistogram from "components/DotHistogram";
import { FLATTENED_DATA, KEY_SETTINGS_MAP } from "data/objectives-data";
import { LOD_1_RAD_PX, SPREAD_1_2 } from "settings";

import { avgCoords } from "utils/math-utils";
import { isState } from "utils/misc-utils";
import { circlet, hideElems, removeElems, showElems } from "utils/render-utils";

import {
  calcLinesAndPositions,
  getWaterdropGroups,
  updateColorDrops,
  updateDropsSVG,
} from "utils/compareview-utils";
import { SETT_NAME_FULL, SETT_VAL_STEPS, deserialize } from "utils/data-utils";

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
  const [panels, setPanels] = useState([]);
  const [colorSetting, setColorSetting] = useState(null);
  const groupsRef = useRef();
  const centerRef = useRef();
  const mouseDownInfo = useRef({});

  // TODO trigger rerender another way?
  const [cameraChangeFlag, setCameraChangeFlag] = useState(false);

  useEffect(function initialize() {
    const container = d3
      .select("#mosaic-svg")
      .select(".svg-trans")
      .append("g")
      .attr("id", "compare-group");

    container.append("text").attr("id", "member-variable");
    container.append("text").attr("id", "member-label");

    registerEventListeners();
  }, []);

  useEffect(
    function enterState() {
      if (isState(state, "CompareView")) {
        const container = d3.select("#compare-group");

        const { viewCenter, transitionDuration } = state;

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

        hideElems(".water-group-label");

        setTimeout(() => {
          setActiveMinidrop({ key: groupsRef.current.groups[0].nodes[0].key });
          showElems(
            "#member-variable, #member-label, .water-group-label",
            container
          );
          showElems(".comp-settings", d3, "flex");
        }, transitionDuration + 500);

        setGoBack(() => () => {
          setState({ state: "WideView" });

          resetCamera();
        });

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

        setPanels(fromNodes(nodes));
        updateLabel(avgCoords(positions));
        updateScenIndicators(positions, lines);
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

  function registerEventListeners() {
    addZoomHandler(function () {
      setCameraChangeFlag((f) => !f);
    });

    window.addEventListener("mousemove", (e) => {
      if (mouseDownInfo.current.startX === undefined) return;

      mouseDownInfo.current.deltaX = e.x - mouseDownInfo.current.startX;
      mouseDownInfo.current.deltaY = e.y - mouseDownInfo.current.startY;

      setPanels((p) => {
        if (mouseDownInfo.current.startX === undefined) return p;

        const f = p.find((v) => v.id === mouseDownInfo.current.id);
        f.offsetX = f.oldOffsetX + mouseDownInfo.current.deltaX;
        f.offsetY = f.oldOffsetY + mouseDownInfo.current.deltaY;

        return [...p];
      });
    });

    window.addEventListener("mouseup", (e) => {
      if (mouseDownInfo.current.startX !== undefined) {
        mouseDownInfo.current = {};
      }
    });
  }

  function fromNodes(nodes) {
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

  function updateLabel(pos) {
    const [textX, textY] = pos;

    const smallTextSize =
      (groupsRef.current.groups[0].height * SPREAD_1_2) / 15;
    const largeTextSize =
      (groupsRef.current.groups[0].height * SPREAD_1_2) / 10;

    d3.select("#compare-group")
      .select("#member-label")
      .text("scenario")
      .attr("font-size", smallTextSize)
      .transition()
      .duration(100)
      .attr("x", textX)
      .attr("y", textY - smallTextSize * 1.5);

    d3.select("#compare-group")
      .select("#member-variable")
      .attr("font-size", largeTextSize)
      .text(activeMinidrop.key.slice(4))
      .transition()
      .duration(100)
      .attr("x", textX)
      .attr("y", textY);
  }

  function updateScenIndicators(positions, lines) {
    d3.select("#compare-group")
      .selectAll(".circlet")
      .data(positions)
      .join("circle")
      .attr("class", "circlet")
      .call(circlet)
      .attr("display", "initial")
      .attr("r", LOD_1_RAD_PX * 1.5)
      .transition()
      .duration(100)
      .attr("cx", (d) => d[0])
      .attr("cy", (d) => d[1]);

    d3.select("#compare-group")
      .selectAll(".comp-line")
      .data(lines)
      .join("path")
      .attr("class", "comp-line")
      .transition()
      .duration(100)
      .attr("d", (d) => d3.line()(d));
  }

  function getIdealGroupPos([x, y], [centerX, centerY]) {
    let newX = x,
      newY = y;

    const correctionX = groupsRef.current.groups[0].height * 2;

    if (newX < centerX) newX -= correctionX;
    else newX += correctionX;

    return [newX, newY, newX < centerX];
  }

  function onPanelDragStart(e, id) {
    if (e.target.className === "") return; // we're clicking the razor, disregard

    mouseDownInfo.current = { startX: e.clientX, startY: e.clientY, id };

    setPanels((p) => {
      const f = p.find((v) => v.id === id);

      f.oldOffsetX = f.offsetX;
      f.oldOffsetY = f.offsetY;

      return [...p];
    });
  }

  function getStyle(x, y, offsetX, offsetY) {
    return {
      left: `${x * camera.curTransform.k + camera.curTransform.x + offsetX}px`,
      top: `${y * camera.curTransform.k + camera.curTransform.y + offsetY}px`,
    };
  }

  return (
    <>
      {activeMinidrop && (
        <SceneSettings
          settings={deserialize(activeMinidrop.key.slice(4))}
          setColorSetting={setColorSetting}
        />
      )}
      {panels.map(({ x, y, id, isLeft, offsetX, offsetY, nodeID }, i) => (
        <div
          className={"panel compare-panel" + (isLeft ? " left" : "")}
          key={i}
          style={getStyle(x, y, offsetX, offsetY)}
          onMouseDown={(e) => onPanelDragStart(e, id)}
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

function SceneSettings({ settings, setColorSetting }) {
  return (
    <div className="scen-settings comp-settings">
      {settings.map((v, i) => (
        <div
          className="full-card"
          onMouseEnter={() => setColorSetting(i)}
          onMouseLeave={() => setColorSetting(null)}
          key={i}
        >
          <span>{SETT_NAME_FULL[i]}</span>
          <span>{SETT_VAL_STEPS[i][v]}</span>
          <div className="sett-dot-wrapper">
            {d3.range(SETT_VAL_STEPS[i].length).map((j) => (
              <span
                className={`sett-dot ${j <= v ? "filled" : "not-filled"}`}
                key={j}
                style={{ opacity: (j + 1) / SETT_VAL_STEPS[i].length }}
              ></span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
