import * as d3 from "d3";

import { settings } from "settings";

import { descriptionsData } from "data/descriptions-data";
import { clipEnds, dropCenterCorrection } from "utils/math-utils";
import {
  DROPLET_SHAPE,
  generateTSpan,
  circlet,
  gradientInit,
  gradientUpdate,
} from "utils/render-utils";

function largeDropInit({ nodes, height }) {
  return (s) => {
    s.attr("class", "large-drop");

    s.append("circle")
      .attr("class", "highlight-circle")
      .attr("stroke", "none")
      .attr("fill", "yellow")
      .attr("r", settings.LOD_1_RAD_PX * 2);

    s.append("text")
      .style("font-size", (height * settings.SPREAD_1_2) / 15)
      .attr("class", "fancy-font large-gray-text")
      .attr("text-anchor", "middle");

    s.selectAll(".small-drop")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "small-drop")
      .each(function (node) {
        d3.select(this).call(smallDropInit(node));
      });
  };
}

function largeDropUpdate({ nodes, key, height }, transitionDelay) {
  return (s) => {
    const getStartDropLoc = ({ x, y, tilt }) =>
      `translate(${x}, ${y}) rotate(${tilt})`;
    const getEndDropLoc = ({ x, y, tilt }) =>
      `translate(${x * settings.SPREAD_1_2}, ${
        y * settings.SPREAD_1_2
      }) rotate(${tilt})`;

    const baselinePos = {};

    s.call(textUpdate(key, height))
      .selectAll(".small-drop")
      .data(nodes)
      .attr("display", "initial")
      .attr("transform", getStartDropLoc)
      .each(function (node) {
        d3.select(this).call(smallDropUpdate(node, baselinePos));
      })
      .transition()
      .delay(transitionDelay)
      .duration(1000)
      .attr("transform", getEndDropLoc);

    s.select(".highlight-circle")
      .attr("cx", baselinePos.x)
      .attr(
        "cy",

        baselinePos.y - dropCenterCorrection({ rad: settings.LOD_1_RAD_PX })
      )
      .transition()
      .delay(transitionDelay)
      .duration(1000)
      .attr("cx", baselinePos.x * settings.SPREAD_1_2)
      .attr(
        "cy",

        baselinePos.y * settings.SPREAD_1_2 -
          dropCenterCorrection({ rad: settings.LOD_1_RAD_PX })
      );
  };
}

function smallDropInit({ levs, id }) {
  return (s) => {
    s.append("rect").attr("class", "bbox").style("visibility", "hidden");

    const idStr = `compare-grad-${id}`;

    s.call(gradientInit(levs, idStr));

    s.append("path")
      .attr("d", DROPLET_SHAPE)
      .attr("class", "outline")
      .attr("transform", `scale(${settings.LOD_1_RAD_PX * 0.95})`);

    s.append("path")
      .attr("class", "fill")
      .attr("d", DROPLET_SHAPE)
      .attr("fill", `url(#${idStr})`)
      .attr("transform", `scale(${settings.LOD_1_RAD_PX})`);
  };
}

function smallDropUpdate({ key, levs, maxLev, x, y }, baselinePos) {
  return (s) => {
    if (key === "expl0000") {
      baselinePos.x = x;
      baselinePos.y = y;
    }

    s.call(gradientUpdate(levs, maxLev));

    const dropBBox = s.select(".fill").node().getBBox();

    s.select(".bbox")
      .attr("x", dropBBox.x)
      .attr("y", dropBBox.y)
      .attr("width", dropBBox.width)
      .attr("height", dropBBox.height);
  };
}

function textUpdate(key, height) {
  return (s) => {
    s.select("text")
      .attr("x", 0)
      .attr("y", (height / 2) * settings.SPREAD_1_2 * 0.9)
      .call(
        generateTSpan(
          descriptionsData[key].display_name || descriptionsData[key].id
        )
      );
  };
}

