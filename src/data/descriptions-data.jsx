import { mapBy } from "utils/misc-utils";

async function initDescriptionsData() {
  const objs = await (await fetch("./descriptions.json")).json();

  console.log("DATA: loading descriptions data");

  return mapBy(objs, ({ id }) => id);
}

export const descriptionsData = await initDescriptionsData();
