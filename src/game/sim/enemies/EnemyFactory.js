// ============================================================
//  sim/enemies/EnemyFactory — правила расселения мутантов:
//  где, сколько и какой силы. Всё берётся из Difficulty.
//
//  «Полярный множитель» mul растёт от центра к краю: звери
//  у окраин крупнее, живучее и больнее. Типы зонированы:
//  мыши у самого центра, волки/секачи/отродья дальше,
//  носороги — на окраинах. Ледяной голем — один на карту,
//  появляется с шансом ~1/3 в дальнем кольце.
// ============================================================
import { clamp } from "../../core/Utils.js";
import { makeEnemy } from "./registry.js";

export function populateEnemies(map, rng, diff) {
  const cfg = diff.enemies;
  const { count, ringMin, ringMax, edgeMul, rhinoFrom, mouseBelow } = cfg;
  const enemies = [];

  for (let i = 0; i < count; i++) {
    // sqrt-распределение: у края плотнее
    const r = ringMin + Math.pow(rng(), 0.5) * (ringMax - ringMin);
    const k = clamp((r - ringMin) / (ringMax - ringMin), 0, 1);
    const mul = edgeMul[0] + (edgeMul[1] - edgeMul[0]) * k;

    let type = "wolf";
    if (r < mouseBelow && rng() < 0.55) type = "mouse";
    if (r > 22) type = rng() < 0.55 ? "boar" : "wolf";
    if (r > 36) type = rng() < 0.45 ? "brute" : "boar";
    if (r >= rhinoFrom && rng() < 0.2) type = "rhino";

    const pos = map.freeSpot(Math.min(r, 54), Math.min(r + 5, 56), rng);
    // мыши живут своей стаей даже у центра — mul им не нужен
    enemies.push(makeEnemy(type, pos.x, pos.y, rng, type === "mouse" ? 1 : mul));
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
