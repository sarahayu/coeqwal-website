export const FACTORS_DATA = await (async function load() {
  const objs = await (await fetch("./factors.json")).json();

  console.log("DATA: loading factors data");

  return objs;
})();
