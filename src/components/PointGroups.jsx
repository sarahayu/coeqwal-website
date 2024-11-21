import * as d3 from "d3";
import React, { useEffect } from "react";
import { constants } from "utils/tutorialview-utils";

export function PointGroups() {
    useEffect(function initialize() {
        const width = window.innerWidth * 0.9 /* leave room for scrollbar on the right */, height = window.innerHeight;
        const overlaySVG = d3
            .select("#tut-point-groups")
            .attr("width", width)
            .attr("height", height)
            .style("z-index", -1);

        const startPAG = d3
            .select(`.${constants.PAG_OBJECTIVE}`)
            .node()
            .getBoundingClientRect(), endPAG = d3.select("#ag-group").node().getBoundingClientRect();
        const startPRF = d3
            .select(`.${constants.PRF_OBJECTIVE}`)
            .node()
            .getBoundingClientRect(), endPRF = d3.select("#ref-group").node().getBoundingClientRect();

        const pagLine = [
            [startPAG.x + startPAG.width / 2, startPAG.y + startPAG.height / 2],
            [endPAG.x + endPAG.width / 2, endPAG.y + endPAG.height / 2],
        ];
        const prfLine = [
            [startPRF.x + startPRF.width / 2, startPRF.y + startPRF.height / 2],
            [endPRF.x + endPRF.width / 2, endPRF.y + endPRF.height / 2],
        ];

        const pagPointer = [
            pagLine[0],
            [
                (pagLine[0][0] + pagLine[1][0]) / 2,
                (pagLine[0][1] + pagLine[1][1]) / 2 - height / 10,
            ],
            pagLine[1],
        ];

        const prfPointer = [
            prfLine[0],
            [
                (prfLine[0][0] + prfLine[1][0]) / 2,
                (prfLine[0][1] + prfLine[1][1]) / 2 - height / 10,
            ],
            prfLine[1],
        ];

        overlaySVG
            .append("path")
            .attr(
                "d",
                d3
                    .line()
                    .x((d) => d[0])
                    .y((d) => d[1])
                    .curve(d3.curveBasis)(pagPointer)
            )
            .attr("stroke", constants.PAG_COLOR)
            .attr("stroke-dasharray", "5 5")
            .attr("fill", "transparent");

        overlaySVG
            .append("path")
            .attr(
                "d",
                d3
                    .line()
                    .x((d) => d[0])
                    .y((d) => d[1])
                    .curve(d3.curveBasis)(prfPointer)
            )
            .attr("stroke", constants.PRF_COLOR)
            .attr("stroke-dasharray", "5 5")
            .attr("fill", "transparent");
    }, []);

    return <svg id="tut-point-groups"></svg>;
}
