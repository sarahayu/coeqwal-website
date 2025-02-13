import React from "react";
import { getConnectStyle } from "utils/render-utils";

export function ConnectLine({ connectLine }) {
  if (!connectLine) return;

  return (
    <div className="connect-line" style={getConnectStyle(...connectLine)}>
      <div className="connect-line-container"></div>
    </div>
  );
}
