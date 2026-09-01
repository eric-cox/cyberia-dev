// ============================================================
//  systems/Difficulty — ЕДИНЫЙ источник всех балансировочных
//  чисел. Потребители: Simulation (тепло/жизнь), EnemyFactory
//  (численность и сила зверей), RunLoot (кольца артефактов).
//
//  Расширение: добавьте профиль («easy», «hard», «event…»):
//    PROFILES.hard = { ...deep-merge-override... }
//  и выбирайте его в Game по режиму / сезону / подписке.
// ============================================================

const PROFILES = {
  default: {
    player: {
      maxHeat: 100,
      maxHp: 100,
      speed: 96,
    },
    heat: {
      baseDrain: 1.7, // тепло/сек без одежды
      coldDrain: 8.5, // жизнь/сек при heat == 0 (× exposure)
      chillDrain: 1.4, // жизнь/сек при heat < chillBelow (× exposure)
      chillBelow: 25, // порог обморожения
      regen: 2, // жизнь/сек при heat > regenAbove
      regenAbove: 55,
      orbHp: 5, // жизнь с орба (тепло убийства НЕ дают)
    },
    enemies: {
      // «полярный множитель» силы: центр → край
      edgeMul: [1.0, 1.6],
      // Зоны — кольца в тайлах от центра карты:
      // «центр» — где игрок начинает, «край» — окраины.
      zones: {
        center: [13, 36],
        edge: [36, 57],
      },
      // Сколько врагов каждого типа появится в каждой зоне:
      // диапазоны [min, max] — точное число разыгрывается каждый забег.
      // Дробные значения = вероятность: голем [0.3, 0.3] —
      // ровно один, и только с шансом 30%.
      types: {
        mouse: { center: [8, 16], edge: [16, 32] },
        wolf: { center: [6, 10], edge: [4, 7] },
        boar: { center: [3, 5], edge: [5, 9] },
        brute: { center: [0, 2], edge: [3, 6] },
        rhino: { center: [0, 0], edge: [2, 5] },
        golem: { center: [0, 0], edge: [0.3, 0.3] },
      },
    },
    loot: {
      // кольца [minR, maxR] в тайлах для каждого тира артефактов
      rings: { 1: [9, 18], 2: [16, 34], 3: [30, 55] },
    },
  },
};

// Глубокое слияние базового профиля с переопределениями
function merge(base, over) {
  const out = { ...base };
  for (const k of Object.keys(over || {})) {
    out[k] =
      over[k] && typeof over[k] === "object" && !Array.isArray(over[k])
        ? merge(base[k], over[k])
        : over[k];
  }
  return out;
}

export function registerProfile(name, overrides) {
  PROFILES[name] = merge(PROFILES.default, overrides);
}

export function getDifficulty(name = "default") {
  return PROFILES[name] || PROFILES.default;
}
