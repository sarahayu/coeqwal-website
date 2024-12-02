import * as d3 from "d3";
import React from "react";
import { Scrollama } from "react-scrollama";

export function DataStoryScrollama({ setCurrentIndex, children }) {
  const onStepEnter = async ({ data, direction, element }) => {
    setCurrentIndex(data.idx);
    if (direction === "up") return;
    data.animHandler?.do();
  };

  const onStepExit = async ({ data, direction, element }) => {
    if (direction === "down") return;
    data.animHandler?.undo();
  };

  const onStepProgress = async ({ data, direction, element, progress }) => {
    d3.select(element)
      .select("div")
      .style(
        "transform",
        `translateY(${d3
          .scaleLinear()
          .domain([0, 0.2, 0.8, 1])
          .range([200, 0, 0, 200])(progress)}%)`
      )
      .style(
        "opacity",
        `${d3.scaleLinear().domain([0, 0.2, 0.8, 1]).range([0, 1, 1, 0])(
          progress
        )}`
      );
  };

  return (
    <Scrollama
      offset={0.8}
      onStepEnter={onStepEnter}
      onStepExit={onStepExit}
      onStepProgress={onStepProgress}
      threshold={1}
    >
      {children}
    </Scrollama>
  );
}
