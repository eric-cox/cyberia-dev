// ============================================================
//  sim/enemies/EnemyFactory — расселение мутантов.
//  Исполняет декларативный конфиг из systems/Difficulty:
//  для каждого типа заданы диапазоны количества [min, max]
//  в двух зонах — «центр» и «край» (кольца тайлов от центра).
//
//    types: {
//      mouse: { center: [8, 9],   edge: [16, 17]  },
//      golem: { center: [0, 0],   edge: [0.3, 0.3] },
//      ...
//    }
//
//  Точное число разыгрывается каждый забег; дробная часть —
//  вероятность (0.3 → один голем с шансом 30%).
//
//  Размер и сила врага НЕ зависят от позиции: особи одного типа
//  всегда одинаковы. Разные типы различаются габаритами за счёт
//  размера арт-сетки при едином масштабе пикселя (см. WORLD.md §3).
// ============================================================
import { makeEnemy } from "./registry.js";

// Розыгрыш количества из диапазона [min, max].
// Дробная часть значения = вероятность ещё одной особи:
// [0.3, 0.3] → 0 или 1 с шансом 30%; [8, 16] → целое 8..16.
function rollCount([min, max], rng) {
  const v = min + rng() * (max - min);
  const n = Math.floor(v);
  return n + (rng() < v - n ? 1 : 0);
}

export function populateEnemies(map, rng, diff) {
  const cfg = diff.enemies;
  const { zones, types } = cfg;
  const enemies = [];

  // Рассев n особей одного типа в кольце [ring[0]..ring[1]]
  const spawnPack = (type, count, ring) => {
    for (let i = 0; i < count; i++) {
      const r = ring[0] + rng() * (ring[1] - ring[0]);
      const pos = map.freeSpot(r, Math.min(r + 3, 56), rng);
      enemies.push(makeEnemy(type, pos.x, pos.y, rng));
    }
  };

  for (const [type, ranges] of Object.entries(types)) {
    spawnPack(type, rollCount(ranges.center, rng), zones.center);
    spawnPack(type, rollCount(ranges.edge, rng), zones.edge);
  }

  return enemies;
}
