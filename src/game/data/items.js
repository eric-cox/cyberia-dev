// ============================================================
//  РЕЕСТР АРТЕФАКТОВ
//  Одежда: cold — защита от холода (снижает потерю тепла).
//  Оружие: dmg / rate (ударов в сек) / range (дальность, px).
//    kind: "shotgun" — стрелковое; pellets/pelletDmg/pelletSpeed/
//    spread описывают пучок дроби (см. sim/Pellet.js).
// ============================================================

export const SLOT_NAMES = {
  hat: "ГОЛОВА",
  jacket: "КУРТКА",
  pants: "ШТАНЫ",
  boots: "САПОГИ",
  mittens: "ВАРЕЖКИ",
  weapon: "ОРУЖИЕ",
};

export const FISTS = {
  id: "fists",
  slot: "weapon",
  name: "Кулаки",
  tier: 0,
  dmg: 5,
  rate: 2.0,
  range: 20,
  art: null,
};

export const ITEMS = {
  // --- одежда ---
  hat1: { id: "hat1", slot: "hat", name: "Шапка-ушанка", tier: 1, cold: 8, art: "it_hat" },
  hat3: { id: "hat3", slot: "hat", name: "Ушанка сталкера", tier: 3, cold: 22, art: "it_hat" },
  jacket2: { id: "jacket2", slot: "jacket", name: "Куртка полярника", tier: 2, cold: 18, art: "it_jacket" },
  jacket3: { id: "jacket3", slot: "jacket", name: "Экзокостюм «Север»", tier: 3, cold: 28, art: "it_jacket" },
  pants1: { id: "pants1", slot: "pants", name: "Стеганые штаны", tier: 1, cold: 8, art: "it_pants" },
  pants3: { id: "pants3", slot: "pants", name: "Полярные штаны", tier: 3, cold: 22, art: "it_pants" },
  boots1: { id: "boots1", slot: "boots", name: "Бурки", tier: 1, cold: 7, art: "it_boots" },
  boots3: { id: "boots3", slot: "boots", name: "Полярные ботинки", tier: 3, cold: 19, art: "it_boots" },
  mittens1: { id: "mittens1", slot: "mittens", name: "Вязаные варежки", tier: 1, cold: 5, art: "it_mittens" },
  mittens2: { id: "mittens2", slot: "mittens", name: "Меховые варежки", tier: 2, cold: 9, art: "it_mittens" },
  // --- оружие ---
  knife1: { id: "knife1", slot: "weapon", name: "Ржавый нож", tier: 1, dmg: 10, rate: 2.4, range: 22, art: "it_knife" },
  knife2: { id: "knife2", slot: "weapon", name: "Охотничий нож", tier: 2, dmg: 15, rate: 2.6, range: 22, art: "it_knife" },
  crowbar1: { id: "crowbar1", slot: "weapon", name: "Лом", tier: 1, dmg: 20, rate: 1.35, range: 26, art: "it_crowbar" },
  crowbar3: { id: "crowbar3", slot: "weapon", name: "Монтировка «Гвоздь»", tier: 3, dmg: 36, rate: 1.15, range: 28, art: "it_crowbar" },
  // --- дробовик: 2 патрона в стволе, перезарядка 2 с, пучок дроби ---
  shotgun3: {
    id: "shotgun3", slot: "weapon", name: "Дробовик «Гроза»", tier: 3,
    kind: "shotgun",
    dmg: 9, // за дробинку (для сравнения в схроне)
    rate: 1.4, // выстрелов в сек (два подряд без перезарядки)
    range: 210,
    pellets: 7, // дробинок в пучке
    pelletDmg: 9, // урон каждой дробинки
    pelletSpeed: 380,
    spread: 0.42, // разлёт пучка, рад
    art: "shotgun", // тот же арт-модуль, что и оружие в руке
  },
};

export const TIER_COLORS = ["#9fb6cc", "#9fb6cc", "#6fd6ff", "#ffb347"];

// Полный объект предмета по id (для UI/снапшотов)
export function itemOf(id) {
  return ITEMS[id] || null;
}
