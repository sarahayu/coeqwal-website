import * as d3 from "d3";
import React, { useContext, useEffect, useRef } from "react";

import { AppContext } from "AppContext";

import { GROUP_HOVER_AREA_FACTOR } from "settings";
import { dropsMesh, pointsMesh, scene } from "three-resources";
import { isNonTransitionState } from "utils/misc-utils";
import { DROPLET_SHAPE } from "utils/render-utils";
import { toRadians } from "utils/math-utils";

export default function WideView() {
  const { waterdrops, stateStack, pushState, popState, camera, zoomTo } =
    useContext(AppContext);

  const enterRef = useRef(false);
  const exitRef = useRef(false);

  useEffect(
    function update() {
      if (
        isNonTransitionState(stateStack[0], "WideView") &&
        !enterRef.current
      ) {
        enterRef.current = true;
        exitRef.current = false;

        pointsMesh.draw(scene);

        updateLargeDropSVG(
          d3.select("#mosaic-svg").select(".svg-trans"),
          waterdrops,
          (d) => {
            popState();
            pushState({ state: "ExamineView" });
            pushState({ state: "WideView", transitioning: true });

            zoomTo([d.x, d.y, camera.getZFromFarHeight(d.height * 1.2)], () => {
              popState();
            });
          },
          () => {},
          () => {}
        );
      }

      if (
        !isNonTransitionState(stateStack[0], "WideView") &&
        !exitRef.current
      ) {
        enterRef.current = false;
        exitRef.current = true;

        d3.select("#mosaic-svg")
          .select(".svg-trans")
          .selectAll(".largeDrop")
          .attr("display", "none");
      }
    },
    [stateStack]
  );

  return <></>;
}

function updateLargeDropSVG(
  container,
  waterdrops,
  onClick,
  onHover,
  onUnhover
) {
  console.log("updating svg");
  container
    .selectAll(".largeDrop")
    .data(waterdrops.groups)
    .join((enter) => {
      return enter
        .append("g")
        .attr("class", "largeDrop")
        .call((s) => {
          s.append("path")
            .attr("d", DROPLET_SHAPE)
            .attr("fill", "none")
            .attr("stroke", "transparent")
            .attr("vector-effect", "non-scaling-stroke")
            .attr("stroke-width", 1);
        });
    })
    .attr("display", "initial")
    .attr(
      "transform",
      ({ x, y, height }) =>
        `translate(${x}, ${y}) scale(${height * GROUP_HOVER_AREA_FACTOR})`
    )
    .on("click", function (e, d) {
      onClick(d);
    })
    .on("mouseenter", function (e, d) {
      d3.select(this).select("path").attr("stroke", "lightgray");
      onHover(d);
    })
    .on("mouseleave", function (e, d) {
      d3.select(this).select("path").attr("stroke", "transparent");
      onUnhover(d);
    });
}
