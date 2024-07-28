import * as d3 from "d3";

import { DESCRIPTIONS_DATA } from "data/descriptions-data";
import {
  CALIFORNIA_CENTER,
  CALIFORNIA_OUTLINE,
  SPATIAL_DATA,
} from "data/spatial-data";
import { GROUP_HOVER_AREA_FACTOR } from "settings";

import { dist, dropCenterCorrection, getCenterDomRect } from "utils/math-utils";
import { wrap } from "utils/misc-utils";
import { circlet } from "utils/render-utils";

function interactorsInit() {
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
}

function interactorsUpdate(d) {
  d3.select(this)
    .select(".circlet")
    .attr("class", null)
    .attr("class", "circlet " + d.key);
  d3.select(this).select("text").call(textUpdate(d));
}

function textUpdate(d) {
  return function (s) {
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
  };
}

function dropTransform({ x, y, height }) {
  return `translate(${x}, ${y - dropCenterCorrection({ height })}) scale(${
    height * GROUP_HOVER_AREA_FACTOR
  })`;
}

export function updateLargeDropSVG(
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
        .each(interactorsInit);
    })
    .each(interactorsUpdate)
    .style("display", "initial")
    .attr("transform", dropTransform)
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

export function drawMinimapSVG() {
  const width = 200,
    height = 250;

  const minimap = d3
    .select("#minimap")
    .attr("width", width)
    .attr("height", height);

  const proj = d3
    .geoMercator()
    .scale(1000)
    .center(CALIFORNIA_CENTER)
    .translate([width / 2, height / 2]);

  const lineGeom = [
    ...SPATIAL_DATA.features.filter((f) => f.geometry.type === "MultiPolygon"),
    CALIFORNIA_OUTLINE,
  ];
  const pointGeom = SPATIAL_DATA.features.filter(
    (f) => f.geometry.type === "MultiPoint"
  );

  minimap
    .selectAll("path")
    .data(lineGeom)
    .join("path")
    .attr("d", (d) => d3.geoPath().projection(proj)(d))
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

      const [x, y] = proj(d.geometry.coordinates[0]);

      s.attr("cx", x);
      s.attr("cy", y);
    })
    .attr("r", 2)
    .attr("class", (d) => "outline " + d.properties.CalLiteID)
    .attr("fill", "transparent");
}

export function getFontSize(d, transformZoom, cameraHeight, waterdropsHeight) {
  const MAX_RAD = window.innerHeight / 9;

  const zoomRel = cameraHeight / waterdropsHeight / transformZoom;

  const absFontSize = (_d) =>
    _d > MAX_RAD
      ? 0
      : d3.scaleLinear().domain([0, MAX_RAD]).range([1, 0.4]).clamp(true)(_d);

  return absFontSize(d * zoomRel) * Math.min(zoomRel, 0.4);
}

export function fontSizer(transformInfo, camera, waterdropsHeight) {
  return function () {
    const tNode = d3.select(this).node();

    const [posx, posy] = getCenterDomRect(tNode.getBoundingClientRect());

    const width = ((tNode.getBBox().width * camera.height) / camera.far) * 8,
      height = ((tNode.getBBox().height * camera.height) / camera.far) * 10;

    const dis = dist(
      [posx, posy],
      [transformInfo.mouseX, transformInfo.mouseY]
    );

    d3.select(this).attr(
      "font-size",
      getFontSize(dis, transformInfo.zoom, camera.height, waterdropsHeight)
    );

    d3.select(this.parentNode.parentNode)
      .select("image")
      .attr("x", -width / 2)
      .attr("y", -height / 2)
      .attr("width", width)
      .attr("height", height);
  };
}

export function fadeOutDrops(dropsMesh, scene, startOpac, duration) {
  const t = d3.timer((elapsed) => {
    const et = Math.min(1, elapsed / duration);

    dropsMesh.updateVisibility(1 - et);
    dropsMesh.updateOutlineVisibility(startOpac * (1 - et));

    if (et >= 1) {
      t.stop();
      dropsMesh.remove(scene);
    }
  });
}