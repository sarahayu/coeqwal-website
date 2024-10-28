import { mapBy } from "utils/misc-utils";

async function initDescriptionsData() {
  console.log("DATA: loading descriptions tutorial data");

  const objs = await (await fetch("./descriptions_tutorial.json")).json();

  // any data preprocessing goes here. none for now.

  return mapBy(objs, ({ id }) => id);
}

export const descriptionsData = await initDescriptionsData();