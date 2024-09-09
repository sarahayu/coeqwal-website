import React from "react";

function initScripts() {
  return {
    howMuchIntro: (
      <div className="tut-text-card">
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
    barsAppear: (
      <div className="tut-text-card">
        This is the average yearly amount of water each group receives,
        specifically from the <b>Central Valley Project</b>, one of two water
        municipalities in California.
      </div>
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
      </div>
    ),
    comparingTheTwo: (
      <div className="tut-text-card">
        Comparing the two, we see that the maximum water level for the refuge
        group is more than the agriculture group. Additionally, the refuge
        group's water level is more consistent than that of the agriculture
        group, with 1/3 maximum capacity being the most likely water level.
      </div>
    ),
    butTheAgGroup: (
      <div className="tut-text-card">
        But the agriculture group has some chances of reaching higher than the
        refuge group's most likely water level, judging from the light blue
        levels that are situated above the 1/3 mark.
      </div>
    ),
    overallIfWantReliable: (
      <div className="tut-text-card" style={{ marginBottom: "80vh" }}>
        Overall, if we want a reliable supply we would want the refuge group's
        deliveries, but if we want a chance at higher supplies of water albeit
        with more inconsistent results, we would want the agriculture group's
        deliveries.
      </div>
    ),
    forNowLetsFocus: (
      <div className="tut-text-card">
        For now, let's focus on the agriculture group. Here it is as a drop of
        water. We see here that the lightest color reaches the midpoint of the
        maximum water possible, meaning that there is a chance 600 TAF of water
        will be delivered to this group.
      </div>
    ),
    darkerColsIndic: (
      <div className="tut-text-card">
        The darker colors, however, indicate that it's more likely that less
        than a quarter of the maximum, or around 300 TAF, will be delivered. As
        we'll later see, this is not a lot compared to other areas of
        California.
      </div>
    ),
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
      <div className="tut-text-card" style={{ marginBottom: "120vh" }}>
        Try moving the red line to change the minimum demand and see how well
        each of these scenarios meet those demands.
      </div>
    ),
    collectAllScen: (
      <div className="tut-text-card">
        We'll collect all the possible scenarios and sort them by their average
        deliveries.
      </div>
    ),
    soWhyNot: (
      <div className="tut-text-card">
        So why don't we just choose the best scenario? Well, it's because it's
        not just this group that wants water. Other groups, which we call{" "}
        <em>objectives</em>, want scenarios that best fit <em>them.</em>
      </div>
    ),
    letsBringRefuge: (
      <div className="tut-text-card" style={{ marginBottom: "120vh" }}>
        Let's bring back the refuge group. The scenarios that benefit the
        agriculture group do not always benefit the refuge group, and vice
        versa. Hover over the waterdrops to see how the same scenarios place for
        each objective. (Can you find a scenario that benefits both?)
      </div>
    ),
  };
}

export const scripts = initScripts();
