import React from "react";
import DropletGlyph from "components/DropletGlyph";
import DotHistogram from "components/DotHistogram";

export function VariationWaterdropGraphics({
    variations, goal, setGoal, histRange, size,
}) {
    return variations.map(({ idx, scen, clas, desc, interper, histData }) => (
        <div className={`vardrop ${clas}`} key={idx} desc={desc}>
            <DropletGlyph
                levelInterp={interper}
                width={size * 0.7}
                height={size * 0.7}
                resolution={4} />
            <p className="var-scen-label">
                scenario <span className="scen-number">{scen}</span>
            </p>
            <DotHistogram
                shortForm
                width={size}
                height={(size * 2) / 3}
                data={histData}
                range={histRange}
                goal={goal}
                setGoal={setGoal} />
        </div>
    ));
}
