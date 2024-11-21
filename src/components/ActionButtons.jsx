import { BiCross, BiNetworkChart } from "react-icons/bi";
import { isState } from "utils/misc-utils";

export function ActionButtons({
    appCtx, handleClickExamine, handleClickDeselectAll, handleClickCompare,
}) {
    let examineBtn, compareBtn;

    if (isState(appCtx.state, "WideView") && appCtx.activeWaterdrops.length) {
        if (appCtx.activeWaterdrops.length === 1) {
            examineBtn = (
                <button
                    onClick={handleClickExamine}
                    className="wide-view-action-btn fancy-font"
                >
                    <BiCross />
                    <span>examine</span>
                </button>
            );
        } else {
            compareBtn = (
                <>
                    <button
                        onClick={handleClickCompare}
                        className="wide-view-action-btn fancy-font"
                    >
                        <BiNetworkChart />
                        <span>compare</span>
                    </button>
                    <button
                        onClick={handleClickDeselectAll}
                        className="fancy-font supplement-btn"
                    >
                        <span>deselect all</span>
                    </button>
                </>
            );
        }
    }

    return (
        <>
            {examineBtn}
            {compareBtn}
        </>
    );
}
