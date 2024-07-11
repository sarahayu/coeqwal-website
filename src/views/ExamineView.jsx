import React, { useContext, useEffect, useRef } from "react";

import { AppContext } from "AppContext";

import { isNonTransitionState } from "utils/misc-utils";

export default function ExamineView() {
  const { stateStack, pushState, popState, setGoBack, camera, zoomTo } =
    useContext(AppContext);

  const enterRef = useRef(false);
  const exitRef = useRef(false);

  useEffect(
    function update() {
      if (
        isNonTransitionState(stateStack[0], "ExamineView") &&
        !enterRef.current
      ) {
        enterRef.current = true;
        exitRef.current = false;

        setGoBack(() => () => {
          popState();
          pushState({ state: "WideView" });

          zoomTo([0, 0, camera.far], () => {});
        });
      }

      if (
        !isNonTransitionState(stateStack[0], "ExamineView") &&
        !exitRef.current
      ) {
        enterRef.current = false;
        exitRef.current = true;

        setGoBack(null);
      }
    },
    [stateStack]
  );

  return <></>;
}
