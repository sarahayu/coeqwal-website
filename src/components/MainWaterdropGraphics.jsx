import React from "react";
import DropletGlyph from "components/DropletGlyph";
import DotHistogram from "components/DotHistogram";
import BottleGlyph from "./BottleGlyph";

export function MainWaterdropGraphics({
  objectiveLabel,
  dropInterper,
  histData,
  histRange,
  goal,
  setGoal,
  size,
}) {
  return (
    <>
      <div className="main-waterdrop">
        <BottleGlyph
          levelInterp={dropInterper}
          width={size}
          height={size}
          resolution={4}
        />
        <p className="var-scen-label">
          scenario <span className="scen-number">{"0000"}</span>
        </p>
        <p className="fancy-font objective-label">{objectiveLabel}</p>
      </div>
      <div className="main-histogram">
        <DotHistogram
          width={size}
          height={(size * 2) / 3}
          data={histData}
          range={histRange}
          goal={goal}
          setGoal={setGoal}
        />
      </div>
    </>
  );
}
