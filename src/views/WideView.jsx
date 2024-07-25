import * as d3 from "d3";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { BiCross, BiNetworkChart } from "react-icons/bi";

import {
  GROUP_HOVER_AREA_FACTOR,
  LOD_1_SMALL_DROP_PAD_FACTOR,
  LOD_2_SMALL_DROP_PAD_FACTOR,
} from "settings";
import { AppContext } from "AppContext";
import { DESCRIPTIONS_DATA } from "data/descriptions-data";
import {
  CALIFORNIA_CENTER,
  CALIFORNIA_OUTLINE,
  SPATIAL_DATA,
  SPATIAL_FEATURES,
} from "data/spatial-data";
import { dropsMesh, scene } from "three-resources";

import {
  avgCoords,
  dist,
  dropCenterCorrection,
  getCenterDomRect,
} from "utils/math-utils";
import { isState, useStateRef, wrap } from "utils/misc-utils";
import { circlet } from "utils/render-utils";

const SPREAD = LOD_2_SMALL_DROP_PAD_FACTOR / LOD_1_SMALL_DROP_PAD_FACTOR;

export default function WideView() {
  const {
    waterdrops,
    state,
    setState,
    camera,
    zoomTo,
    setActiveWaterdrops,
    activeWaterdrops,
    setDisableCamAdjustments,
    getOutlineOpac,
    addZoomHandler,
  } = useContext(AppContext);

  const [activeWDObjs, setActiveWDObjs] = useState([]);
  const [enableZoom, setEnableZoom, enableZoomRef] = useStateRef(false);

  const [transformInfo, setTransformInfo] = useState({
    zoom: 1,
    mouseX: 0,
    mouseY: 0,
  });

  const [curInfo, setCurInfo] = useState(null);

  const getFontSize = (d, transformZoom) => {
    const MAX_RAD = window.innerHeight / 9;

    const zoomRel = ((1 / transformZoom) * camera.height) / waterdrops.height;

    const absFontSize = (_d) =>
      _d > MAX_RAD
        ? 0
        : d3.scaleLinear().domain([0, MAX_RAD]).range([1, 0.4]).clamp(true)(_d);

    return absFontSize(d * zoomRel) * Math.min(zoomRel, 0.4);
  };

  useEffect(function initialize() {
    d3.select("#mosaic-svg")
      .select(".svg-trans")
      .append("g")
      .attr("id", "wide-group");

    addZoomHandler(function (transform) {
      setTransformInfo((ti) => ({
        ...ti,
        zoom: transform.k,
      }));
    });

    const mouseListener = (e) => {
      setTransformInfo((ti) => ({
        ...ti,
        mouseX: e.x,
        mouseY: e.y,
      }));
    };

    window.addEventListener("mousemove", mouseListener);

    const mmWidth = 200,
      mmHeight = 250;

    const minimap = d3
      .select("#minimap")
      .attr("width", mmWidth)
      .attr("height", mmHeight);

    const mmProj = d3
      .geoMercator()
      .scale(1000)
      .center(CALIFORNIA_CENTER)
      .translate([mmWidth / 2, mmHeight / 2]);

    const lineGeom = [
      ...SPATIAL_DATA.features.filter(
        (f) => f.geometry.type === "MultiPolygon"
      ),
      CALIFORNIA_OUTLINE,
    ];
    const pointGeom = SPATIAL_DATA.features.filter(
      (f) => f.geometry.type === "MultiPoint"
    );

    minimap
      .selectAll("path")
      .data(lineGeom)
      .join("path")
      .attr("d", (d) => d3.geoPath().projection(mmProj)(d))
      .attr("class", (d) => "outline " + d.properties.CalLiteID)
      .attr("stroke", (d) =>
        d.properties.CalLiteID ? "transparent" : "lightgray"
      )
      .attr("stroke-width", 1)
      .attr("fill", "transparent");

    minimap
      .selectAll("circle")
      .data(pointGeom)
      .join("circle")
      .each(function (d) {
        const s = d3.select(this);

        const [x, y] = mmProj(d.geometry.coordinates[0]);

        s.attr("cx", x);
        s.attr("cy", y);
      })
      .attr("r", 2)
      .attr("class", (d) => "outline " + d.properties.CalLiteID)
      .attr("fill", "transparent");

    d3.select(".infobox").style("display", "none");

    return function cleanup() {
      window.removeEventListener("mousemove", mouseListener);
    };
  }, []);

  useEffect(
    function updateFontSizes() {
      d3.select(".infobox").attr("display", "none");

      if (!enableZoomRef.current) return;

      d3.select("#wide-group")
        .selectAll("text")
        .each(function () {
          const s = d3.select(this);
          const tNode = s.node();

          const [posx, posy] = getCenterDomRect(tNode.getBoundingClientRect());

          const width =
              ((tNode.getBBox().width * camera.height) / camera.far) * 8,
            height =
              ((tNode.getBBox().height * camera.height) / camera.far) * 10;

          const dis = dist(
            [posx, posy],
            [transformInfo.mouseX, transformInfo.mouseY]
          );

          s.attr("font-size", getFontSize(dis, transformInfo.zoom));

          d3.select(this.parentNode.parentNode)
            .select("image")
            .attr("x", -width / 2)
            .attr("y", -height / 2)
            .attr("width", width)
            .attr("height", height);
        });
    },
    [transformInfo]
  );

  useEffect(
    function enterState() {
      if (isState(state, "WideView")) {
        d3.select("body").style("overflow", "hidden");

        setEnableZoom(true);
        setTransformInfo((ti) => ({ ...ti, zoom: camera.curTransform.k }));

        console.time("drawing");
        dropsMesh.draw(scene);
        console.timeEnd("drawing");

        const origOpac = getOutlineOpac(camera.curTransform.k);

        dropsMesh.updateVisibility(1);
        dropsMesh.updateOutlineVisibility(origOpac);

        const container = d3.select("#wide-group");
        d3.select(".infobox").style("display", "initial");
        d3.select("#mosaic-webgl").style("display", "initial");
        d3.select("#mosaic-svg").style("display", "initial");

        updateLargeDropSVG(container, waterdrops, {
          onClick: (d) => {
            setActiveWDObjs((wd) => {
              const found = wd.findIndex((wd) => wd.key === d.key);
              if (found !== -1) {
                wd.splice(found, 1);
              } else {
                wd.push(d);
              }
              return [...wd];
            });

            setActiveWaterdrops((wd) => {
              if (wd.includes(d.key)) {
                wd.splice(wd.indexOf(d.key), 1);
                container.select(".circlet." + d.key).classed("active", false);
              } else {
                wd.push(d.key);
                container.select(".circlet." + d.key).classed("active", true);
              }
              return [...wd];
            });
          },
          onHover: (d) => {
            setCurInfo({
              id: d.key,
              description: DESCRIPTIONS_DATA[d.key].desc,
            });

            if (!SPATIAL_FEATURES[d.key]) return;

            d3.select("#minimap")
              .select(".outline." + d.key)
              .attr("fill", "gray");
          },
          onUnhover: (d) => {
            setCurInfo(null);

            if (!SPATIAL_FEATURES[d.key]) return;

            d3.select("#minimap")
              .select(".outline." + d.key)
              .attr("fill", "transparent");
          },
        });

        for (const wd of activeWDObjs) {
          container.select(".circlet." + wd.key).classed("active", true);
        }

        return function exitState() {
          d3.select("#wide-group")
            .selectAll(".large-drop")
            .attr("display", "none");
          d3.select(".infobox").style("display", "none");
          setEnableZoom(false);
        };
      }
    },
    [state]
  );

  const handleClick = useCallback(
    function () {
      if (activeWDObjs.length === 1) {
        const { x, y, height } = activeWDObjs[0];

        const { start, duration } = zoomTo(
          [
            x,
            y - dropCenterCorrection({ height }),
            camera.getZFromFarHeight(height * SPREAD * 1.5),
          ],
          () => {
            setDisableCamAdjustments(false);
          }
        );

        start();

        setState({ state: "ExamineView", transitionDuration: duration });

        const origOpac = getOutlineOpac(camera.curTransform.k);
        setDisableCamAdjustments(true);

        const t = d3.timer((elapsed) => {
          const et = Math.min(1, elapsed / (duration / 2));

          dropsMesh.updateVisibility(1 - et);
          dropsMesh.updateOutlineVisibility(origOpac * (1 - et));

          if (et >= 1) {
            t.stop();
            dropsMesh.remove(scene);
          }
        });
      } else if (activeWDObjs.length > 1) {
        const [avgX, avgY] = avgCoords(activeWDObjs.map((w) => [w.x, w.y]));

        const { start, duration } = zoomTo(
          [
            avgX,
            avgY,
            camera.getZFromFarHeight(
              waterdrops.groups[0].height * 2 * SPREAD * 0.75 * 2
            ),
          ],
          () => {
            setDisableCamAdjustments(false);
          }
        );

        start();

        setState({
          state: "CompareView",
          transitionDuration: duration,
          avgCoord: [avgX, avgY],
        });

        const origOpac = getOutlineOpac(camera.curTransform.k);
        setDisableCamAdjustments(true);

        const t = d3.timer((elapsed) => {
          const et = Math.min(1, elapsed / (duration / 5));

          dropsMesh.updateVisibility(1 - et);
          dropsMesh.updateOutlineVisibility(origOpac * (1 - et));

          if (et >= 1) {
            t.stop();

            dropsMesh.remove(scene);
          }
        });
      }
    },
    [activeWDObjs]
  );

  let actionBtn;

  if (isState(state, "WideView") && activeWaterdrops.length) {
    actionBtn = (
      <button onClick={handleClick} className="wide-view-action-btn fancy-font">
        {activeWaterdrops.length === 1 ? <BiCross /> : <BiNetworkChart />}
        {activeWaterdrops.length === 1 ? "examine" : "compare"}
      </button>
    );
  }

  return (
    <>
      <div className="infobox">
        <svg id="minimap"></svg>
        {curInfo && (
          <div className="details">
            {!SPATIAL_FEATURES[curInfo.id] && (
              <p className="no-loc-data">No Location Data</p>
            )}
            <p className="curDesc">{curInfo.description}</p>
            <p className="curKey">
              id: <span> {curInfo.id} </span>
            </p>
          </div>
        )}
      </div>
      {actionBtn}
    </>
  );
}

