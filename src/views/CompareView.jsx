import { AppContext } from "AppContext";
import { interpolateWatercolorBlue } from "bucket-lib/utils";
import DotHistogram from "components/DotHistogram";
import * as d3 from "d3";
import { FLATTENED_DATA } from "data/objectives-data";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  LOD_1_RAD_PX,
  LOD_1_LEVELS,
  LOD_1_SMALL_DROP_PAD_FACTOR,
  LOD_2_SMALL_DROP_PAD_FACTOR,
} from "settings";
import { clipEnds, dropCenterCorrection } from "utils/math-utils";
import { isState } from "utils/misc-utils";
import { DROPLET_SHAPE, circlet } from "utils/render-utils";

const SPREAD = LOD_2_SMALL_DROP_PAD_FACTOR / LOD_1_SMALL_DROP_PAD_FACTOR;

export default function CompareView() {
  const {
    state,
    setState,
    setGoBack,
    resetCamera,
    activeWaterdrops,
    waterdrops,
    camera,
    goal,
    setGoal,
    addZoomHandler,
  } = useContext(AppContext);

  const [activeMinidrop, setActiveMinidrop] = useState();
  const groupsRef = useRef();
  const [panels, setPanels] = useState([]);
  const centerRef = useRef();
  const [cameraChangeFlag, setCameraChangeFlag] = useState(false);
  const mouseDownInfo = useRef({});

  function addDetailPanel(dropId) {
    const { globalX, globalY, x, y, id, key } = waterdrops.nodes[dropId];
    setPanels((p) => {
      const newPanel = {
        text: key,
        x: globalX + x * (SPREAD - 1),
        y: globalY + y * (SPREAD - 1),
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
      p.splice(
        p.findIndex((v) => v.id === id),
        1
      );

      return [...p];
    });
  }

  useEffect(function initialize() {
    d3.select("#mosaic-svg")
      .select(".svg-trans")
      .append("g")
      .attr("id", "compare-group");

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

  function getIdealGroupPos([x, y], [centerX, centerY]) {
    let newX = x,
      newY = y;

    const correctionX = groupsRef.current.groups[0].height;

    if (newX < centerX) newX -= correctionX;
    else newX += correctionX;

    return [newX, newY, newX < centerX];
  }

  useEffect(
    function updateCirclets() {
      if (activeMinidrop) {
        const [positions, lines, nodes] = calcLinesAndPositions(
          groupsRef.current,
          activeMinidrop
        );

        setPanels((p) => {
          return nodes.map((n, i) => {
            let ox = 0,
              oy = 0;

            if (p[i]) {
              ox = p[i].offsetX;
              oy = p[i].offsetY;
            }

            const pos = getIdealGroupPos(
              groupsRef.current.groupPositions[i],
              centerRef.current
            );
            return {
              text: n.key,
              x: pos[0],
              y: pos[1],
              id: n.id,
              isLeft: pos[2],
              offsetX: ox,
              offsetY: oy,
            };
          });
        });

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
          .attr("stroke", "orange")
          .attr("stroke-dasharray", 3)
          .attr("opacity", 0.5)
          .attr("stroke-width", 1)
          .attr("vector-effect", "non-scaling-stroke")
          .transition()
          .duration(100)
          .attr("d", (d) => d3.line()(d));
      }
    },
    [activeMinidrop]
  );

  useEffect(
    function enterState() {
      if (isState(state, "CompareView")) {
        const container = d3.select("#compare-group");

        updateDropsSVG(
          container,
          (groupsRef.current = getWaterdropGroups(
            activeWaterdrops,
            waterdrops,
            (centerRef.current = state.avgCoord)
          )),
          state.transitionDuration / 5,
          {
            onHover: (d) => {
              setActiveMinidrop(d.key);
            },
          }
        );

        setTimeout(() => {
          setActiveMinidrop(groupsRef.current.groups[0].nodes[0].key);
        }, state.transitionDuration + 500);

        setGoBack(() => () => {
          setState({ state: "WideView" });

          resetCamera();
        });

        return function exitState() {
          container.selectAll(".large-drop").remove();
          container.selectAll(".circlet").remove();
          container.selectAll(".comp-line").remove();
          setPanels([]);
          setGoBack(null);
        };
      }
    },
    [state]
  );

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

  return (
    <>
      {panels.map(({ x, y, id, isLeft, offsetX, offsetY }, i) => (
        <div
          className={"panel compare-panel" + (isLeft ? " left" : "")}
          key={i}
          style={{
            left: `${
              x * camera.curTransform.k + camera.curTransform.x + offsetX
            }px`,
            top: `${
              y * camera.curTransform.k + camera.curTransform.y + offsetY
            }px`,
          }}
          onMouseDown={(e) => onPanelDragStart(e, id)}
        >
          <DotHistogram
            width={300}
            height={200}
            data={FLATTENED_DATA[id].deliveries}
            goal={goal}
            setGoal={setGoal}
          />
        </div>
      ))}
    </>
  );
}

function getWaterdropGroups(keyArr, waterdrops, center) {
  const groups = waterdrops.groups.filter((g) => keyArr.includes(g.key));

  const groupPositions = [];
  const rad = groups[0].height * SPREAD * 0.75;

  for (let i = 0, n = groups.length; i < n; i++) {
    groupPositions.push([
      center[0] + Math.cos(((Math.PI * 2) / n) * i) * rad,
      center[1] + Math.sin(((Math.PI * 2) / n) * i) * rad,
    ]);
  }

  return {
    groups,
    groupPositions,
  };
}

function updateDropsSVG(
  container,
  waterdropGroups,
  transitionDelay,
  { onClick, onHover, onUnhover }
) {
  container
    .selectAll(".large-drop")
    .data(waterdropGroups.groups)
    .join((enter) => {
      return enter
        .append("g")
        .attr("class", "large-drop")
        .each(function ({ nodes }) {
          d3.select(this)
            .selectAll(".small-drop")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", "small-drop")
            .each(function ({ levs }) {
              const s = d3.select(this);
              s.append("rect")
                .attr("class", "bbox")
                .style("visibility", "hidden");

              const randId = Math.floor(Math.random() * 1e9);

              const stops = d3
                .select(this)
                .append("defs")
                .append("linearGradient")
                .attr("id", `${randId}`)
                .attr("x1", "0%")
                .attr("x2", "0%")
                .attr("y1", "0%")
                .attr("y2", "100%");
              stops.append("stop").attr("stop-color", "transparent");
              stops.append("stop").attr("stop-color", "transparent");

              levs.forEach((_, i) => {
                stops
                  .append("stop")
                  .attr(
                    "stop-color",
                    interpolateWatercolorBlue(i / LOD_1_LEVELS)
                  );
                stops
                  .append("stop")
                  .attr(
                    "stop-color",
                    interpolateWatercolorBlue(i / LOD_1_LEVELS)
                  );
              });

              s.append("path")
                .attr("d", DROPLET_SHAPE)
                .attr("class", "outline")
                .attr("fill", "none")
                .attr("stroke", "lightgray")
                .attr("stroke-width", 0.05);

              s.append("path")
                .attr("class", "fill")
                .attr("d", DROPLET_SHAPE)
                .attr("fill", `url(#${randId})`);
            });
        });
    })
    .attr("display", "initial")
    .attr("transform", ({ x, y }, i) => `translate(${x}, ${y})`)
    .each(function ({ nodes }) {
      d3.select(this)
        .selectAll(".small-drop")
        .data(nodes)
        .attr("display", "initial")
        .attr("transform", ({ x, y }) => `translate(${x}, ${y})`)
        .on("click", function (e, d) {
          onClick && onClick(d);
        })
        .on("mouseenter", function (e, d) {
          onHover && onHover(d);
        })
        .on("mouseleave", function (e, d) {
          onUnhover && onUnhover(d);
        })
        .each(function ({ levs, maxLev }, i) {
          const s = d3.select(this);

          s.select(".outline").attr(
            "transform",
            `scale(${LOD_1_RAD_PX * 0.95})`
          );
          s.select(".fill").attr("transform", `scale(${LOD_1_RAD_PX})`);

          s.selectAll("stop").each(function (_, i) {
            let actI = Math.floor(i / 2);
            const isEnd = i % 2;

            if (isEnd === 0) actI -= 1;

            if (actI === -1) {
              d3.select(this).attr("offset", `${0}%`);
            } else if (actI === levs.length) {
              d3.select(this).attr("offset", `100%`);
            } else {
              d3.select(this).attr(
                "offset",
                `${(1 - levs[actI] / maxLev) * 100}%`
              );
            }
          });

          const d = s.select(".fill");

          s.select(".bbox")
            .attr("x", d.node().getBBox().x)
            .attr("y", d.node().getBBox().y)
            .attr("width", d.node().getBBox().width)
            .attr("height", d.node().getBBox().height);
        })
        .transition()
        .delay(transitionDelay)
        .duration(1000)
        .attr(
          "transform",
          ({ x, y }) => `translate(${x * SPREAD}, ${y * SPREAD})`
        );
    })
    .transition()
    .delay(transitionDelay)
    .duration(1000)
    .attr(
      "transform",
      (_, i) =>
        `translate(${waterdropGroups.groupPositions[i][0]}, ${waterdropGroups.groupPositions[i][1]})`
    );
}

function calcLinesAndPositions(groupsObj, activeMinidrop) {
  const positions = [];
  const nodes = [];
  for (let i = 0; i < groupsObj.groups.length; i++) {
    const group = groupsObj.groups[i];
    const groupPos = groupsObj.groupPositions[i];

    const node = group.nodes.find((n) => n.key === activeMinidrop);

    nodes.push(node);

    positions.push([
      node.x * SPREAD + groupPos[0],
      node.y * SPREAD +
        groupPos[1] -
        dropCenterCorrection({ rad: LOD_1_RAD_PX }),
    ]);
  }

  const lines = [];

  for (let i = 0; i < positions.length; i++) {
    const from = Array.from(positions[i]),
      to = Array.from(positions[i + 1 == positions.length ? 0 : i + 1]);

    clipEnds([from, to], LOD_1_RAD_PX * 2);

    lines.push([from, to]);
  }

  return [positions, lines, nodes];
}
