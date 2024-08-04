import * as d3 from "d3";
import React from "react";
import { SETT_NAME_FULL, SETT_VAL_STEPS } from "utils/data-utils";

export default function SceneSettingStickers({ settings, setColorSetting }) {
  return (
    <div className="scen-settings comp-settings">
      {settings.map((v, i) => (
        <div
          className="full-card"
          onMouseEnter={() => setColorSetting(i)}
          onMouseLeave={() => setColorSetting(null)}
          key={i}
        >
          <span>{SETT_NAME_FULL[i]}</span>
          <span>{SETT_VAL_STEPS[i][v]}</span>
          <div className="sett-dot-wrapper">
            {d3.range(SETT_VAL_STEPS[i].length).map((j) => (
              <span
                className={`sett-dot ${j <= v ? "filled" : "not-filled"}`}
                key={j}
                style={{ opacity: (j + 1) / SETT_VAL_STEPS[i].length }}
              ></span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
