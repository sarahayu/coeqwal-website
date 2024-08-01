import * as d3 from "d3";
import React, { useContext, useEffect, useRef, useState } from "react";

import { AppContext } from "AppContext";
import DotHistogram from "components/DotHistogram";
import { FLATTENED_DATA } from "data/objectives-data";
import { SPREAD_1_2 } from "settings";

import { DESCRIPTIONS_DATA } from "data/descriptions-data";
import { updateSmallDropSVG } from "utils/examineview-utils";
import { arrRemove, isState } from "utils/misc-utils";
import { removeElems } from "utils/render-utils";

const NUM_OPTS = {
  demand: 5,
  carryover: 3,
  priority: 2,
  regs: 4,
  minflow: 5,
};

function deserialize(scenStr) {
  let scenNum = parseInt(scenStr);

  const minflow = scenNum % NUM_OPTS.minflow;
  scenNum = (scenNum - minflow) / NUM_OPTS.minflow;

  const regs = scenNum % NUM_OPTS.regs;
  scenNum = (scenNum - regs) / NUM_OPTS.regs;

  const priority = scenNum % NUM_OPTS.priority;
  scenNum = (scenNum - priority) / NUM_OPTS.priority;

  const carryover = scenNum % NUM_OPTS.carryover;
  scenNum = (scenNum - carryover) / NUM_OPTS.carryover;

  const demand = scenNum % NUM_OPTS.demand;
  scenNum = (scenNum - demand) / NUM_OPTS.demand;

  return [demand, carryover, priority, regs, minflow];
}

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
  const [panels, setPanels] = useState([]);

  const [cameraChangeFlag, setCameraChangeFlag] = useState(false);

  const mouseDownInfo = useRef({});

  useEffect(function initialize() {
    d3.select("#mosaic-svg")
      .select(".svg-trans")
      .append("g")
      .attr("id", "examine-group");

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
      if (mouseDownInfo.current.startX === undefined) return;

      mouseDownInfo.current = {};
    });
  }, []);

  useEffect(
    function enterState() {
      if (isState(state, "ExamineView")) {
        const transitionDelay = state.transitionDuration;
        const container = d3.select("#examine-group");
        const minidrops = waterdrops.groups.find(
          (g) => g.key === activeWaterdrops[0]
        );

        updateSmallDropSVG(container, minidrops, transitionDelay / 2, {
          onClick: updateActiveMinidrops,
          onHover: hoverDrop,
          onUnhover: unhoverDrop,
        });

        setGoBack(() => () => {
          setState({ state: "WideView" });

          resetCamera();
        });

        return function exitState() {
          removeElems(".small-drop, .circlet", container);

          setPanels([]);
          activeMinidropsRef.current = [];
          previewMinidropRef.current = null;
          setGoBack(null);
        };
      }
    },
    [state]
  );

  function addDetailPanel(dropId) {
    const { globalX, globalY, x, y, id, key } = waterdrops.nodes[dropId];
    setPanels((p) => {
      const newPanel = {
        text: key.slice(4),
        x: globalX + x * (SPREAD_1_2 - 1),
        y: globalY + y * (SPREAD_1_2 - 1),
        offsetX: 20,
        offsetY: 40,
        id,
      };

      return [...p, newPanel];
    });
  }

  function removeDetailPanel(dropId) {
    const { id } = waterdrops.nodes[dropId];
    setPanels((p) => {
      arrRemove(p, id);

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
      removeDetailPanel(d.id);
    }
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
            style={getStyle(x, y, offsetX, offsetY)}
            onMouseDown={(e) => onPanelDragStart(e, id)}
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
            <SceneSettings settings={deserialize(text)} />
          </div>
        ))}
      </>
    );
  }
}

const ABBREVS = ["D", "C", "P", "R", "M"];
const FULLS = ["Demand", "Carryover", "Priority", "Regs.", "Min. Flow"];
const VAL_STEPS = [
  [1, 0.9, 0.8, 0.7, 0.6], // demand
  [1.0, 1.2, 1.3], // carryover
  [0, 1], // priority
  [1, 2, 3, 4], // regs
  [0, 0.4, 0.6, 0.7, 0.8], // minflow
];

function SceneSettings({ settings }) {
  return (
    <div className="scen-settings">
      <div className="condense">
        {settings.map((s, i) => (
          <div className="sett-dot-wrapper" key={i}>
            <span>{ABBREVS[i]}</span>
            {d3.range(s + 1).map((i) => (
              <span className="sett-dot" key={i}></span>
            ))}
          </div>
        ))}
      </div>
      <div className="full">
        <div className="full-container">
          <span>The settings for this scenario are:</span>
          {settings.map((v, i) => (
            <div className="full-card" key={i}>
              <span>{FULLS[i]}</span>
              <span>{VAL_STEPS[i][v]}</span>
              <div className="sett-dot-wrapper">
                {d3.range(v + 1).map((i) => (
                  <span className="sett-dot" key={i}></span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