function updateDropsSVG(
  container,
  waterdropGroups,
  transitionDelay,
  { onClick, onHover, onUnhover }
) {
  const getStartGroupLoc = ({ x, y, tilt }) =>
    `translate(${x}, ${y}) rotate(${tilt})`;
  const getEndGroupLoc = (_, i) =>
    `translate(${waterdropGroups.groupPositions[i][0]}, ${waterdropGroups.groupPositions[i][1]})`;

  container
    .selectAll(".large-drop")
    .data(waterdropGroups.groups)
    .join((enter) => {
      return enter.append("g").each(function (node) {
        d3.select(this).call(largeDropInit(node));
      });
    })
    .attr("transform", getStartGroupLoc)
    .each(function (node) {
      const drops = d3
        .select(this)
        .call(largeDropUpdate(node, transitionDelay))
        .selectAll(".small-drop");

      if (onClick) {
        drops.on("click", function (_, d) {
          onClick(d);
        });
      }

      if (onHover) {
        drops.on("mouseenter", function (_, d) {
          d3.select(this.parentNode).raise();
          onHover(d);
        });
      }

      if (onUnhover) {
        drops.on("mouseleave", function (_, d) {
          onUnhover(d);
        });
      }
    })
    .transition()
    .delay(transitionDelay)
    .duration(1000)
    .attr("transform", getEndGroupLoc);
}

function updateColorDrops(container, waterdropGroups, opacFn, color) {
  const getGroupLoc = (_, i) =>
    `translate(${waterdropGroups.groupPositions[i][0]}, ${waterdropGroups.groupPositions[i][1]})`;

  container
    .selectAll(".color-drop-group")
    .data(waterdropGroups.groups)
    .join((enter) => {
      return enter.append("g").each(function ({ nodes }) {
        d3.select(this).call((s) => {
          s.attr("class", "color-drop-group")
            .selectAll(".color-drop")
            .data(nodes)
            .join("circle")
            .attr("class", "color-drop")
            .attr("r", settings.LOD_1_RAD_PX);
        });
      });
    })
    .attr("transform", getGroupLoc)
    .each(function () {
      d3.select(this)
        .selectAll(".color-drop")
        .call((s) => {
          s.attr("opacity", ({ key }) => opacFn(key)).attr("fill", color);
        })
        .attr("cx", ({ x }) => x * settings.SPREAD_1_2)
        .attr("cy", ({ y }) => y * settings.SPREAD_1_2);
    });
}

function getWaterdropGroups(keyArr, waterdrops, center) {
  const groups = keyArr.map((k) => waterdrops.groups.find((g) => g.key === k));

  const groupPositions = [];
  const rad = groups[0].height * settings.SPREAD_1_2 * 0.75;

  for (let i = 0, n = groups.length; i < n; i++) {
    const angle = ((Math.PI * 2) / n) * (i - 0.5) - Math.PI / 2;
    groupPositions.push([
      center[0] + Math.cos(angle) * rad,
      center[1] + Math.sin(angle) * rad,
    ]);
  }

  return {
    groups,
    groupPositions,
  };
}

function calcLinesAndPositions(groupsObj, activeMinidropKey) {
  const positions = [];
  const nodes = [];
  for (let i = 0; i < groupsObj.groups.length; i++) {
    const group = groupsObj.groups[i];
    const groupPos = groupsObj.groupPositions[i];

    const node = group.nodes.find((n) => n.key === activeMinidropKey);

    nodes.push(node);

    positions.push([
      node.x * settings.SPREAD_1_2 + groupPos[0],
      node.y * settings.SPREAD_1_2 +
        groupPos[1] -
        dropCenterCorrection({ rad: settings.LOD_1_RAD_PX }),
    ]);
  }

  const lines = [];

  for (let i = 0; i < positions.length; i++) {
    const from = Array.from(positions[i]),
      to = Array.from(positions[i + 1 == positions.length ? 0 : i + 1]);

    clipEnds([from, to], settings.LOD_1_RAD_PX * 2);

    lines.push([from, to]);
  }

  return [positions, lines, nodes];
}

function updateLabelSVG(pos, labelText, normedTextSize) {
  const [textX, textY] = pos;

  const smallTextSize = normedTextSize / 15;
  const largeTextSize = normedTextSize / 10;

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
    .text(labelText)
    .transition()
    .duration(100)
    .attr("x", textX)
    .attr("y", textY);
}

function updateScenIndicatorsSVG(positions, lines) {
  d3.select("#compare-group")
    .selectAll(".circlet")
    .data(positions)
    .join("circle")
    .attr("class", "circlet")
    .call(circlet)
    .attr("display", "initial")
    .attr("r", settings.LOD_1_RAD_PX * 1.5)
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

export const helpers = {
  updateDropsSVG,
  updateColorDrops,
  getWaterdropGroups,
  calcLinesAndPositions,
  updateLabelSVG,
  updateScenIndicatorsSVG,
};