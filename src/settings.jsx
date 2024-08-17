function initSettings() {
  const LOD_1_LEVELS = 5;
  const LOD_1_RAD_PX = 1;
  const LOD_1_MIN_LEV_VAL = 0.1;
  const LOD_1_SMALL_DROP_PAD_FACTOR = 1.3;
  const LOD_1_LARGE_DROP_PAD_FACTOR = 1.2;

  const LOD_2_SMALL_DROP_PAD_FACTOR = 3;

  const GROUP_HOVER_AREA_FACTOR = 1.1 / (1 + Math.SQRT1_2);
  const SPREAD_1_2 = LOD_2_SMALL_DROP_PAD_FACTOR / LOD_1_SMALL_DROP_PAD_FACTOR;

  return {
    LOD_1_LEVELS,
    LOD_1_RAD_PX,
    LOD_1_MIN_LEV_VAL,
    LOD_1_SMALL_DROP_PAD_FACTOR,
    LOD_1_LARGE_DROP_PAD_FACTOR,
    LOD_2_SMALL_DROP_PAD_FACTOR,
    GROUP_HOVER_AREA_FACTOR,
    SPREAD_1_2,
  };
}

export const settings = initSettings();
