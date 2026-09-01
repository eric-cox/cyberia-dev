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
    },
    // Опыт и уровни (см. sim/Experience.js): убийство даёт опыт,
    // уровень увеличивает максимум жизни на hpPerLevel.
    xp: {
      hpPerLevel: 20, // прирост макс. жизни за уровень
      baseXp: 40, // опыт для перехода 1 → 2
      xpGrowth: 40, // на сколько больше нужно за каждый следующий
    },
    enemies: {
      // «полярный множитель» силы: центр → край
      edgeScaleRange: [1.0, 1.6],
      // Зоны — кольца в тайлах от центра карты:
      // «центр» — где игрок начинает, «край» — окраины.
      zones: {
        center: [13, 36],
        edge: [36, 57],
      },
      // Сколько врагов каждого типа появится в каждой зоне:
      // диапазоны [min, max] — точное число разыгрывается каждый
      // забег. Разброс намеренно узкий: max = min + 1.
      // Дробные значения = вероятность: голем [0.3, 0.3] —
      // ровно один, и только с шансом 30%.
      types: {
        mouse: { center: [8, 9], edge: [16, 17] },
        wolf: { center: [6, 7], edge: [4, 5] },
        boar: { center: [3, 4], edge: [5, 6] },
        brute: { center: [0, 1], edge: [3, 4] },
        rhino: { center: [0, 1], edge: [2, 3] },
        golem: { center: [0, 0], edge: [0.3, 0.3] },
      },
    },
    loot: {
      // кольца [minR, maxR] в тайлах для каждого тира артефактов
      rings: { 1: [9, 18], 2: [16, 34], 3: [30, 55] },
      // Лут какого максимального тира надевается АВТОМАТИЧЕСКИ во
      // время забега. Всё, что выше (продвинутый лут), уходит в
      // схрон — надеть его можно только между играми.
      // 1 = автонадевание только для тира I; 0 = ничего не надевать.
      autoEquipMaxTier: 1,
    },
    // Погода (см. render/Weather.js): весь снег несёт единый
    // ветер (windChange — как часто он меняет сторону); снег
    // белый, но с шансом darkChance переходит в серо-чёрную
    // фазу на darkPhase секунд; периодически налетает метель —
    // зона, где снега кратно больше (blizzard*).
    weather: {
      darkChance: 0.1, // вероятность тёмной фазы при каждой проверке
      whitePhase: [90, 180], // сек белой фазы до следующей проверки
      darkPhase: [60, 120], // длительность серо-чёрной фазы (1–2 мин)
      windChange: [12, 28], // сек между сменами направления ветра
      windStrength: [45, 95], // сила ветра, px/сек
      blizzardEvery: [50, 100], // сек между попытками метели
      blizzardChance: 0.4, // шанс, что попытка случится
      blizzardDuration: [16, 30], // сколько живёт зона (сек)
      blizzardRadius: [220, 380], // радиус зоны, px
      blizzardFlakes: 600, // снежинок в зоне — кратный прирост
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
