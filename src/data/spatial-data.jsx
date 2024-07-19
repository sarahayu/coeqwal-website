import { mapBy } from "utils/misc-utils";

export const SPATIAL_DATA = await (async function load() {
  const objs = await (await fetch("./callite_spatial.json")).json();

  console.log("DATA: loading callite spatial data");

  return objs;
})();

export const SPATIAL_FEATURES = (function () {
  return mapBy(SPATIAL_DATA.features, ({ properties }) => properties.CalLiteID);
})();

export const CALIFORNIA_OUTLINE = await (async function load() {
  const objs = await (await fetch("./california.json")).json();

  console.log("DATA: loading california spatial data");

  return objs;
})();
