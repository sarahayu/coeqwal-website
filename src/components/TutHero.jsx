import React from "react";
import { SkipBtn } from "components/SkipBtn";
import { MapCalifornia } from "components/MapCalifornia";

export function TutHero({ appCtx }) {
  return (
    <div className="tut-hero">
      <div className="tut-hero-container">
        <h1>
          Watering <br /> the Future
        </h1>
        <MapCalifornia />
        <p>
          Water is limited in California, yet everyone needs it. So how can we
          deal with the agricultural, environmental, urban, and other water
          demands of California?
        </p>
        <p>
          To start off, we'll focus on two groups: the{" "}
          <span id="ag-group">agriculture group in the north</span> and the{" "}
          <span id="ref-group">refuge group in the south.</span>
        </p>
        <p>
          Click on the green circle on the bottom-right, or scroll through this
          page, to explore!
        </p>
        <SkipBtn onClick={() => appCtx.setState({ state: "WideView" })} />
      </div>
    </div>
  );
}
