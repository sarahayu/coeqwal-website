import React from "react";

function initScripts() {
  return {
    barsExplain: (
      <>
        Here, the data is presented as bar graphs, with the bottom axis
        representing the year and the side axis representing the amount of water
        delivered in thousand acre-feet (TAF).
      </>
    ),
    barsCondense: (
      <>
        We'll condense each bar graph into a single bar with a filled gradient.
      </>
    ),
    bucketsFill: (
      <>
        What we get are containers of water showing which water levels are most
        likely, with the darker areas being the most likely water levels.
        <span className="supplement-card-info">
          Visuals made using{" "}
          <a href="https://sarahayu.github.io/bucket-glyph/" target="_blank">
            Bucket-Glyph
          </a>
        </span>
      </>
    ),
    comparingTheTwo: (
      <>
        If we want a reliable supply we would want the refuge group's
        deliveries, but if we want a chance at higher supplies of water however
        with more inconsistent results, we would want the agriculture group's
        deliveries.
      </>
    ),
    forNowLetsFocus: (
      <>
        There is a chance 600 TAF of water will be delivered to this group. The
        darker colors, however, indicate that it's more likely that slightly
        less than 600 TAF of water will be delivered — around 500 TAF. As we'll
        later see, this is not a lot compared to other areas of California.
      </>
    ),
    ifChangeReality: (
      <>
        But what if we could <em>change reality</em>? What if we could increase
        the likelihood of delivering as much water as possible by changing the
        way we manage it?
      </>
    ),
    fortunateCanExplore: (
      <>
        Fortunately, we can explore those possibilities with the help of a
        simulator called
        <b> CalSim</b>.
      </>
    ),
    theseVarsCalled: (
      <>
        These variations are called <em>scenarios</em> and are labelled with
        unique numbers. Our reality is a scenario with no variables changed,
        labelled scenario 0000.
      </>
    ),
    atAGlance: (
      <>
        At a glance, we can easily see that scenario 0020 appears to be the best
        scenario since the darker water levels reach higher than those of the
        other scenarios. To more concretely compare these scenarios, however,
        we'll use a different view.
      </>
    ),
    tryMoveRed: (
      <>
        Try moving the dotted line to change the minimum demand and see how well
        each of these scenarios meet those demands.
      </>
    ),
    soWhyNot: (
      <>
        So why don't we just choose the best scenario? Well, it's because it's
        not just this group that wants water. Other groups, which we call{" "}
        <em>objectives</em>, want scenarios that best fit <em>them.</em>
      </>
    ),
    letsBringRefuge: (
      <>
        The scenarios that benefit one objective do not always benefit another.
        Hover over the waterdrops to see how the same scenarios place for each
        objective. (Can you find a scenario that benefits both?)
      </>
    ),
  };
}

export const scripts = initScripts();
