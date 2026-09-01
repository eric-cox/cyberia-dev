// ============================================================
//  sim/enemies/EnemyFactory — расселение мутантов.
//  Исполняет декларативный конфиг из systems/Difficulty:
//  для каждого типа заданы диапазоны количества [min, max]
//  в двух зонах — «центр» и «край» (кольца тайлов от центра).
//
//    types: {
//      mouse: { center: [8, 16],  edge: [16, 32]  },
//      golem: { center: [0, 0],   edge: [0.3, 0.3] },
//      ...
//    }
//
//  Точное число разыгрывается каждый забег; дробная часть —
//  вероятность (0.3 → один голем с шансом 30%).
//
//  «Полярный множитель» mul растёт от центра к краю: звери
//  у окраин крупнее, живучее и больнее (на мышей не действует).
// ============================================================
import { clamp } from "../../core/Utils.js";
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
  const { zones, types, edgeMul } = cfg;
  const spanA = zones.center[0]; // внутренняя граница центра
  const spanB = zones.edge[1]; // внешняя граница края
  const enemies = [];

  // Стайный рассев n особей типа в кольце [ringA..ringB]
  const pack = (type, n, ring) => {
    for (let i = 0; i < n; i++) {
      const r = ring[0] + rng() * (ring[1] - ring[0]);
      const pos = map.freeSpot(r, Math.min(r + 3, 56), rng);
      const k = clamp((r - spanA) / (spanB - spanA), 0, 1);
      const mul = edgeMul[0] + (edgeMul[1] - edgeMul[0]) * k;
      // мыши везде одинаково крошечные — без полярного множителя
      enemies.push(makeEnemy(type, pos.x, pos.y, rng, type === "mouse" ? 1 : mul));
    }
  };

  for (const [type, ranges] of Object.entries(types)) {
    pack(type, rollCount(ranges.center, rng), zones.center);
    pack(type, rollCount(ranges.edge, rng), zones.edge);
  }

  return enemies;
}
