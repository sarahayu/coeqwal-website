import * as d3 from "d3";
import { constants } from "utils/tutorialview-utils";

import { objectivesData } from "data/objectives-tutorial-data";
import { hideElems, showElems } from "utils/render-utils";

function initAllAnims() {
  function initShowLocationAnimGroup() {
    function showPAGDo() {
      d3.select("#tut-minimap")
        .select(".outline." + constants.PAG_OBJECTIVE)
        .style("scale", 10)
        .transition()
        .style("scale", 1)
        .attr("fill", "gray");
    }

    function showPAGUndo() {
      d3.select("#tut-minimap")
        .select(".outline." + constants.PAG_OBJECTIVE)
        .style("scale", 1)
        .transition()
        .attr("fill", "transparent");
    }

    function showPRFDo() {
      d3.select("#tut-minimap")
        .select(".outline." + constants.PAG_OBJECTIVE)
        .style("scale", 1)
        .transition()
        .attr("fill", "transparent");
      d3.select("#tut-minimap")
        .select(".outline." + constants.PRF_OBJECTIVE)
        .style("scale", 10)
        .transition()
        .style("scale", 1)
        .attr("fill", "gray");
    }

    function showPRFUndo() {
      d3.select("#tut-minimap")
        .select(".outline." + constants.PAG_OBJECTIVE)
        .style("scale", 10)
        .transition()
        .style("scale", 1)
        .attr("fill", "gray");
      d3.select("#tut-minimap")
        .select(".outline." + constants.PRF_OBJECTIVE)
        .transition()
        .attr("fill", "transparent");
    }

    return {
      showPAG: {
        do: showPAGDo,
        undo: showPAGUndo,
      },
      showPRF: {
        do: showPRFDo,
        undo: showPRFUndo,
      },
    };
  }

  function initChartAnimGroup() {
    let _pagX;
    let _prfX;
    let _pagXAxis;
    let _prfXAxis;
    let _pagDataDescending;
    let _prfDataDescending;

    const BAR_CHART_MARGIN = { top: 40, right: 30, bottom: 40, left: 60 };

    function prepareSVG() {
      // PAG
      {
        const svgGroup = d3
          .select("#pag-bar-graph")
          .attr(
            "width",
            constants.BAR_CHART_WIDTH +
              BAR_CHART_MARGIN.left +
              BAR_CHART_MARGIN.right
          )
          .attr(
            "height",
            constants.BAR_CHART_HEIGHT +
              BAR_CHART_MARGIN.top +
              BAR_CHART_MARGIN.bottom
          )
          .attr("opacity", 1)
          .append("g")
          .attr("class", "svg-group")
          .attr(
            "transform",
            `translate(${BAR_CHART_MARGIN.left},${BAR_CHART_MARGIN.top})`
          );

        const dataDescending = objectivesData.OBJECTIVES_DATA[
          constants.PAG_OBJECTIVE
        ][objectivesData.BASELINE_YRLY_KEY_STRING]
          .map((val, placeFromLeft) => ({
            val,
            placeFromLeft,
            year: placeFromLeft + 1,
          }))
          .sort(d3.descending);

        const x = d3
          .scaleBand()
          .domain(dataDescending.map(({ year }) => year).sort(d3.ascending))
          .range([0, constants.BAR_CHART_WIDTH])
          .padding(0.4);
        const y = d3
          .scaleLinear()
          .domain([0, objectivesData.MAX_DELIVS])
          .range([constants.BAR_CHART_HEIGHT, 0]);

        const xaxis = d3
          .axisBottom(x)
          .tickSize(0)
          .tickFormat((d) => `year ${d}`)
          .tickValues(
            x.domain().filter((_, i) => i === 0 || (i + 1) % 10 === 0)
          );

        svgGroup.append("g").attr("class", "anim-xaxis");
        svgGroup.append("g").attr("class", "axis-y");
        svgGroup
          .select(".anim-xaxis")
          .attr("opacity", 1)
          .attr("transform", `translate(0, ${constants.BAR_CHART_HEIGHT})`)
          .call(xaxis)
          .selectAll("text")
          .attr("transform", "translate(-10,0)rotate(-45)")
          .style("text-anchor", "end");
        svgGroup.select(".axis-y").call(d3.axisLeft(y));

        _pagX = x;
        _pagXAxis = xaxis;
        _pagDataDescending = dataDescending;
      }

      // PRF
      {
        const svgGroup = d3
          .select("#prf-bar-graph")
          .attr(
            "width",
            constants.BAR_CHART_WIDTH +
              BAR_CHART_MARGIN.left +
              BAR_CHART_MARGIN.right
          )
          .attr(
            "height",
            constants.BAR_CHART_HEIGHT +
              BAR_CHART_MARGIN.top +
              BAR_CHART_MARGIN.bottom
          )
          .attr("opacity", 1)
          .append("g")
          .attr("class", "svg-group")
          .attr(
            "transform",
            `translate(${BAR_CHART_MARGIN.left},${BAR_CHART_MARGIN.top})`
          );

        const dataDescending = objectivesData.OBJECTIVES_DATA[
          constants.PRF_OBJECTIVE
        ][objectivesData.BASELINE_YRLY_KEY_STRING]
          .map((val, placeFromLeft) => ({
            val,
            placeFromLeft,
            year: placeFromLeft + 1,
          }))
          .sort(d3.descending);

        const x = d3
          .scaleBand()
          .domain(dataDescending.map(({ year }) => year).sort(d3.ascending))
          .range([0, constants.BAR_CHART_WIDTH])
          .padding(0.4);
        const y = d3
          .scaleLinear()
          .domain([0, objectivesData.MAX_DELIVS])
          .range([constants.BAR_CHART_HEIGHT, 0]);

        const xaxis = d3
          .axisBottom(x)
          .tickSize(0)
          .tickFormat((d) => `year ${d}`)
          .tickValues(
            x.domain().filter((_, i) => i === 0 || (i + 1) % 10 === 0)
          );

        svgGroup.append("g").attr("class", "anim-xaxis");
        svgGroup.append("g").attr("class", "axis-y");
        svgGroup
          .select(".anim-xaxis")
          .attr("opacity", 1)
          .attr("transform", `translate(0, ${constants.BAR_CHART_HEIGHT})`)
          .call(xaxis)
          .selectAll("text")
          .attr("transform", "translate(-10,0)rotate(-45)")
          .style("text-anchor", "end");
        svgGroup.select(".axis-y").call(d3.axisLeft(y));

        _prfX = x;
        _prfXAxis = xaxis;
        _prfDataDescending = dataDescending;
      }
    }

    function barsAppearDo() {
      // PAG
      {
        const y = d3
          .scaleLinear()
          .domain([0, objectivesData.MAX_DELIVS])
          .range([constants.BAR_CHART_HEIGHT, 0]);

        d3.select("#pag-bar-graph .svg-group")
          .selectAll(".bars")
          .data(_pagDataDescending, (d) => d.placeFromLeft)
          .join("rect")
          .attr("class", "bars")
          .attr("x", (d) => _pagX(d.year))
          .attr("y", constants.BAR_CHART_HEIGHT)
          .attr("width", _pagX.bandwidth())
          .attr("height", 0)
          .attr("opacity", 1)
          .attr("fill", "steelblue")
          .transition()
          .duration(500)
          .delay((d) => d.placeFromLeft * 10)
          .attr("y", (d) => y(d.val))
          .attr("height", (d) => constants.BAR_CHART_HEIGHT - y(d.val));
      }

      // PRF
      {
        const y = d3
          .scaleLinear()
          .domain([0, objectivesData.MAX_DELIVS])
          .range([constants.BAR_CHART_HEIGHT, 0]);

        d3.select("#prf-bar-graph .svg-group")
          .selectAll(".bars")
          .data(_prfDataDescending, (d) => d.placeFromLeft)
          .join("rect")
          .attr("class", "bars")
          .attr("x", (d) => _prfX(d.year))
          .attr("y", constants.BAR_CHART_HEIGHT)
          .attr("width", _prfX.bandwidth())
          .attr("height", 0)
          .attr("opacity", 1)
          .attr("fill", "steelblue")
          .transition()
          .duration(500)
          .delay((d) => d.placeFromLeft * 10)
          .attr("y", (d) => y(d.val))
          .attr("height", (d) => constants.BAR_CHART_HEIGHT - y(d.val));
      }
    }

    function barsAppearUndo() {
      // PAG
      {
        d3.select("#pag-bar-graph .svg-group")
          .selectAll(".bars")
          .data(_pagDataDescending, (d) => d.placeFromLeft)
          .transition()
          .duration(500)
          .delay((d) => (_pagDataDescending.length - d.placeFromLeft - 1) * 10)
          .attr("y", constants.BAR_CHART_HEIGHT)
          .attr("height", 0);
      }

      // PRF
      {
        d3.select("#prf-bar-graph .svg-group")
          .selectAll(".bars")
          .data(_prfDataDescending, (d) => d.placeFromLeft)
          .transition()
          .duration(500)
          .delay((d) => (_prfDataDescending.length - d.placeFromLeft - 1) * 10)
          .attr("y", constants.BAR_CHART_HEIGHT)
          .attr("height", 0);
      }
    }

    async function barsCondenseDo() {
      // PAG
      {
        const newWidth = constants.BAR_CHART_WIDTH / 8;
        const svgGroup = d3.select("#pag-bar-graph .svg-group");

        svgGroup.select(".anim-xaxis").call(_pagXAxis.tickFormat(""));

        const bars = svgGroup.selectAll(".bars");

        bars
          .style("mix-blend-mode", "multiply")
          .transition()
          .duration(500)
          .attr("opacity", 0.05)
          .transition()
          .delay(
            (d) =>
              100 +
              (1 - (1 - d.placeFromLeft / _pagDataDescending.length) ** 4) *
                1000
          )
          .duration(500)
          .attr("width", newWidth)
          .attr("x", constants.BAR_CHART_WIDTH / 2 - newWidth / 2)
          .end()
          .catch(() => {})
          .then(() => {
            svgGroup
              .select(".anim-xaxis")
              .transition()
              .transition(500)
              .attr(
                "transform",
                `translate(0, ${constants.BAR_CHART_HEIGHT + 50})`
              )
              .attr("opacity", 0);

            bars.transition().delay(500).attr("x", 0);

            svgGroup
              .transition()
              .delay(500)
              .attr(
                "transform",
                `translate(${
                  BAR_CHART_MARGIN.left +
                  constants.BAR_CHART_WIDTH / 2 -
                  newWidth / 2
                },${BAR_CHART_MARGIN.top})`
              );
          });
      }

      // PRF
      {
        const newWidth = constants.BAR_CHART_WIDTH / 8;
        const svgGroup = d3.select("#prf-bar-graph .svg-group");

        svgGroup.select(".anim-xaxis").call(_prfXAxis.tickFormat(""));

        const bars = svgGroup.selectAll(".bars");

        bars
          .style("mix-blend-mode", "multiply")
          .transition()
          .duration(500)
          .attr("opacity", 0.05)
          .transition()
          .delay(
            (d) =>
              100 +
              (1 - (1 - d.placeFromLeft / _prfDataDescending.length) ** 4) *
                1000
          )
          .duration(500)
          .attr("width", newWidth)
          .attr("x", constants.BAR_CHART_WIDTH / 2 - newWidth / 2)
          .end()
          .catch(() => {})
          .then(() => {
            svgGroup
              .select(".anim-xaxis")
              .transition()
              .transition(500)
              .attr(
                "transform",
                `translate(0, ${constants.BAR_CHART_HEIGHT + 50})`
              )
              .attr("opacity", 0);

            bars.transition().delay(500).attr("x", 0);

            svgGroup
              .transition()
              .delay(500)
              .attr(
                "transform",
                `translate(${
                  BAR_CHART_MARGIN.left +
                  constants.BAR_CHART_WIDTH / 2 -
                  newWidth / 2
                },${BAR_CHART_MARGIN.top})`
              );
          });
      }
    }

    function barsCondenseUndo() {
      // PAG
      {
        const svgGroup = d3.select("#pag-bar-graph .svg-group");

        const bars = svgGroup.selectAll(".bars");

        svgGroup
          .select(".anim-xaxis")
          .transition()
          .transition(500)
          .attr("transform", `translate(0, ${constants.BAR_CHART_HEIGHT})`)
          .attr("opacity", 1);

        svgGroup
          .select(".anim-xaxis")
          .call(_pagXAxis.tickFormat((d) => `year ${d}`));

        svgGroup
          .transition()
          .delay(500)
          .attr(
            "transform",
            `translate(${BAR_CHART_MARGIN.left},${BAR_CHART_MARGIN.top})`
          );

        bars
          .transition()
          .delay(
            (d) =>
              100 +
              (1 - (d.placeFromLeft / _pagDataDescending.length) ** 4) * 1000
          )
          .duration(500)
          .attr("x", (d) => _prfX(d.year))
          .attr("width", _pagX.bandwidth())
          .transition()
          .duration(500)
          .attr("opacity", 1)
          .end()
          .catch(() => {})
          .then(() => {
            bars.style("mix-blend-mode", "normal");
          });
      }

      // PRF
      {
        const svgGroup = d3.select("#prf-bar-graph .svg-group");

        const bars = svgGroup.selectAll(".bars");

        svgGroup
          .select(".anim-xaxis")
          .transition()
          .transition(500)
          .attr("transform", `translate(0, ${constants.BAR_CHART_HEIGHT})`)
          .attr("opacity", 1);

        svgGroup
          .select(".anim-xaxis")
          .call(_prfXAxis.tickFormat((d) => `year ${d}`));

        svgGroup
          .transition()
          .delay(500)
          .attr(
            "transform",
            `translate(${BAR_CHART_MARGIN.left},${BAR_CHART_MARGIN.top})`
          );

        bars
          .transition()
          .delay(
            (d) =>
              100 +
              (1 - (d.placeFromLeft / _prfDataDescending.length) ** 4) * 1000
          )
          .duration(500)
          .attr("x", (d) => _prfX(d.year))
          .attr("width", _prfX.bandwidth())
          .transition()
          .duration(500)
          .attr("opacity", 1)
          .end()
          .catch(() => {})
          .then(() => {
            bars.style("mix-blend-mode", "normal");
          });
      }
    }

    prepareSVG();

    return {
      barsAppear: {
        do: barsAppearDo,
        undo: barsAppearUndo,
      },
      barsCondense: {
        do: barsCondenseDo,
        undo: barsCondenseUndo,
      },
    };
  }

  function initBucketsFillAnim({ deps }) {
    function animDo() {
      d3.selectAll(".tut-graph-wrapper .bucket-wrapper").style(
        "display",
        "initial"
      );
      d3.select("#pag-bar-graph").attr("opacity", 0);
      d3.select("#prf-bar-graph").attr("opacity", 0);

      deps.setBucketInterperPAG(() => constants.PAG_INTERPER);
      deps.setBucketInterperPRF(() => constants.PRF_INTERPER);
    }

    function animUndo() {
      deps.setBucketInterperPAG(() => d3.scaleLinear().range([0, 0]));
      deps.setBucketInterperPRF(() => d3.scaleLinear().range([0, 0]));

      d3.selectAll(".tut-graph-wrapper .bucket-wrapper").style(
        "display",
        "none"
      );
      d3.select("#pag-bar-graph").transition().attr("opacity", 1);
      d3.select("#prf-bar-graph").transition().attr("opacity", 1);
    }

    return {
      do: animDo,
      undo: animUndo,
    };
  }

  function initMoveBucketsAnim({ deps }) {
    function animDo() {
      showElems(".ag-annot, .ref-annot");
    }

    function animUndo() {
      hideElems(".ag-annot, .ref-annot");
    }

    return {
      do: animDo,
      undo: animUndo,
    };
  }

  function initDropFillAnim({ deps }) {
    function animDo() {
      deps.setDropInterper(() => constants.PAG_INTERPER_DROP);
    }

    function animUndo() {
      deps.setDropInterper(() => d3.scaleLinear().range([0, 0]));
    }

    return {
      do: animDo,
      undo: animUndo,
    };
  }

  function initChangeRealityAnim() {
    function animDo() {
      d3.selectAll(".vardrop")
        .style("display", "initial")
        .classed("hasarrow", true);

      hideElems(
        ".main-waterdrop .objective-label, .main-waterdrop .volume-not-height, .waterdrop-explain-pag"
      );
    }

    function animUndo() {
      d3.selectAll(".vardrop")
        .style("display", "none")
        .classed("hasarrow", false);

      showElems(
        ".main-waterdrop .objective-label, .main-waterdrop .volume-not-height, .waterdrop-explain-pag"
      );
    }

    return {
      do: animDo,
      undo: animUndo,
    };
  }

  function initFillVarDropsAnim({ deps }) {
    function animDo() {
      d3.selectAll(".vardrop path").style("stroke-dasharray", "none");
      deps.setVariationInterpers(constants.VARIATIONS_INTERPERS);
    }

    function animUndo() {
      d3.selectAll(".vardrop path").style("stroke-dasharray", "10 10");
      deps.setVariationInterpers(
        constants.VARIATIONS.map(() => d3.scaleLinear().range([0, 0]))
      );
    }

    return {
      do: animDo,
      undo: animUndo,
    };
  }

  function initShowScenLabelAnim() {
    return {
      do: function () {
        d3.selectAll(".var-scen-label").style("display", "block");
      },
      undo: function () {
        d3.selectAll(".var-scen-label").style("display", "none");
      },
    };
  }

  function initHighlightBestAnim() {
    return {
      do: function () {
        d3.select(".drop1").classed("highlighted", true);
      },
      undo: function () {
        d3.select(".drop1").classed("highlighted", false);
      },
    };
  }

  function initShowQuantilesAnim() {
    function animDo() {
      d3.select(".drop1").classed("highlighted", false);
      d3.selectAll(".vardrop").classed("hasarrow", false);

      d3.selectAll(".var-scen-label").style("opacity", "0.5");
      d3.selectAll(".var-scen-label, .scen-number").style("color", "gray");

      d3.select(".main-waterdrop")
        .transition()
        .style("transform", "translateY(-100px) scale(0.5)");
      // undo scaling of label due to shrinking div
      d3.select(".main-waterdrop .var-scen-label")
        .transition()
        .style("transform", "scale(2)");
      d3.selectAll(".drop1 .waterdrop-wrapper, .drop3 .waterdrop-wrapper")
        .transition()
        .style("transform", "translate(-50px, 15px) scale(0.5)");
      d3.selectAll(".drop2 .waterdrop-wrapper, .drop4 .waterdrop-wrapper")
        .transition()
        .style("transform", "translate(50px, 15px) scale(0.5)");

      d3.select(".main-histogram").style("display", "initial");
      d3.selectAll(".vardrop .dot-histogram-wrapper").style("display", "flex");
    }

    function animUndo() {
      d3.select(".drop1").classed("highlighted", true);
      d3.selectAll(".vardrop").classed("hasarrow", true);

      d3.selectAll(".var-scen-label").style("opacity", "1");
      d3.selectAll(".var-scen-label").style("color", "black");
      d3.selectAll(".scen-number").style("color", "#CC8F43");

      d3.select(".main-waterdrop").transition().style("transform", "none");
      // undo scaling of label due to shrinking div
      d3.select(".main-waterdrop .var-scen-label")
        .transition()
        .style("transform", "scale(1)");
      d3.selectAll(".drop1 .waterdrop-wrapper, .drop3 .waterdrop-wrapper")
        .transition()
        .style("transform", "none");
      d3.selectAll(".drop2 .waterdrop-wrapper, .drop4 .waterdrop-wrapper")
        .transition()
        .style("transform", "none");

      d3.select(".main-histogram").style("display", "none");
      d3.selectAll(".vardrop .dot-histogram-wrapper").style("display", "none");
    }

    return {
      do: animDo,
      undo: animUndo,
    };
  }

  function initComparerAnimGroup({ deps }) {
    function showPAGAnimDo() {
      hideElems(".scrollama-compare-scenobjs .waterdrop-graphics-wrapper");
      showElems(".scrollama-compare-scenobjs .tut-comparer-graphics-wrapper");
    }

    function showPAGAnimUndo() {
      showElems(
        ".scrollama-compare-scenobjs .waterdrop-graphics-wrapper",
        d3,
        "grid"
      );
      hideElems(".scrollama-compare-scenobjs .tut-comparer-graphics-wrapper");
    }

    function showPRFAnimDo() {
      deps.largeDropComparer.showOtherDrop();
    }

    function showPRFAnimUndo() {
      deps.largeDropComparer.hideOtherDrop();
    }

    return {
      showPAG: {
        do: showPAGAnimDo,
        undo: showPAGAnimUndo,
      },
      showPRF: {
        do: showPRFAnimDo,
        undo: showPRFAnimUndo,
      },
    };
  }

  return {
    initShowLocationAnimGroup,
    initChartAnimGroup,
    initBucketsFillAnim,
    initMoveBucketsAnim,
    initDropFillAnim,
    initChangeRealityAnim,
    initFillVarDropsAnim,
    initShowScenLabelAnim,
    initHighlightBestAnim,
    initShowQuantilesAnim,
    initComparerAnimGroup,
  };
}

export const animations = initAllAnims();
