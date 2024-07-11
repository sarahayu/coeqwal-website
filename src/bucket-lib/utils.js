import * as d3 from "d3";
import { useRef } from "react";

// inclusive
export function ticksExact(start, stop, count) {
  return d3.range(count).map((i) => (i / (count - 1)) * (stop - start) + start);
}

export function bucketPath(width, height, filled = 1.0, taper = 0.8) {
  let bottomRight = width * taper + (width * (1 - taper)) / 2,
    bottomLeft = (width * (1 - taper)) / 2;
  let data = [
    {
      x: d3.interpolate(bottomRight, width)(filled),
      y: d3.interpolate(height, 0)(filled),
    },
    { x: bottomRight, y: height },
    { x: bottomLeft, y: height },
    {
      x: d3.interpolate(bottomLeft, 0)(filled),
      y: d3.interpolate(height, 0)(filled),
    },
  ];
  let lineFunc = d3
    .line()
    .x(function (d) {
      return d.x;
    })
    .y(function (d) {
      return d.y;
    });
  return lineFunc(data) + "z";
}

export function quantileBins(numericBins, unitsPerQuantile, maxQuantiles) {
  let quantileBins = numericBins.map((bin) =>
    Math.round(bin.length / unitsPerQuantile)
  );
  let sum = d3.sum(quantileBins);

  while (sum > maxQuantiles) {
    quantileBins[
      d3.minIndex(numericBins, (d, i) =>
        d.length !== 0
          ? d.length / unitsPerQuantile - quantileBins[i]
          : Infinity
      )
    ] -= 1;

    sum = d3.sum(quantileBins);
  }

  while (sum < maxQuantiles) {
    quantileBins[
      d3.maxIndex(numericBins, (d, i) =>
        d.length !== 0
          ? d.length / unitsPerQuantile - quantileBins[i]
          : -Infinity
      )
    ] += 1;

    sum = d3.sum(quantileBins);
  }

  return quantileBins;
}

// https://www.developerway.com/posts/implementing-advanced-use-previous-hook
export function usePrevious(value, isEqualFunc) {
  // initialise the ref with previous and current values
  const ref = useRef({
    value: value,
    prev: null,
  });

  const current = ref.current.value;

  // if the value passed into hook doesn't match what we store as "current"
  // move the "current" to the "previous"
  // and store the passed value as "current"
  if (isEqualFunc ? !isEqualFunc(value, current) : value !== current) {
    ref.current = {
      value: value,
      prev: current,
    };
  }

  // return the previous value only
  return ref.current.prev;
}

export const interpolateWatercolorBlue = (i) =>
  d3.interpolateBlues(d3.scaleLinear([0.2, 1.0])(i));
