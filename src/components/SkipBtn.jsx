import * as d3 from "d3";
import React, { useEffect } from "react";

export function SkipBtn({ onClick }) {
    useEffect(function mountFadeOutEffect() {
        const startPos = document.documentElement.scrollTop;
        const buffer = 50;

        window.addEventListener("scroll", function () {
            const curPos = document.documentElement.scrollTop;
            const opac = Math.max(0, 1 - (curPos - startPos) / buffer);

            d3.select(".skip-btn").style("opacity", opac);
        });
    }, []);
    return (
        <button className="skip-btn" onClick={onClick}>
            Skip intro
        </button>
    );
}
