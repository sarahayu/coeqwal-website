import React, { forwardRef } from "react";

export const CardBBox = forwardRef(function CardBBox({ id, children }, ref) {
  return (
    <div id={id} ref={ref} className="tut-text-card-wrapper">
      <div className="tut-text-card">
        <div className="tut-text-card-container">{children}</div>
      </div>
    </div>
  );
});
