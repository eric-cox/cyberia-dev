// ============================================================
//  sim/enemies/EnemyFactory — правила расселения мутантов:
//  где, сколько и какой силы. Всё берётся из Difficulty.
//
//  «Полярный множитель» mul растёт от центра к краю: звери
//  у окраин крупнее, живучее и больнее. Типы зонированы:
//  волки/секачи/отродья в средних кольцах, носороги — на
//  окраинах. Мыши — отдельными стаями: одна у центра и вдвое
//  крупнее — по краям карты. Ледяной голем — один на карту,
//  появляется с шансом ~1/3 в дальнем кольце.
// ============================================================
import { clamp } from "../../core/Utils.js";
import { makeEnemy } from "./registry.js";

export function populateEnemies(map, rng, diff) {
  const cfg = diff.enemies;
  const { count, ringMin, ringMax, edgeMul, rhinoFrom, mice } = cfg;
  const enemies = [];

  for (let i = 0; i < count; i++) {
    // sqrt-распределение: у края плотнее
    const r = ringMin + Math.pow(rng(), 0.5) * (ringMax - ringMin);
    const k = clamp((r - ringMin) / (ringMax - ringMin), 0, 1);
    const mul = edgeMul[0] + (edgeMul[1] - edgeMul[0]) * k;

    let type = "wolf";
    if (r > 22) type = rng() < 0.55 ? "boar" : "wolf";
    if (r > 36) type = rng() < 0.45 ? "brute" : "boar";
    if (r >= rhinoFrom && rng() < 0.2) type = "rhino";

    const pos = map.freeSpot(Math.min(r, 54), Math.min(r + 5, 56), rng);
    enemies.push(makeEnemy(type, pos.x, pos.y, rng, mul));
  }

  // Стаи мышей: centerCount — у центра, edgeCount (×2) — по краям.
  // Мыши не растут с «полярным множителем» — они везде одинаково крошечные.
  if (mice) {
    const pack = (n, ringA, ringB) => {
      for (let i = 0; i < n; i++) {
        const r = ringA + rng() * (ringB - ringA);
        const pos = map.freeSpot(r, Math.min(r + 3, 56), rng);
        enemies.push(makeEnemy("mouse", pos.x, pos.y, rng, 1));
      }
    };
    pack(mice.centerCount, mice.centerRing[0], mice.centerRing[1]);
    pack(mice.edgeCount, mice.edgeRing[0], mice.edgeRing[1]);
  }

  // Ледяной голем: ровно один, и только с шансом cfg.golem.chance
  const g = cfg.golem;
  if (rng() < g.chance) {
    const gr = g.ringMin + rng() * (g.ringMax - g.ringMin);
    const pos = map.freeSpot(gr, Math.min(gr + 4, 56), rng);
    enemies.push(makeEnemy("golem", pos.x, pos.y, rng, 1));
  }

  return enemies;
}
