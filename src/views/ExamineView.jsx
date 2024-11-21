import * as d3 from "d3";
import React, { useContext, useEffect, useRef, useState } from "react";

import { AppContext } from "AppContext";
import DotHistogram from "components/DotHistogram";
import SceneSettingSubcard from "components/SceneSettingSubcard";
import { objectivesData } from "data/objectives-data";
import { settings } from "settings";

import { arrRemove, isState } from "utils/misc-utils";
import {
  generateTSpan,
  hideElems,
  removeElems,
  showElems,
} from "utils/render-utils";
import { createInterpsFromDelivs, deserialize } from "utils/data-utils";
import { clipEnds } from "utils/math-utils";
import { helpers } from "utils/examineview-helpers";
import { useDragPanels } from "hooks/useDragPanels";
import DropletGlyph from "components/DropletGlyph";
import { ConnectLine } from "components/ConnectLine";

export default function ExamineView() {
  const appCtx = useContext(AppContext);

  const activeMinidropsRef = useRef([]);
  const curMinidropsRef = useRef(null);

  const [colorSetting, setColorSetting] = useState(null);
  const [camTransform, setCamTransform] = useState(d3.zoomIdentity);
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

    svgGroup
      .append("circle")
      .attr("class", "highlight-circle")
      .attr("opacity", 0);

    svgGroup
      .append("g")
      .attr("class", "baseline-pointer")
      .call(function (s) {
        s.append("path");
        s.append("text").text("baseline");
      })
      .attr("opacity", 0);

    svgGroup
      .append("text")
      .attr("class", "instruction-text large-green-text fancy-font");
    svgGroup.append("text").attr("class", "drop-label fancy-font");

    appCtx.addZoomHandler(function (transform) {
      setCamTransform(transform);
    });
  }, []);

  useEffect(
    function enterState() {
      if (isState(appCtx.state, "ExamineView")) {
        const { transitionDuration = 0 } = appCtx.state;
        const container = d3.select("#examine-group");
        curMinidropsRef.current = appCtx.waterdrops.groups.find(
          (g) => g.key === appCtx.activeWaterdrops[0]
        );

        helpers.updateSmallDropSVG(
          container,
          curMinidropsRef.current,
          transitionDuration / 2,
          {
            onClick: updateActiveMinidrops,
            onHover: hoverDrop,
            onUnhover: unhoverDrop,
          }
        );

        setTimeout(showAdditionalInfo, transitionDuration * 1.2);

        appCtx.setGoBack(() => () => {
          const transitionDuration = appCtx.resetCamera();

          appCtx.setState({ state: "WideView", transitionDuration });
        });

        setCamTransform(appCtx.camera.curTransform);
        showElems("#examine-group");

        return function exitState() {
          removeElems(".small-drop, .circlet", container);
          hideElems("#examine-group");
          d3.selectAll(
            "#examine-group .instruction-text, #examine-group .drop-label, #examine-group .highlight-circle, #examine-group .baseline-pointer"
          ).attr("opacity", 0);

          setPanels([]);
          activeMinidropsRef.current = [];
          curMinidropsRef.current = null;
          appCtx.setGoBack(null);
        };
      }
    },
    [appCtx.state]
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
        return objectivesData.KEY_SETTINGS_MAP[key][colorSetting];
      };

      const colors = ["red", "orange", "blue", "green", "magenta"];

      helpers.updateColorDrops(
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

  function showAdditionalInfo() {
    const instrFontSize =
      (curMinidropsRef.current.height * settings.SPREAD_1_2) / 20;

    d3.select("#examine-group .instruction-text")
      .attr(
        "x",
        curMinidropsRef.current.x -
          curMinidropsRef.current.height * settings.SPREAD_1_2 * 0.8
      )
      .attr("y", curMinidropsRef.current.y - instrFontSize)
      .attr("opacity", 0)
      .attr("text-anchor", "end")
      .attr("font-size", instrFontSize)
      .call(
        generateTSpan(
          ["click to keep panels open.", "you can drag panels."],
          1.6
        )
      )
      .call((s) => {
        s.transition().attr("opacity", 1);
      })
      .selectAll("tspan")
      .each(function (_, i) {
        d3.select(this).attr("dx", i * instrFontSize);
      });

    const labelFontSize =
      (curMinidropsRef.current.height * settings.SPREAD_1_2) / 15;

    d3.select("#examine-group .drop-label")
      .attr("x", curMinidropsRef.current.x)
      .attr(
        "y",
        curMinidropsRef.current.y +
          (curMinidropsRef.current.height / 2) * settings.SPREAD_1_2 * 0.9
      )
      .attr("opacity", 0)
      .attr("text-anchor", "middle")
      .attr("font-size", labelFontSize)
      .call(generateTSpan(curMinidropsRef.current.display_name, 1.2, 30))
      .transition()
      .attr("opacity", 1);

    d3.selectAll(
      "#examine-group .highlight-circle, #examine-group .baseline-pointer"
    )
      .attr("opacity", 0)
      .transition()
      .attr("opacity", 1);
  }

  function addDetailPanel(dropId, preview = false, forceReplace = false) {
    const { x: groupX, y: groupY } = curMinidropsRef.current;
    const { x, y, id, key } = appCtx.waterdrops.nodes[dropId];
    setPanels((p) => {
      if (p.findIndex(({ id: pid }) => id === pid) !== -1) {
        if (!forceReplace) return p;

        arrRemove(p, (_p) => _p.id === id);
      }
      const newPanel = {
        text: key.slice(4),
        x: groupX + x * settings.SPREAD_1_2,
        y: groupY + y * settings.SPREAD_1_2,
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
      container.select(`.circlet#i${d.id}`).classed("active", false);
      removeDetailPanel(d.id);
      setHoveredCard(null);
    } else {
      removeDetailPanel(d.id);
      activeMinidropsRef.current.push(d.id);
      container.select(`.circlet#i${d.id}`).classed("active", true);
      addDetailPanel(d.id);
      setHoveredCard(d.id);
    }
  }

  function hoverDrop(d) {
    if (activeMinidropsRef.current.includes(d.id)) {
      d3.select(`.examine-panel#p${d.id}`).style("z-index", 100);
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
    d3.select(`.examine-panel#p${d.id}`).style("z-index", 0);
  }

  function drawLineConnect(id) {
    if (panelsRef.current.findIndex(({ id: pid }) => id === pid) === -1) return;

    const { x: circleX, y: circleY } = panelsRef.current.find(
      (p) => p.id === id
    );

    const [cx, cy] = appCtx.camera.worldToScreen(circleX, circleY);

    const panelBox = d3
      .select(`.examine-panel#p${id}`)
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

  if (isState(appCtx.state, "ExamineView")) {
    return (
      <>
        {panels.map(
          ({ text, x, y, id, offsetX, offsetY, panelKey, preview }) => {
            const { objective, scenario } = objectivesData.FLATTENED_DATA[id];
            const delivs = objectivesData.FLATTENED_DATA[id].deliveries;

            const [delivMin, delivMax] = objectivesData.MIN_MAXES[objective];
            const interper = createInterpsFromDelivs(
              delivs,
              delivMin,
              delivMax
            );

            return (
              <div
                className={`panel examine-panel ${preview ? "preview" : ""}`}
                id={`p${id}`}
                key={preview ? -1 : id}
                style={getPanelStyle({ x, y, offsetX, offsetY })}
                onMouseDown={(e) => !preview && onPanelDragStart(e, { id })}
                onMouseEnter={() => !preview && hoverDrop({ id })}
                onMouseLeave={() => !preview && unhoverDrop({ id })}
              >
                <div className="panel-tab">
                  scenario <span>{text}</span>
                </div>
                <div className="panel-main-container">
                  <DotHistogram
                    width={480}
                    height={320}
                    data={delivs}
                    range={[delivMin, delivMax]}
                    goal={appCtx.goals[appCtx.activeWaterdrops[0]]}
                    setGoal={(newGoal) => {
                      appCtx.setGoals((g) => {
                        g[appCtx.activeWaterdrops[0]] = newGoal;
                        return { ...g };
                      });
                    }}
                  />
                  <DropletGlyph
                    levelInterp={interper}
                    height={200}
                    resolution={4}
                  />
                </div>
                <SceneSettingSubcard
                  settings={deserialize(text)}
                  setColorSetting={setColorSetting}
                />
              </div>
            );
          }
        )}
        {hoveredCard && (
          <ConnectLine connectLine={drawLineConnect(hoveredCard)} />
        )}
      </>
    );
  }
}
