// ============================================================
//  world/prefabs.js — каталог уличных объектов
//  Упрощённая версия: только коллизии, размер и цвет (KISS).
// ============================================================

export const PREFABS = {
  dumpster: { id: "dumpster", width: 2, height: 1, solid: true, color: "#3d4d6b" },
  concrete_block: { id: "concrete_block", width: 2, height: 1, solid: true, color: "#55688a" },
  cyber_car: { id: "cyber_car", width: 4, height: 2, solid: true, color: "#2a3444" },
  vending_machine: { id: "vending_machine", width: 1, height: 2, solid: true, color: "#3d4d6b" },
  crate: { id: "crate", width: 1, height: 1, solid: true, color: "#8a5a3a" },
  barrel: { id: "barrel", width: 1, height: 1, solid: true, color: "#55688a" },
  trash: { id: "trash", width: 1, height: 1, solid: false, color: "#4a4a4a" },
  puddle: { id: "puddle", width: 1, height: 1, solid: false, color: "rgba(100, 150, 200, 0.4)" },
};

export function getRandomPrefab(rng) {
  const keys = Object.keys(PREFABS);
  return PREFABS[keys[Math.floor(rng() * keys.length)]];
}
