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
      holeDamage: 12, // разовый урон теплу при падении в провал
      holeDrain: 2.2, // тепло/сек, пока стоишь в провале
      coldDrain: 8.5, // жизнь/сек при heat == 0 (× exposure)
      chillDrain: 1.4, // жизнь/сек при heat < chillBelow (× exposure)
      chillBelow: 25, // порог обморожения
      regen: 2, // жизнь/сек при heat > regenAbove
      regenAbove: 55,
      orbHeat: 6, // тепло с орба
      orbHp: 5, // жизнь с орба
    },
    enemies: {
      count: 34,
      ringMin: 13, // ближайшее кольцо спавна (тайлы от центра)
      ringMax: 57,
      edgeMul: [1.0, 1.6], // «полярный множитель»: центр → край
      rhinoFrom: 42, // носороги водятся дальше этого радиуса
      // Стаи мышей: стая у центра и вдвое больше — по краям
      mice: {
        centerCount: 8,
        edgeCount: 16, // = 2 × centerCount
        centerRing: [13, 20], // тайлы от центра
        edgeRing: [44, 57],
      },
      // Ледяной голем: один на карту, шанс ~1/3, дальнее кольцо
      golem: { chance: 1 / 3, ringMin: 40, ringMax: 54 },
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
