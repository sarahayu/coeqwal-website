import * as d3 from "d3";
import React, { useContext, useEffect } from "react";

import { AppContext } from "AppContext";

import { GROUP_HOVER_AREA_FACTOR } from "settings";
import { dropsMesh, pointsMesh, scene } from "three-resources";
import { isState } from "utils/misc-utils";
import { DROPLET_SHAPE } from "utils/render-utils";

export default function WideView() {
  const { waterdrops, state, setState, camera, zoomTo, setActiveWaterdrops } =
    useContext(AppContext);

  useEffect(
    function update() {
      if (isState(state, "WideView")) {
        console.time("drawing");
        dropsMesh.draw(scene);
        console.timeEnd("drawing");

        dropsMesh.updateVisibility(1);
        dropsMesh.updateOutlineVisibility(
          d3.scaleLinear().domain([1, 5]).range([0.1, 1]).clamp(true)(
            camera.curTransform.k
          )
        );

        updateLargeDropSVG(
          d3.select("#mosaic-svg").select(".svg-trans"),
          waterdrops,
          (d) => {
            console.log(d);
            setActiveWaterdrops([d.key]);
            setState({ state: "ExamineView" });

            zoomTo([d.x, d.y, camera.getZFromFarHeight(d.height * 1.2)], () => {
              // TODO transition
              dropsMesh.updateOutlineVisibility(1);
              dropsMesh.updateVisibility(0.5);

              dropsMesh.remove(scene);
            });
          },
          () => {},
          () => {}
        );

        return () => {
          d3.select("#mosaic-svg")
            .select(".svg-trans")
            .selectAll(".largeDrop")
            .attr("display", "none");
        };
      }
    },
    [state]
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
