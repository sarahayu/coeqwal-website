import React from "react";

import { AppContext } from "AppContext";

import WideView from "views/WideView";
import ExamineView from "views/ExamineView";
import TutorialView from "views/TutorialView";
import CompareView from "views/CompareView";

import useAppState from "hooks/useAppState";

export default function App() {
  const appState = useAppState();

  return (
    <AppContext.Provider value={appState}>
      <div className="bubbles-wrapper">
        <div id="mosaic-webgl"></div>
        <svg id="mosaic-svg">
          <g className="svg-trans"></g>
        </svg>
      </div>
      <TutorialView />
      <WideView />
      <ExamineView />
      <CompareView />
      {appState.goBack && (
        <button className="go-back-btn" onClick={appState.goBack}>
          <span>←</span>
        </button>
      )}
    </AppContext.Provider>
  );
}
