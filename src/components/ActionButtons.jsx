import { BiCross, BiFilter, BiNetworkChart } from "react-icons/bi";
import { isState } from "utils/misc-utils";

export function ActionButtons({
  appCtx,
  handleClickFilter,
  handleClickExamine,
  handleClickDeselectAll,
  handleClickCompare,
}) {
  let filterBtn, examineBtn, compareBtn;

  if (isState(appCtx.state, "WideView")) {
    filterBtn = (
      <button
        onClick={handleClickFilter}
        className="wide-view-action-btn fancy-font"
      >
        <BiFilter />
        <span>Filter</span>
      </button>
    );
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
    } else if (appCtx.activeWaterdrops.length) {
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
      {filterBtn}
      {examineBtn}
      {compareBtn}
    </>
  );
}
