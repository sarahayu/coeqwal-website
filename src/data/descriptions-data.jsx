import { mapBy } from "utils/misc-utils";

export const DESCRIPTIONS_DATA = await (async function load() {
  const objs = await (await fetch("./descriptions.json")).json();

  console.log("DATA: loading descriptions data");

  return mapBy(objs, ({ id }) => id);
})();
