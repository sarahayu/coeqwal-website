import * as d3 from "d3";
import React from "react";
import {
  SETT_NAME_SHORT,
  SETT_NAME_FULL,
  SETT_VAL_STEPS,
} from "utils/data-utils";

export default function SceneSettingSubcard({ settings, setColorSetting }) {
  return (
    <div className="scen-settings">
      <div className="condense">
        {settings.map((v, i) => (
          <div className="sett-dot-wrapper" key={i}>
            <span>{SETT_NAME_SHORT[i]}</span>
            {d3.range(v + 1).map((j) => (
              <span
                className="sett-dot"
                key={j}
                style={{ opacity: (j + 1) / SETT_VAL_STEPS[i].length }}
              ></span>
            ))}
          </div>
        ))}
      </div>
      <div className="full">
        <div className="full-container">
          <span>The settings for this scenario are:</span>
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
      </div>
    </div>
  );
}
