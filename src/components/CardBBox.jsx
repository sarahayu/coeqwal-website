import React, { forwardRef } from "react";

export const CardBBox = forwardRef(function CardBBox({ children }, ref) {
    return (
        <div ref={ref} className="tut-text-card-wrapper">
            <div className="tut-text-card">
                <div className="tut-text-card-container">

                    {children}
                </div>
            </div>
        </div>
    );
});
