import { useCallback, useEffect, useRef, useState } from "react";
import { worldToScreen } from "utils/render-utils";
import { useStateRef } from "utils/misc-utils";

export function useDragPanels(viewTransform) {
  const [panels, setPanels, panelsRef] = useStateRef([]);
  const mouseDownInfo = useRef({});

  useEffect(function initialize() {
    window.addEventListener("mousemove", (e) => {
      if (mouseDownInfo.current.startX === undefined) return;

      mouseDownInfo.current.deltaX = e.x - mouseDownInfo.current.startX;
      mouseDownInfo.current.deltaY = e.y - mouseDownInfo.current.startY;

      setPanels((p) => {
        if (mouseDownInfo.current.startX === undefined) return p;

        const f = p.find((v) => v.id === mouseDownInfo.current.id);
        f.offsetX = f.oldOffsetX + mouseDownInfo.current.deltaX;
        f.offsetY = f.oldOffsetY + mouseDownInfo.current.deltaY;

        return [...p];
      });
    });

    window.addEventListener("mouseup", (e) => {
      if (mouseDownInfo.current.startX !== undefined) {
        mouseDownInfo.current = {};
      }
    });
  }, []);

  const onPanelDragStart = useCallback(function (e, { id }) {
    if (e.target.className === "") return; // we're clicking the razor, disregard

    e.preventDefault();

    mouseDownInfo.current = { startX: e.clientX, startY: e.clientY, id };

    setPanels((p) => {
      const f = p.find((v) => v.id === id);

      f.oldOffsetX = f.offsetX;
      f.oldOffsetY = f.offsetY;

      return [...p];
    });
  }, []);

  function getPanelStyle({ x, y, offsetX, offsetY }) {
    const [screenX, screenY] = worldToScreen(x, y, viewTransform);
    return {
      left: `${screenX + offsetX}px`,
      top: `${screenY + offsetY}px`,
    };
  }

  return {
    panels,
    panelsRef,
    setPanels,
    onPanelDragStart,
    getPanelStyle,
  };
}
