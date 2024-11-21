import React from "react";
import DropletGlyph from "components/DropletGlyph";
import DotHistogram from "components/DotHistogram";

export function MainWaterdropGraphics({
    objectiveLabel, dropInterper, histData, histRange, goal, setGoal, size,
}) {
    return (
        <>
            <div className="main-waterdrop">
                <DropletGlyph
                    levelInterp={dropInterper}
                    width={size}
                    height={size}
                    resolution={4} />
                <p className="var-scen-label">
                    scenario <span className="scen-number">{"0000"}</span>
                </p>
                <p className="fancy-font objective-label">{objectiveLabel}</p>
                <p className="volume-not-height">
                    Water supply represented by volume of water inside droplet, not height
                    of water level
                </p>
            </div>
            <div className="main-histogram">
                <DotHistogram
                    width={size}
                    height={(size * 2) / 3}
                    data={histData}
                    range={histRange}
                    goal={goal}
                    setGoal={setGoal} />
            </div>
        </>
    );
}
