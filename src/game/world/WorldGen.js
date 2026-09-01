// ============================================================
//  world/WorldGen — процедурная генерация карты.
//
//  Карта растёт как ЛАБИРИНТ-ОСТРОВ: прорастание от центра
//  (итеративный аналог рекурсивного gridLand — очередь вместо
//  стека, иначе 128×128 переполнит вызовы). Вероятность
//  прорастания ячейки зависит от расстояния до центра:
//    • у центра  — p = 1: открытые снежные поля;
//    • к краю    — p падает: фронт вязнет, и непройденные
//                  ячейки становятся СТЕНОЙ из скал.
//  Граница острова неровная (угловой шум) — фьорды, косы,
//  тупики. Внутри острова: глубина снега и валуны тоже
//  смещены к краям, озёра льда, мёртвые деревья.
// ============================================================
import { MAP_TILES, TILE } from "../core/Constants.js";
import { T } from "./tiles.js";
import { lerp } from "../core/Utils.js";
import { mulberry32 } from "../core/Rng.js";
import { WorldMap } from "./WorldMap.js";

const WALL_MARK = 255; // «уже попытано» — станет скалой

function makeNoise(rng) {
  const size = 64;
  const g = new Float32Array(size * size);
  for (let i = 0; i < g.length; i++) g[i] = rng();
  const at = (x, y) =>
    g[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    return lerp(
      lerp(at(xi, yi), at(xi + 1, yi), u),
      lerp(at(xi, yi + 1), at(xi + 1, yi + 1), u),
      v
    );
  };
}

// ---------- фаза 1: прорастание проходимого острова ----------
function carveIsland(map, rng, fractal) {
  const size = map.size;
  const C = size / 2;
  const carved = new Uint8Array(size * size);
  const idx = (x, y) => y * size + x;

  // неровная граница: локальный «радиус острова» по углу
  const limitR = (a) =>
    47 + fractal(Math.cos(a) * 1.6 + 11, Math.sin(a) * 1.6 + 23) * 14;

  const queue = [[C, C]];
  carved[idx(C, C)] = 1;
  let head = 0;

  while (head < queue.length) {
    const [cx, cy] = queue[head++];
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    // тасуем направления — рост органический, не по спирали
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 1 || ny < 1 || nx >= size - 1 || ny >= size - 1) continue;
      const i2 = idx(nx, ny);
      if (carved[i2] === 1 || map.tiles[i2] === WALL_MARK) continue;

      const ddx = nx - C;
      const ddy = ny - C;
      const dist = Math.hypot(ddx, ddy);
      const d = dist / limitR(Math.atan2(ddy, ddx));
      // p = 1 в ядре (d ≤ 0.6), далее падает к границе
      const p = d <= 0.6 ? 1 : Math.max(0.02, 1 - (d - 0.6) / 0.55);

      if (rng() < p) {
        carved[i2] = 1;
        queue.push([nx, ny]);
      } else {
        map.tiles[i2] = WALL_MARK; // стена навсегда
      }
    }
  }
  return carved;
}

