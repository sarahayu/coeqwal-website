import { useCallback, useEffect, useRef, useState } from "react";

export function useDragPanels(viewTransform) {
  const [panels, setPanels] = useState([]);
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

    mouseDownInfo.current = { startX: e.clientX, startY: e.clientY, id };

    setPanels((p) => {
      const f = p.find((v) => v.id === id);

      f.oldOffsetX = f.offsetX;
      f.oldOffsetY = f.offsetY;

      return [...p];
    });
  }, []);

  function getPanelStyle({ x, y, offsetX, offsetY }) {
    return {
      left: `${x * viewTransform.k + viewTransform.x + offsetX}px`,
      top: `${y * viewTransform.k + viewTransform.y + offsetY}px`,
    };
  }

  return {
    panels,
    setPanels,
    onPanelDragStart,
    getPanelStyle,
  };
}
