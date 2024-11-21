import React from "react";
import BucketGlyph from "components/BucketGlyph";
import { constants } from "utils/tutorialview-utils";

export function BucketCreationGraphics({ id, bucketInterper, label }) {
    return (
        <div className="tut-graph">
            <svg id={id}></svg>
            <BucketGlyph
                levelInterp={bucketInterper}
                width={300}
                height={constants.BAR_CHART_HEIGHT}
                resolution={4} />
            <p className="fancy-font objective-label">{label}</p>
        </div>
    );
}