export function generateWorld(seed) {
  const rng = mulberry32(seed);
  const noise = makeNoise(rng);
  const fractal = (x, y) =>
    noise(x, y) * 0.58 +
    noise(x * 2.3 + 31, y * 2.3 + 17) * 0.28 +
    noise(x * 5.1 + 57, y * 5.1 + 91) * 0.14;

  const map = new WorldMap(seed, MAP_TILES, new Uint8Array(MAP_TILES * MAP_TILES));
  const carved = carveIsland(map, rng, fractal);
  const C = MAP_TILES / 2;
  const distC = (tx, ty) => Math.hypot(tx - C, ty - C);

  // ---------- фаза 2: наполнение острова ----------
  for (let y = 0; y < MAP_TILES; y++)
    for (let x = 0; x < MAP_TILES; x++) {
      const i = y * MAP_TILES + x;
      if (!carved[i]) {
        map.tiles[i] = T.ROCK; // непройденное — стена
        continue;
      }
      const dist = distC(x, y);
      const dn = dist / 58;

      // глубина снега: у центра чаще обычный, к краю — глубже
      const n = fractal(x * 0.075, y * 0.075);
      let depth = n < 0.44 ? 0 : n < 0.62 ? 1 : 2;
      if (dn < 0.35 && depth > 0 && rng() < 0.5) depth--;
      if (dn > 0.55 && depth < 2 && rng() < (dn - 0.55) * 1.4) depth++;
      map.tiles[i] = T.SNOW + depth;

      // валуны: вероятность растёт к краю (в центре чисто)
      if (dist > 12 && rng() < Math.max(0, dn - 0.45) * 0.22)
        map.tiles[i] = T.ROCK;
    }

  // ---------- фаза 3: скальные гряды внутри острова ----------
  for (let i = 0; i < 40; i++) {
    const a = rng() * Math.PI * 2;
    const rr = 16 + rng() * 30;
    const cx = Math.round(C + Math.cos(a) * rr);
    const cy = Math.round(C + Math.sin(a) * rr);
    const blobs = 2 + Math.floor(rng() * 5);
    for (let b = 0; b < blobs; b++) {
      const bx = Math.round(cx + (rng() - 0.5) * 4);
      const by = Math.round(cy + (rng() - 0.5) * 4);
      const r = 0.8 + rng() * 1.3;
      for (let y = -2; y <= 2; y++)
        for (let x = -2; x <= 2; x++) {
          if (x * x + y * y > r * r) continue;
          const tx = bx + x;
          const ty = by + y;
          const ii = ty * MAP_TILES + tx;
          if (tx < 0 || ty < 0 || tx >= MAP_TILES || ty >= MAP_TILES) continue;
          if (carved[ii] && map.get(tx, ty) !== T.ICE_SMOOTH)
            map.set(tx, ty, T.ROCK);
        }
    }
  }

  // ---------- фаза 4: замёрзшие озёра ----------
  for (let i = 0; i < 9; i++) {
    const a = rng() * Math.PI * 2;
    const rr = 14 + rng() * 32;
    const cx = C + Math.cos(a) * rr;
    const cy = C + Math.sin(a) * rr;
    const r = 1.5 + rng() * 2.4;
    for (let y = -4; y <= 4; y++)
      for (let x = -4; x <= 4; x++) {
        const dd = x * x + y * y;
        if (dd > r * r) continue;
        const tx = Math.round(cx + x);
        const ty = Math.round(cy + y);
        if (tx < 0 || ty < 0 || tx >= MAP_TILES || ty >= MAP_TILES) continue;
        const t = map.get(tx, ty);
        if (t < T.SNOW || t > T.SNOW_VDEEP) continue;
        map.set(tx, ty, dd < (r * 0.55) ** 2 ? T.ICE_SMOOTH : T.ICE);
      }
  }

  // ---------- фаза 5: мёртвые деревья ----------
  let trees = 0;
  for (let i = 0; i < 400 && trees < 85; i++) {
    const tx = Math.floor(rng() * MAP_TILES);
    const ty = Math.floor(rng() * MAP_TILES);
    if (distC(tx, ty) < 8) continue;
    const t = map.get(tx, ty);
    if (t >= T.SNOW && t <= T.SNOW_VDEEP) {
      map.set(tx, ty, T.TREE);
      map.decor.push({
        kind: "tree",
        x: tx * TILE + TILE / 2,
        y: ty * TILE + TILE,
        sway: rng() * 10,
      });
      trees++;
    }
  }

  // ---------- фаза 6: стартовая поляна ----------
  for (let y = -4; y <= 4; y++)
    for (let x = -4; x <= 4; x++) {
      if (x * x + y * y > 18) continue;
      const t = map.get(C + x, C + y);
      if (t === T.ROCK || t === T.TREE) map.set(C + x, C + y, T.SNOW);
    }

  return map;
}