function updateLargeDropSVG(
  container,
  waterdrops,
  { onClick, onHover, onUnhover }
) {
  container
    .selectAll(".large-drop")
    .data(waterdrops.groups)
    .join((enter) => {
      return enter
        .append("g")
        .attr("class", "large-drop")
        .each(function () {
          const s = d3.select(this);

          s.append("g")
            .attr("class", "circlet")
            .append("circle")
            .call(circlet)
            .attr("display", "none")
            .attr("r", 1);

          const textGroup = s.append("g");
          textGroup
            .append("g")
            .append("image")
            .attr("href", "glow.png")
            .attr("preserveAspectRatio", "none")
            .attr("opacity", 0.8);
          textGroup
            .append("g")
            .append("text")
            .attr("class", "fancy-font")
            .attr("text-anchor", "middle")
            .attr("font-size", 0);
        });
    })
    .each(function (d) {
      d3.select(this)
        .select(".circlet")
        .attr("class", null)
        .attr("class", "circlet " + d.key);
      d3.select(this)
        .select("text")
        .call((s) => {
          s.selectAll("*").remove();
          const lines = wrap(
            DESCRIPTIONS_DATA[d.key].display_name || DESCRIPTIONS_DATA[d.key].id
          ).split("\n");

          lines.forEach((line, i) => {
            s.append("tspan")
              .attr("x", 0)
              .attr("y", `${-lines.length / 2 + 0.5}em`)
              .attr("dy", `${i}em`)
              .text(line);
          });
        });
    })
    .attr("display", "initial")
    .attr(
      "transform",
      ({ x, y, height }) =>
        `translate(${x}, ${y - dropCenterCorrection({ height })}) scale(${
          height * GROUP_HOVER_AREA_FACTOR
        })`
    )
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
    });
}
