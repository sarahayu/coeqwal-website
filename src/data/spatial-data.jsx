import { mapBy } from "utils/misc-utils";

async function initSpatialData() {
  const SPATIAL_DATA = await (async function load() {
    console.log("DATA: loading callite spatial data");

    const objs = await (await fetch("./callite_spatial.json")).json();

    // any data preprocessing goes here. none for now.

    return objs;
  })();

  const SPATIAL_FEATURES = (function () {
    return mapBy(
      SPATIAL_DATA.features,
      ({ properties }) => properties.CalLiteID
    );
  })();

  const CALIFORNIA_OUTLINE = await (async function load() {
    console.log("DATA: loading california spatial data");

    const objs = await (await fetch("./california.json")).json();

    // any data preprocessing goes here. none for now.

    return objs;
  })();

  const CALIFORNIA_CENTER = [-119, 37.7749];

  return {
    SPATIAL_DATA,
    SPATIAL_FEATURES,
    CALIFORNIA_OUTLINE,
    CALIFORNIA_CENTER,
  };
}

export const spatialData = await initSpatialData();
