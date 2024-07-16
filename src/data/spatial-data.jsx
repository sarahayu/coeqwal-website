export const SPATIAL_DATA = await (async function load() {
  const objs = await (await fetch("./callite_spatial.json")).json();

  console.log("DATA: loading callite spatial data");

  return objs;
})();
