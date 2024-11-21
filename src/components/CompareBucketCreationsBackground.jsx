import React from "react";
import { CompareBucketCreationsGraphics } from "components/CompareBucketCreationsGraphics";
import { CompareBucketCreationsText } from "components/CompareBucketCreationsText";

export function CompareBucketCreationsBackground({ appCtx, storyVars }) {
    return (
        <>
            <div className="create-buckets-section">
                <CompareBucketCreationsText />
                <CompareBucketCreationsGraphics
                    storyVars={storyVars}
                    size={appCtx.appHeight * 0.4} />
            </div>
        </>
    );
}
