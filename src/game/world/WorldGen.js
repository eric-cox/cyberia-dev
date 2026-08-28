// ============================================================
//  world/WorldGen — процедурная генерация карты.
//  Фрактальный value-noise → глубина снега; кластеры скал;
//  ледяные провалы; мёртвые деревья. Каждый забег — новый сид.
//
//  Здесь будущее: лабиринты, биомы, псевдо-3d-ландшафт —
//  новые генераторы возвращают WorldMap с тем же интерфейсом.
// ============================================================
import { MAP_TILES, TILE, T } from "../core/Constants.js";
import { lerp } from "../core/Utils.js";
import { mulberry32 } from "../core/Rng.js";
import { WorldMap } from "./WorldMap.js";

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

export function generateWorld(seed) {
  const rng = mulberry32(seed);
  const noise = makeNoise(rng);
  const fractal = (x, y) =>
    noise(x, y) * 0.58 +
    noise(x * 2.3 + 31, y * 2.3 + 17) * 0.28 +
    noise(x * 5.1 + 57, y * 5.1 + 91) * 0.14;

  const tiles = new Uint8Array(MAP_TILES * MAP_TILES);
  const C = MAP_TILES / 2;
  const distC = (tx, ty) => Math.hypot(tx - C, ty - C);

  // глубина снега
  for (let y = 0; y < MAP_TILES; y++)
    for (let x = 0; x < MAP_TILES; x++) {
      const n = fractal(x * 0.075, y * 0.075);
      let d = n < 0.44 ? 0 : n < 0.6 ? 1 : n < 0.78 ? 2 : 3;
      if (distC(x, y) < 7) d = Math.min(d, 1);
      tiles[y * MAP_TILES + x] = d;
    }

  const map = new WorldMap(seed, MAP_TILES, tiles);

  // скалы — кластеры
  for (let i = 0; i < 62; i++) {
    const cx = 6 + rng() * (MAP_TILES - 12);
    const cy = 6 + rng() * (MAP_TILES - 12);
    if (distC(cx, cy) < 11) continue;
    const blobs = 2 + Math.floor(rng() * 6);
    for (let b = 0; b < blobs; b++) {
      const bx = Math.round(cx + (rng() - 0.5) * 4);
      const by = Math.round(cy + (rng() - 0.5) * 4);
      const r = 0.8 + rng() * 1.4;
      for (let y = -2; y <= 2; y++)
        for (let x = -2; x <= 2; x++)
          if (x * x + y * y <= r * r) map.set(bx + x, by + y, T.ROCK);
    }
  }

  // мёртвые деревья (тайл + точка в декор-слое)
  let trees = 0;
  for (let i = 0; i < 400 && trees < 85; i++) {
    const tx = Math.floor(rng() * MAP_TILES);
    const ty = Math.floor(rng() * MAP_TILES);
    if (distC(tx, ty) < 8) continue;
    if (map.get(tx, ty) <= T.SNOW3) {
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

  // ледяные провалы
  for (let i = 0; i < 17; i++) {
    const a = rng() * Math.PI * 2;
    const rr = 11 + rng() * 42;
    const cx = C + Math.cos(a) * rr;
    const cy = C + Math.sin(a) * rr;
    const r = 1 + rng() * 1.7;
    for (let y = -3; y <= 3; y++)
      for (let x = -3; x <= 3; x++) {
        if (x * x + y * y <= r * r) {
          const tx = Math.round(cx + x);
          const ty = Math.round(cy + y);
          if (map.get(tx, ty) <= T.SNOW3) map.set(tx, ty, T.HOLE);
        }
      }
  }

  // стартовая поляна вокруг центра
  for (let y = -3; y <= 3; y++)
    for (let x = -3; x <= 3; x++) {
      const t = map.get(C + x, C + y);
      if (t !== T.HOLE)
        map.set(C + x, C + y, t === T.ROCK || t === T.TREE ? T.SNOW1 : t);
    }

  return map;
}
