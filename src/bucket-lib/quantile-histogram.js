import * as d3 from "d3";
import { quantileBins, ticksExact } from "./utils";

export function getQuantileBins(data, domain, unitsPerQuantile, width, height) {
  const numQuantiles = data.length / unitsPerQuantile;
  let histBins = d3
    .histogram()
    .value((d) => d)
    .domain(domain)
    .thresholds(
      ticksExact(...domain, Math.ceil(width / (height / numQuantiles)))
    )(data);

  let binnedQuantiles = quantileBins(histBins, unitsPerQuantile, numQuantiles);

  let quantiles = [];

  for (let b = 0; b < binnedQuantiles.length; b++) {
    for (let y = 0; y < binnedQuantiles[b]; y++) {
      quantiles.push([
        (histBins[b].x1 + histBins[b].x0) / 2,
        ((y + 0.5) / numQuantiles) * data.length,
      ]);
    }
  }

  return quantiles;
}
