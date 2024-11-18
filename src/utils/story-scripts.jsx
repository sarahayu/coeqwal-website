import React from "react";

function initScripts() {
  return {
    howMuchIntro: (
      <div className="tut-text-card hero">
        <em>How much water do the people of California get?</em> Let's focus on
        two groups of people:
      </div>
    ),
    norCal: (
      <div className="tut-text-card">the agriculture group in the north...</div>
    ),
    soCal: (
      <div className="tut-text-card">...and the refuge group in the south.</div>
    ),
    barsExplain: (
      <div className="tut-text-card">
        Here, it is presented as bar graphs, with the bottom axis representing
        the year and the side axis representing the amount of water delivered in
        thousand acre-feet (TAF).
      </div>
    ),
    barsCondense: (
      <div className="tut-text-card">
        We'll condense each bar graph into a single bar with a filled gradient.
      </div>
    ),
    bucketsFill: (
      <div className="tut-text-card">
        What we get are buckets of water showing which water levels are most
        likely, with the darker areas being the most likely water levels.
        <span className="supplement-card-info">
          Visuals made using{" "}
          <a href="https://sarahayu.github.io/bucket-glyph/" target="_blank">
            Bucket-Glyph
          </a>
        </span>
      </div>
    ),
    comparingTheTwo: <span></span>,
    forNowLetsFocus: <span></span>,
    ifChangeReality: (
      <div className="tut-text-card">
        But what if we could <em>change reality</em>? What if we could increase
        the likelihood of delivering as much water as possible by changing the
        way we manage it?
      </div>
    ),
    fortunateCanExplore: (
      <div className="tut-text-card">
        Fortunately, we can explore those possibilities with the help of a
        simulator called
        <b> CalSim</b>.
      </div>
    ),
    theseVarsCalled: (
      <div className="tut-text-card">
        These variations are called <em>scenarios</em> and are labelled with
        unique numbers. Our reality is a scenario with no variables changed,
        labelled scenario 0000.
      </div>
    ),
    atAGlance: (
      <div className="tut-text-card">
        At a glance, we can easily see that scenario 0020 appears to be the best
        scenario since the darker water levels reach higher than those of the
        other scenarios. To more concretely compare these scenarios, however,
        we'll use a different view.
      </div>
    ),
    tryMoveRed: (
      <div className="tut-text-card">
        Try moving the red line to change the minimum demand and see how well
        each of these scenarios meet those demands.
      </div>
    ),
    soWhyNot: (
      <div className="tut-text-card">
        So why don't we just choose the best scenario? Well, it's because it's
        not just this group that wants water. Other groups, which we call{" "}
        <em>objectives</em>, want scenarios that best fit <em>them.</em>
      </div>
    ),
    letsBringRefuge: <span></span>,
  };
}

export const scripts = initScripts();
