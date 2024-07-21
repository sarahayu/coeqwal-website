import * as d3 from "d3";
import React, { useContext, useEffect, useRef, useState } from "react";

import { AppContext } from "AppContext";

import { interpolateWatercolorBlue } from "bucket-lib/utils";
import {
  LOD_1_LEVELS,
  LOD_1_RAD_PX,
  LOD_1_SMALL_DROP_PAD_FACTOR,
  LOD_2_SMALL_DROP_PAD_FACTOR,
} from "settings";
import { isState, useStateRef } from "utils/misc-utils";
import { DROPLET_SHAPE, circlet } from "utils/render-utils";
import { FLATTENED_DATA } from "data/objectives-data";
import DotHistogram from "components/DotHistogram";
import { dropCenterCorrection } from "utils/math-utils";

const SPREAD = LOD_2_SMALL_DROP_PAD_FACTOR / LOD_1_SMALL_DROP_PAD_FACTOR;

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
    goal,
    setGoal,
  } = useContext(AppContext);

  const [activeMinidrops, setActiveMinidrops, activeMinidropsRef] = useStateRef(
    []
  );
  const [previewMinidrop, setPreviewMinidrop, previewMinidropRef] =
    useStateRef(null);
  const [panels, setPanels] = useState([]);
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

        updateSmallDropSVG(
          container,
          waterdrops.groups.find((g) => g.key === activeWaterdrops[0]).nodes,
          transitionDelay / 2,
          {
            onClick: (d) => {
              setActiveMinidrops((wd) => {
                if (wd.includes(d.id)) {
                  wd.splice(wd.indexOf(d.id), 1);
                  container
                    .select(".circlet.i" + d.id)
                    .classed("active", false);

                  removeDetailPanel(d.id);
                } else {
                  wd.push(d.id);
                  container.select(".circlet.i" + d.id).classed("active", true);

                  addDetailPanel(d.id);
                }
                return [...wd];
              });
            },
            onHover: (d) => {
              if (!activeMinidropsRef.current.includes(d.id)) {
                setPreviewMinidrop(d.id);
                addDetailPanel(d.id);
              }
            },
            onUnhover: (d) => {
              if (previewMinidropRef.current === d.id) {
                setPreviewMinidrop(null);
                removeDetailPanel(d.id);
              }
            },
          }
        );

        setGoBack(() => () => {
          setState({ state: "WideView" });

          resetCamera();
        });

        return function exitState() {
          container.selectAll(".small-drop").attr("display", "none");

          container
            .selectAll(".circlet")
            .classed("active", false)
            .select("circle")
            .attr("display", "none");
          setPanels([]);
          setActiveMinidrops([]);
          setPreviewMinidrop(null);
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
      {panels.map(({ x, y, id, offsetX, offsetY }) => (
        <div
          className="panel"
          key={id}
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

function updateSmallDropSVG(
  container,
  waterdrops,
  transitionDelay,
  { onClick, onHover, onUnhover }
) {
  container
    .selectAll(".small-drop")
    .data(waterdrops)
    .join((enter) => {
      return enter
        .append("g")
        .attr("class", "small-drop")
        .each(function ({ levs }, i) {
          // TODO replace with tooltip, remove unnec svg

          const s = d3.select(this);
          s.append("rect").attr("class", "bbox").style("visibility", "hidden");

          const stops = d3
            .select(this)
            .append("defs")
            .append("linearGradient")
            .attr("id", `drop-fill-${i}`)
            .attr("x1", "0%")
            .attr("x2", "0%")
            .attr("y1", "0%")
            .attr("y2", "100%");
          stops.append("stop").attr("stop-color", "transparent");
          stops.append("stop").attr("stop-color", "transparent");

          levs.forEach((_, i) => {
            stops
              .append("stop")
              .attr("stop-color", interpolateWatercolorBlue(i / LOD_1_LEVELS));
            stops
              .append("stop")
              .attr("stop-color", interpolateWatercolorBlue(i / LOD_1_LEVELS));
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
            .attr("fill", `url(#drop-fill-${i})`);

          s.append("g")
            .attr("class", "circlet")
            .append("circle")
            .call(circlet)
            .attr("display", "none")
            .attr("cy", -dropCenterCorrection({ rad: 1 }))
            .attr("r", 1.5);
        });
    })
    .attr("display", "initial")
    .attr(
      "transform",
      ({ globalX, globalY }) => `translate(${globalX}, ${globalY})`
    )
    .each(function ({ levs, maxLev, key, id }, i) {
      const s = d3.select(this);

      s.select(".outline").attr("transform", `scale(${LOD_1_RAD_PX * 0.95})`);
      s.select(".fill").attr("transform", `scale(${LOD_1_RAD_PX})`);

      s.select(".circlet")
        .attr("class", null)
        .attr("class", "circlet i" + id);

      s.selectAll("stop").each(function (_, i) {
        let actI = Math.floor(i / 2);
        const isEnd = i % 2;

        if (isEnd === 0) actI -= 1;

        if (actI === -1) {
          d3.select(this).attr("offset", `${0}%`);
        } else if (actI === levs.length) {
          d3.select(this).attr("offset", `100%`);
        } else {
          d3.select(this).attr("offset", `${(1 - levs[actI] / maxLev) * 100}%`);
        }
      });

      const d = s.select(".fill");

      s.select(".bbox")
        .attr("x", d.node().getBBox().x)
        .attr("y", d.node().getBBox().y)
        .attr("width", d.node().getBBox().width)
        .attr("height", d.node().getBBox().height);
    })
    .on("click", function (_, d) {
      onClick && onClick(d);
    })
    .on("mouseenter", function (_, d) {
      if (!d3.select(this).select(".circlet").classed("active"))
        d3.select(this).select("circle").attr("display", "initial");
      onHover && onHover(d);
    })
    .on("mouseleave", function (_, d) {
      if (!d3.select(this).select(".circlet").classed("active"))
        d3.select(this).select("circle").attr("display", "none");
      onUnhover && onUnhover(d);
    })
    .transition()
    .delay(transitionDelay)
    .duration(1000)
    .attr(
      "transform",
      ({ globalX, globalY, x, y }) =>
        `translate(${globalX + x * (SPREAD - 1)}, ${
          globalY + y * (SPREAD - 1)
        }) rotate(${0})`
    );
}
