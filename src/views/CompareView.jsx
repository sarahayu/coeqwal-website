import * as d3 from "d3";
import React, { useContext, useEffect, useRef, useState } from "react";

import { AppContext } from "AppContext";
import DotHistogram from "components/DotHistogram";
import SceneSettingStickers from "components/SceneSettingStickers";
import { objectivesData } from "data/objectives-data";
import { settings } from "settings";

import { avgCoords } from "utils/math-utils";
import { isState } from "utils/misc-utils";
import { hideElems, removeElems, showElems } from "utils/render-utils";
import { createInterpsFromDelivs, deserialize } from "utils/data-utils";
import { helpers } from "utils/compareview-helpers";
import { useDragPanels } from "hooks/useDragPanels";
import DropletGlyph from "components/DropletGlyph";
import BottleGlyph from "components/BottleGlyph";

export default function CompareView() {
  const appCtx = useContext(AppContext);

  const [activeMinidrop, setActiveMinidrop] = useState();
  const [colorSetting, setColorSetting] = useState(null);
  const [camTransform, setCamTransform] = useState(d3.zoomIdentity);
  const { panels, setPanels, onPanelDragStart, getPanelStyle } =
    useDragPanels(camTransform);

  const groupsRef = useRef();
  const centerRef = useRef();

  const getScreenDropHeight = () =>
    groupsRef.current.groups[0].height * settings.SPREAD_1_2;

  useEffect(function initialize() {
    const container = d3
      .select("#mosaic-svg")
      .select(".svg-trans")
      .append("g")
      .attr("id", "compare-group");

    container.append("text").attr("id", "member-variable");
    container.append("text").attr("id", "member-label");

    appCtx.addZoomHandler(function (transform) {
      setCamTransform(transform);
    });
  }, []);

  useEffect(
    function enterState() {
      if (isState(appCtx.state, "CompareView")) {
        const container = d3.select("#compare-group");

        const { viewCenter, transitionDuration = 0 } = appCtx.state;

        centerRef.current = viewCenter;

        groupsRef.current = helpers.getWaterdropGroups(
          appCtx.activeWaterdrops,
          appCtx.waterdrops,
          viewCenter
        );

        helpers.updateDropsSVG(
          container,
          groupsRef.current,
          transitionDuration / 5,
          {
            onHover: (d) => {
              setActiveMinidrop({ key: d.key });
            },
          }
        );

        hideElems(
          ".large-green-text, .baseline-pointer, .circlet, .comp-line, .highlight-circle",
          container
        );

        setTimeout(() => {
          setActiveMinidrop({ key: groupsRef.current.groups[0].nodes[0].key });
          showElems(
            "#member-variable, #member-label, .large-green-text, .baseline-pointer, .circlet, .comp-line, .highlight-circle",
            container
          );
          showElems(".comp-settings", d3, "flex");
        }, transitionDuration + 500);

        appCtx.setGoBack(() => () => {
          const transitionDuration = appCtx.resetCamera();

          appCtx.setState({ state: "WideView", transitionDuration });
        });

        setCamTransform(appCtx.camera.curTransform);

        return function exitState() {
          removeElems(".large-drop, .circlet, .comp-line", container);

          hideElems(
            "#member-variable, #member-label, .baseline-pointer",
            container
          );
          hideElems(".comp-settings");

          setPanels([]);
          appCtx.setGoBack(null);
        };
      }
    },
    [appCtx.state]
  );

  useEffect(
    function updateCirclets() {
      if (activeMinidrop) {
        const [positions, lines, nodes] = helpers.calcLinesAndPositions(
          groupsRef.current,
          activeMinidrop.key
        );

        setPanels(makePanelsFromNodes(nodes));
        helpers.updateLabelSVG(
          avgCoords(positions),
          activeMinidrop.key.slice(4),
          getScreenDropHeight()
        );
        helpers.updateScenIndicatorsSVG(positions, lines);
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
        return objectivesData.KEY_SETTINGS_MAP[key][colorSetting];
      };

      const colors = ["red", "orange", "blue", "green", "magenta"];

      helpers.updateColorDrops(
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
          groupsRef.current.groupPositions[i]
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

  function getIdealGroupPos({ x, y, isLeft }) {
    let newX = x,
      newY = y;

    const correctionX =
      groupsRef.current.groups[0].height * settings.SPREAD_1_2;

    if (isLeft) newX -= correctionX;
    else newX += correctionX;

    return [newX, newY, isLeft];
  }

  return (
    <>
      {activeMinidrop && (
        <SceneSettingStickers
          settings={deserialize(activeMinidrop.key.slice(4))}
          setColorSetting={setColorSetting}
        />
      )}
      {panels.map(({ x, y, id, isLeft, offsetX, offsetY, nodeID }, i) => {
        const { objective } = objectivesData.FLATTENED_DATA[nodeID];
        const delivs = objectivesData.FLATTENED_DATA[nodeID].deliveries;

        const [delivMin, delivMax] = objectivesData.MIN_MAXES[objective];
        const interper = createInterpsFromDelivs(delivs, delivMin, delivMax);

        return (
          <div
            className={"panel compare-panel" + (isLeft ? " left" : " right")}
            key={i}
            style={getPanelStyle({ x, y, offsetX, offsetY })}
            onMouseDown={(e) => onPanelDragStart(e, { id })}
          >
            <div className="panel-main-container">
              <DotHistogram
                width={420}
                height={280}
                data={delivs}
                range={[delivMin, delivMax]}
                goal={appCtx.goals[id]}
                setGoal={(newGoal) => {
                  appCtx.setGoals((g) => {
                    g[id] = newGoal;
                    return { ...g };
                  });
                }}
              />
              <BottleGlyph levelInterp={interper} height={200} resolution={4} />
            </div>
          </div>
        );
      })}
    </>
  );
}
