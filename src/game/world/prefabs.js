// ============================================================
//  world/prefabs.js — каталог префабов (готовых структур)
//  Каждый префаб описывает объект с коллизиями, тегами и
//  неоновыми точками для свечения.
// ============================================================

export const PREFABS = {
  // --- Уличная мебель (высокая) ---
  dumpster: {
    id: "dumpster",
    width: 2,
    height: 1,
    collision: [[1, 1]],
    tags: ["cover_high", "wall_adjacent", "street_only"],
    neon: [{ x: 0.5, y: 0.2, color: "#ff0055", radius: 1.5 }],
    spawnWeight: 0.9,
  },
  concrete_block: {
    id: "concrete_block",
    width: 2,
    height: 1,
    collision: [[1, 1]],
    tags: ["cover_high", "wall_adjacent", "street_only"],
    neon: [],
    spawnWeight: 0.7,
  },
  cyber_car: {
    id: "cyber_car",
    width: 4,
    height: 2,
    collision: [
      [1, 1, 1, 1],
      [1, 1, 1, 1],
    ],
    tags: ["cover_high", "wall_adjacent", "street_only"],
    neon: [
      { x: 0.5, y: 0.3, color: "#6fd6ff", radius: 2 },
      { x: 3.5, y: 0.3, color: "#ff4757", radius: 2 },
    ],
    spawnWeight: 0.5,
  },
  vending_machine: {
    id: "vending_machine",
    width: 1,
    height: 2,
    collision: [[1], [1]],
    tags: ["cover_high", "wall_adjacent", "street_only"],
    neon: [{ x: 0.5, y: 1, color: "#7dff8a", radius: 1.5 }],
    spawnWeight: 0.8,
  },

  // --- Уличная мебель (низкая) ---
  crate: {
    id: "crate",
    width: 1,
    height: 1,
    collision: [[1]],
    tags: ["cover_low", "street_only"],
    neon: [],
    spawnWeight: 0.95,
  },
  barrel: {
    id: "barrel",
    width: 1,
    height: 1,
    collision: [[1]],
    tags: ["cover_low", "street_only"],
    neon: [],
    spawnWeight: 0.9,
  },

  // --- Мусор (без коллизий) ---
  trash: {
    id: "trash",
    width: 1,
    height: 1,
    collision: [[0]],
    tags: ["clutter", "street_only"],
    neon: [],
    spawnWeight: 0.98,
  },
  puddle: {
    id: "puddle",
    width: 1,
    height: 1,
    collision: [[0]],
    tags: ["clutter", "slippery"],
    neon: [],
    spawnWeight: 0.95,
  },
  cable: {
    id: "cable",
    width: 1,
    height: 1,
    collision: [[0]],
    tags: ["clutter", "street_only"],
    neon: [],
    spawnWeight: 0.97,
  },

  // --- Неон (без коллизий) ---
  neon_sign: {
    id: "neon_sign",
    width: 2,
    height: 1,
    collision: [[0, 0]],
    tags: ["neon", "wall_mounted"],
    neon: [
      { x: 1, y: 0.5, color: "#ff4757", radius: 2 },
      { x: 1, y: 0.5, color: "#6fd6ff", radius: 1.5 },
    ],
    spawnWeight: 0.6,
  },
  street_light: {
    id: "street_light",
    width: 1,
    height: 1,
    collision: [[0]],
    tags: ["neon", "street_only"],
    neon: [{ x: 0.5, y: 0.5, color: "#ffb347", radius: 3 }],
    spawnWeight: 0.7,
  },
};

// Функция для получения случайного префаба по тегам
export function getRandomPrefabByTags(tags, rng) {
  const candidates = Object.values(PREFABS).filter((p) =>
    tags.some((tag) => p.tags.includes(tag))
  );
  if (candidates.length === 0) return null;

  // Взвешенный выбор
  const totalWeight = candidates.reduce((sum, p) => sum + p.spawnWeight, 0);
  let roll = rng() * totalWeight;
  for (const prefab of candidates) {
    roll -= prefab.spawnWeight;
    if (roll <= 0) return prefab;
  }
  return candidates[candidates.length - 1];
}
