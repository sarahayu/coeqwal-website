import React from "react";
import BucketGlyph from "components/BucketGlyph";
import { constants } from "utils/tutorialview-utils";
import DropletGlyph from "./DropletGlyph";
import BottleGlyph from "./BottleGlyph";

export function BucketCreationGraphics({ id, bucketInterper, label }) {
  return (
    <div className="tut-graph">
      <svg id={id}></svg>
      <BottleGlyph
        levelInterp={bucketInterper}
        width={300}
        height={constants.BAR_CHART_HEIGHT}
        resolution={4}
      />
      <p className="fancy-font objective-label">{label}</p>
    </div>
  );
}
