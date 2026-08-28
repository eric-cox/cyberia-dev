// ============================================================
//  sim/enemies/EnemyFactory — правила расселения мутантов:
//  где, сколько и какой силы. Всё берётся из Difficulty.
//
//  «Полярный множитель» mul растёт от центра к краю: звери
//  у окраин крупнее, живучее и больнее. Типы тоже zonированы:
//  волки ближе к центру, секачи/отродья дальше, носороги —
//  только на самых окраинах.
// ============================================================
import { clamp } from "../../core/Utils.js";
import { makeEnemy } from "./registry.js";

export function populateEnemies(map, rng, diff) {
  const { count, ringMin, ringMax, edgeMul, rhinoFrom } = diff.enemies;
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
  return enemies;
}
