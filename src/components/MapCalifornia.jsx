import * as d3 from "d3";
import React, { useEffect } from "react";
import { constants } from "utils/tutorialview-utils";
import { spatialData } from "data/spatial-data";

export function MapCalifornia({ }) {
    useEffect(function initialize() {
        const height = window.innerHeight, width = height * 0.9;

        const drawnRegions = [constants.PAG_OBJECTIVE, constants.PRF_OBJECTIVE];

        const minimap = d3
            .select("#tut-map-california")
            .attr("width", width)
            .attr("height", height);

        const proj = d3
            .geoMercator()
            .scale((3000 * height) / 800)
            .center(spatialData.CALIFORNIA_CENTER)
            .translate([width / 2, height / 2]);

        const lineGeom = [
            ...spatialData.SPATIAL_DATA.features.filter((f) => drawnRegions.includes(f.properties.CalLiteID)
            ),
            spatialData.CALIFORNIA_OUTLINE,
        ];

        minimap
            .selectAll("path")
            .data(lineGeom)
            .join("path")
            .attr("d", (d) => d3.geoPath().projection(proj)(d))
            .attr("class", (d) => "outline " + d.properties.CalLiteID)
            .attr("stroke", 'transparent')
            .attr("stroke-width", 1)
            .style("transform-origin", (d) => {
                const [x, y] = proj(d.geometry.coordinates[0][0][0]);

                return `${x}px ${y}px`;
            })
            .attr("fill", "#EFEBE0")
            .style('filter', 'drop-shadow(6px 6px 18px rgba(0, 0, 0, 0.3))');

        minimap
            .select(`.${constants.PAG_OBJECTIVE}`)
            .attr("fill", constants.PAG_COLOR)
            .raise();
        minimap
            .select(`.${constants.PRF_OBJECTIVE}`)
            .attr("fill", constants.PRF_COLOR).raise();
    }, []);

    return <svg className="tut-map-california" id="tut-map-california"></svg>;
}
