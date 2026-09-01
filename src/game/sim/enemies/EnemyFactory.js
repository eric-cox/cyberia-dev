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
//  edgeScaleRange («полярный множитель») растёт от центра к краю:
//  звери у окраин крупнее, живучее и больнее (на мышей не действует).
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
  const { zones, types, edgeScaleRange } = cfg;
  const innerRadius = zones.center[0]; // внутренняя граница центра
  const outerRadius = zones.edge[1]; // внешняя граница края
  const enemies = [];

  // Рассев n особей одного типа в кольце [ring[0]..ring[1]]
  const spawnPack = (type, count, ring) => {
    for (let i = 0; i < count; i++) {
      const r = ring[0] + rng() * (ring[1] - ring[0]);
      const pos = map.freeSpot(r, Math.min(r + 3, 56), rng);
      // Насколько эта точка «полярная»: 0 у центра, 1 у края
      const polar = clamp((r - innerRadius) / (outerRadius - innerRadius), 0, 1);
      const edgeScale =
        edgeScaleRange[0] + (edgeScaleRange[1] - edgeScaleRange[0]) * polar;
      // мыши везде одинаково крошечные — множитель не применяется
      enemies.push(
        makeEnemy(type, pos.x, pos.y, rng, type === "mouse" ? 1 : edgeScale)
      );
    }
  };

  for (const [type, ranges] of Object.entries(types)) {
    spawnPack(type, rollCount(ranges.center, rng), zones.center);
    spawnPack(type, rollCount(ranges.edge, rng), zones.edge);
  }

  return enemies;
}
