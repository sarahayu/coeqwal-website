import * as d3 from "d3";

import { interpolateWatercolorBlue } from "bucket-lib/utils";

import { LOD_1_LEVELS, LOD_1_RAD_PX, SPREAD_1_2 } from "settings";

import { DESCRIPTIONS_DATA } from "data/descriptions-data";
import { clipEnds, dropCenterCorrection } from "utils/math-utils";
import { genUUID, wrap } from "utils/misc-utils";
import { DROPLET_SHAPE } from "utils/render-utils";

export function getWaterdropGroups(keyArr, waterdrops, center) {
  const groups = keyArr.map((k) => waterdrops.groups.find((g) => g.key === k));

  const groupPositions = [];
  const rad = groups[0].height * SPREAD_1_2 * 0.75;

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

export function updateDropsSVG(
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
        .each(function ({ nodes, height }) {
          d3.select(this)
            .call((s) => {
              s.append("text")
                .style("font-size", (height * SPREAD_1_2) / 15)
                .attr("class", "fancy-font water-group-label")
                .attr("text-anchor", "middle");
            })
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

              const randId = genUUID();

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
                for (let j = 0; j < 2; j++) {
                  stops
                    .append("stop")
                    .attr(
                      "stop-color",
                      interpolateWatercolorBlue(i / LOD_1_LEVELS)
                    );
                }
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
    .attr("transform", ({ x, y }) => `translate(${x}, ${y})`)
    .each(function ({ nodes, key, height }) {
      d3.select(this)
        .call((s) => {
          const t = s.select("text");

          t.selectAll("*").remove();
          const lines = wrap(
            DESCRIPTIONS_DATA[key].display_name || DESCRIPTIONS_DATA[key].id
          ).split("\n");

          lines.forEach((line, i) => {
            t.append("tspan")
              .attr("x", 0)
              .attr("y", (height / 2) * SPREAD_1_2)
              .attr("dy", `${i}em`)
              .text(line);
          });
        })
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

          const dropBBox = s.select(".fill").node().getBBox();

          s.select(".bbox")
            .attr("x", dropBBox.x)
            .attr("y", dropBBox.y)
            .attr("width", dropBBox.width)
            .attr("height", dropBBox.height);
        })
        .transition()
        .delay(transitionDelay)
        .duration(1000)
        .attr(
          "transform",
          ({ x, y }) => `translate(${x * SPREAD_1_2}, ${y * SPREAD_1_2})`
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

export function calcLinesAndPositions(groupsObj, activeMinidropKey) {
  const positions = [];
  const nodes = [];
  for (let i = 0; i < groupsObj.groups.length; i++) {
    const group = groupsObj.groups[i];
    const groupPos = groupsObj.groupPositions[i];

    const node = group.nodes.find((n) => n.key === activeMinidropKey);

    nodes.push(node);

    positions.push([
      node.x * SPREAD_1_2 + groupPos[0],
      node.y * SPREAD_1_2 +
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
