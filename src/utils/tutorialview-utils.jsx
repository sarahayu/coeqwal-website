import * as d3 from "d3";

import { ticksExact } from "bucket-lib/utils";
import {
  DELIV_KEY_STRING,
  MAX_DELIVS,
  OBJECTIVES_DATA,
  SCENARIO_KEY_STRING,
} from "data/objectives-data";
import { DESCRIPTIONS_DATA } from "data/descriptions-data";
import { SPREAD_1_2 } from "settings";
import { DROPLET_SHAPE, generateTSpan } from "./render-utils";
import { LOD_1_RAD_PX } from "settings";
import { dropCenterCorrection } from "./math-utils";
import { genUUID, wrap } from "./misc-utils";
import { gradientUpdate } from "./render-utils";
import { gradientInit } from "./render-utils";

export const BAR_CHART_WIDTH = 500,
  BAR_CHART_HEIGHT = 400;

export const INTERP_COLOR = d3.interpolateRgbBasis([
  "#F2F5FB",
  "#D0DDEB",
  "#7B9BC0",
  "#4F739F",
  "#112A57",
]);

export const DEFAULT_OBJECTIVE = "DEL_CVP_PAG_N";
export const COMP_OBJECTIVE = "DEL_CVP_PRF_S";
export const DEFAULT_SCENARIO = "expl0000";
export const PAG_DELIVS =
  OBJECTIVES_DATA[DEFAULT_OBJECTIVE][SCENARIO_KEY_STRING][DEFAULT_SCENARIO][
    DELIV_KEY_STRING
  ];
export const PRF_DELIVS =
  OBJECTIVES_DATA[COMP_OBJECTIVE][SCENARIO_KEY_STRING][DEFAULT_SCENARIO][
    DELIV_KEY_STRING
  ];

export const VARIATIONS = [
  "expl0020", // change priority
  "expl0080", // increase carryover
  "expl0480", // decrease demand
  "expl0004", // increase minflow
];

export const VARIATIONS_DELIVS = VARIATIONS.map(
  (vars) =>
    OBJECTIVES_DATA[DEFAULT_OBJECTIVE][SCENARIO_KEY_STRING][vars][
      DELIV_KEY_STRING
    ]
);

export const VARIATIONS_INTERPERS = VARIATIONS_DELIVS.map((varDelivs) =>
  d3
    .scaleLinear()
    .domain(ticksExact(0, 1, varDelivs.length))
    .range(
      varDelivs
        .map((v) => v / MAX_DELIVS)
        .sort()
        .reverse()
    )
    .clamp(true)
);

export const PAG_INTERPER = d3
  .scaleLinear()
  .domain(ticksExact(0, 1, PAG_DELIVS.length))
  .range(
    PAG_DELIVS.map((v) => v / MAX_DELIVS)
      .sort()
      .reverse()
  )
  .clamp(true);

export const PRF_INTERPER = d3
  .scaleLinear()
  .domain(ticksExact(0, 1, PRF_DELIVS.length))
  .range(
    PRF_DELIVS.map((v) => v / MAX_DELIVS)
      .sort()
      .reverse()
  )
  .clamp(true);

export const DROP_VARIATIONS = [
  {
    idx: 0,
    scen: "0020",
    clas: "drop1",
    desc: "change priority",
  },
  {
    idx: 1,
    scen: "0080",
    clas: "drop2",
    desc: "increase carryover",
  },
  {
    idx: 2,
    scen: "0480",
    clas: "drop3",
    desc: "decrease demand",
  },
  {
    idx: 3,
    scen: "0004",
    clas: "drop4",
    desc: "increase minimum flow",
  },
];

export function updateDropsSVG(container, waterdropGroups, { onHover }) {
  container
    .selectAll(".large-drop")
    .data(waterdropGroups.groups)
    .join((enter) => {
      return enter.append("g").each(function (group, i) {
        d3.select(this).call(
          largeDropInit(group, waterdropGroups.groupPositions[i])
        );
      });
    })
    .attr("transform", (_, i) => {
      const groupPos = waterdropGroups.groupPositions[i];
      return `translate(${groupPos[0]}, ${groupPos[1]})`;
    })
    .each(function (group) {
      d3.select(this)
        .call(largeDropUpdate(group))
        .selectAll(".small-drop")
        .on("mouseenter", function (e, d) {
          onHover && onHover(d);
        });
    });
}

function largeDropInit({ nodes, height, key }) {
  return (s) => {
    s.attr("class", "large-drop " + key);

    s.append("circle")
      .attr("class", "highlight-circle")
      .attr("stroke", "none")
      .attr("fill", "yellow")
      .attr("r", LOD_1_RAD_PX * 2);

    s.append("text")
      .style("font-size", (height * SPREAD_1_2) / 15)
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

function smallDropInit({ key, levs, x, y }) {
  return (s) => {
    s.append("rect").attr("class", "bbox").style("visibility", "hidden");

    const randId = `tut-grad-${genUUID()}`;

    s.call(gradientInit(levs, randId));

    if (key === "expl0000") {
      d3.select(s.node().parentNode)
        .select(".highlight-circle")
        .attr("cx", x * SPREAD_1_2)
        .attr(
          "cy",
          y * SPREAD_1_2 - dropCenterCorrection({ rad: LOD_1_RAD_PX })
        );
    }

    s.append("path")
      .attr("d", DROPLET_SHAPE)
      .attr("class", "outline")
      .attr("transform", `scale(${LOD_1_RAD_PX * 0.95})`);

    s.append("path")
      .attr("class", "fill")
      .attr("d", DROPLET_SHAPE)
      .attr("fill", `url(#${randId})`)
      .attr("transform", `scale(${LOD_1_RAD_PX})`);
  };
}

function largeDropUpdate({ nodes, key, height }) {
  return (s) => {
    s.select("text")
      .attr("x", 0)
      .attr("y", (height / 2) * SPREAD_1_2 * 0.8)
      .call(
        generateTSpan(
          DESCRIPTIONS_DATA[key].display_name || DESCRIPTIONS_DATA[key].id
        )
      );

    s.selectAll(".small-drop")
      .data(nodes)
      .attr("display", "initial")
      .attr(
        "transform",
        ({ x, y }) => `translate(${x * SPREAD_1_2}, ${y * SPREAD_1_2})`
      )
      .each(function (node) {
        d3.select(this).call(smallDropUpdate(node));
      });
  };
}

function smallDropUpdate({ levs, maxLev }) {
  return (s) => {
    s.call(gradientUpdate(levs, maxLev));

    const dropBBox = s.select(".fill").node().getBBox();

    s.select(".bbox")
      .attr("x", dropBBox.x)
      .attr("y", dropBBox.y)
      .attr("width", dropBBox.width)
      .attr("height", dropBBox.height);
  };
}
