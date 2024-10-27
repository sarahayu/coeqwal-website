import { mapBy } from "utils/misc-utils";

async function initDescriptionsData() {
  const objs = await (await fetch("./descriptions_tutorial.json")).json();

  console.log("DATA: loading descriptions tutorial data");

  return mapBy(objs, ({ id }) => id);
}

export const descriptionsData = await initDescriptionsData();
