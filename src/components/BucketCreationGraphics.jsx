import { constants } from "utils/tutorialview-utils";
import TaggedBottleGlyph from "./TaggedBottleGlyph";

export function BucketCreationGraphics({ id, bucketInterper, label }) {
  return (
    <div className="tut-graph">
      <svg id={id}></svg>
      <TaggedBottleGlyph
        levelInterp={bucketInterper}
        maxValue={constants.MAX_DELIVS}
        width={300}
        height={constants.BAR_CHART_HEIGHT}
        resolution={4}
      />
      <p className="fancy-font objective-label">{label}</p>
    </div>
  );
}
