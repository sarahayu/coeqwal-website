import React from "react";
import { constants } from "utils/tutorialview-utils";
import { descriptionsData } from "data/descriptions-tutorial-data";
import { objectivesData } from "data/objectives-tutorial-data";
import { VariationWaterdropGraphics } from "components/VariationWaterdropGraphics";
import { MainWaterdropGraphics } from "components/MainWaterdropGraphics";

export function CompareScenariosGraphics({ storyVars, size }) {
    return (
        <div className="tut-drop-graphics-wrapper">
            <h2>Seeing Scenarios</h2>
            <div className="waterdrop-graphics-wrapper">
                <MainWaterdropGraphics
                    objectiveLabel={descriptionsData[constants.PAG_OBJECTIVE].display_name}
                    dropInterper={storyVars.dropInterper}
                    histData={constants.PAG_DELIVS}
                    histRange={[0, objectivesData.MIN_MAXES[constants.PAG_OBJECTIVE][1]]}
                    goal={storyVars.userGoal}
                    setGoal={(newGoal) => {
                        storyVars.setUserGoal(newGoal);
                    }}
                    size={size} />
                <VariationWaterdropGraphics
                    variations={constants.DROP_VARIATIONS.map((variation) => ({
                        ...variation,
                        interper: storyVars.variationInterpers[variation.idx],
                        histData: constants.VARIATIONS_DELIVS[variation.idx],
                    }))}
                    goal={storyVars.userGoal}
                    setGoal={(newGoal) => {
                        storyVars.setUserGoal(newGoal);
                    }}
                    histRange={[0, objectivesData.MIN_MAXES[constants.PAG_OBJECTIVE][1]]}
                    size={size} />
            </div>
        </div>
    );
}