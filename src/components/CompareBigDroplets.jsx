import React from "react";

export function CompareBigDroplets() {
  return (
    <div className="tut-comparer-graphics-wrapper">
      <p className="bigdrop-describe">
        These are all possible scenarios sorted bottom-to-top by decreasing
        average deliveries.
      </p>
      <svg id="comparer-graphics"></svg>
    </div>
  );
}
