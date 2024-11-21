import React from "react";
import { constants } from "utils/tutorialview-utils";
import { descriptionsData } from "data/descriptions-tutorial-data";
import { BucketCreationGraphics } from "components/BucketCreationGraphics";

export function CompareBucketCreationsGraphics({ storyVars }) {
    return (
        <div className="tut-graph-wrapper">
            <BucketCreationGraphics
                id={"pag-bar-graph"}
                label={descriptionsData[constants.PAG_OBJECTIVE].display_name}
                bucketInterper={storyVars.bucketInterperPAG} />
            <BucketCreationGraphics
                id={"prf-bar-graph"}
                label={descriptionsData[constants.PRF_OBJECTIVE].display_name}
                bucketInterper={storyVars.bucketInterperPRF} />
        </div>
    );
}
