// ============================================================
//  ГЕНЕРАЦИЯ МИРА
//  Фрактальный value-noise → глубина снега; кластеры скал;
//  ледяные провалы; мёртвые деревья. Каждый забег — новый сид.
// ============================================================
import { MAP_TILES, TILE, T, WORLD_PX, mulberry32 } from "./core.js";

const lerp = (a, b, t) => a + (b - a) * t;

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

  const set = (tx, ty, v) => {
    if (tx >= 0 && ty >= 0 && tx < MAP_TILES && ty < MAP_TILES)
      tiles[ty * MAP_TILES + tx] = v;
  };
  const get = (tx, ty) =>
    tx < 0 || ty < 0 || tx >= MAP_TILES || ty >= MAP_TILES
      ? T.ROCK
      : tiles[ty * MAP_TILES + tx];

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
          if (x * x + y * y <= r * r) set(bx + x, by + y, T.ROCK);
    }
  }

  // мёртвые деревья
  let trees = 0;
  for (let i = 0; i < 400 && trees < 85; i++) {
    const tx = Math.floor(rng() * MAP_TILES);
    const ty = Math.floor(rng() * MAP_TILES);
    if (distC(tx, ty) < 8) continue;
    if (get(tx, ty) <= T.SNOW3) {
      set(tx, ty, T.TREE);
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
          if (get(tx, ty) <= T.SNOW3) set(tx, ty, T.HOLE);
        }
      }
  }

  // стартовая поляна
  for (let y = -3; y <= 3; y++)
    for (let x = -3; x <= 3; x++) {
      const t = get(C + x, C + y);
      if (t !== T.HOLE) set(C + x, C + y, t === T.ROCK || t === T.TREE ? T.SNOW1 : t);
    }

  const world = {
    seed,
    tiles,
    get,
    set,
    // тип тайла по мировым координатам
    tileAt(wx, wy) {
      return get(Math.floor(wx / TILE), Math.floor(wy / TILE));
    },
    // свободная точка в кольце [minR..maxR] тайлов от центра
    freeSpot(minR, maxR, spotRng) {
      for (let i = 0; i < 80; i++) {
        const a = spotRng() * Math.PI * 2;
        const rr = minR + spotRng() * (maxR - minR);
        const tx = Math.round(C + Math.cos(a) * rr);
        const ty = Math.round(C + Math.sin(a) * rr);
        if (get(tx, ty) > T.SNOW3) continue;
        let solidNear = false;
        for (let y = -1; y <= 1 && !solidNear; y++)
          for (let x = -1; x <= 1; x++)
            if (get(tx + x, ty + y) > T.SNOW3) {
              solidNear = true;
              break;
            }
        if (!solidNear)
          return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
      }
      return { x: C * TILE, y: C * TILE };
    },
  };
  return world;
}

// ---------- запекание ландшафта в один canvas ----------
const SNOW_BASE = ["#dfe9f5", "#cddcf0", "#b7c9e2", "#9fb4d3"];
const SNOW_SPECK = ["#c9d8ec", "#b9cbe4", "#a5b9d6", "#8da4c6"];
const SNOW_HI = ["#ffffff", "#e6f0fb", "#d5e4f6", "#c9d8ec"];

export function renderTerrain(world) {
  const cv = document.createElement("canvas");
  cv.width = WORLD_PX;
  cv.height = WORLD_PX;
  const ctx = cv.getContext("2d");
  const rng = mulberry32((world.seed ^ 0x5eedbeef) >>> 0);

  for (let ty = 0; ty < MAP_TILES; ty++)
    for (let tx = 0; tx < MAP_TILES; tx++) {
      const t = world.get(tx, ty);
      const px = tx * TILE;
      const py = ty * TILE;

      if (t === T.HOLE) {
        ctx.fillStyle = "#0b1a33";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = "#060f22";
        ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
        // ледяная кромка
        for (let i = 0; i < 7; i++) {
          ctx.fillStyle = rng() < 0.5 ? "#bfe3ff" : "#7fd7ff";
          ctx.fillRect(
            px + Math.floor(rng() * TILE),
            py + (rng() < 0.5 ? 0 : TILE - 1),
            1,
            1
          );
          ctx.fillRect(
            px + (rng() < 0.5 ? 0 : TILE - 1),
            py + Math.floor(rng() * TILE),
            1,
            1
          );
        }
        // трещины
        ctx.fillStyle = "rgba(127,215,255,0.55)";
        let cx = px + 2 + rng() * 6;
        let cy = py + 2;
        for (let s = 0; s < 9; s++) {
          ctx.fillRect(cx | 0, cy | 0, 1, 1);
          cx += rng() * 2 - 0.6;
          cy += 1.1;
        }
        continue;
      }

      // снег (под скалами/деревьями тоже)
      const depth = t <= T.SNOW3 ? t : 1 + Math.floor(rng() * 2);
      ctx.fillStyle = SNOW_BASE[depth];
      ctx.fillRect(px, py, TILE, TILE);
      const n = 5 + Math.floor(rng() * 5);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle =
          rng() < 0.62 ? SNOW_SPECK[depth] : SNOW_HI[depth];
        ctx.fillRect(
          px + Math.floor(rng() * TILE),
          py + Math.floor(rng() * TILE),
          1,
          1
        );
      }
      if (depth === 3) {
        // бархан в сугробе
        ctx.fillStyle = SNOW_HI[3];
        const wy = py + 3 + Math.floor(rng() * 8);
        ctx.fillRect(px + 1, wy, TILE - 2 - Math.floor(rng() * 4), 1);
      }

      if (t === T.ROCK) {
        const o = Math.floor(rng() * 3);
        ctx.fillStyle = "#3d4d6b";
        ctx.fillRect(px + 1, py + 2, 14, 13);
        ctx.fillStyle = "#55688a";
        ctx.fillRect(px + 1 + o, py + 1, 13 - o, 11);
        ctx.fillStyle = "#7d92b5";
        ctx.fillRect(px + 2 + o, py + 2, 6, 3);
        ctx.fillStyle = "#e8f2ff";
        ctx.fillRect(px + 2, py + 1, 9 - o, 2);
        ctx.fillStyle = "#2f3d54";
        ctx.fillRect(px + 2, py + 13, 12, 2);
      } else if (t === T.TREE) {
        // тень дерева (крона рисуется спрайтом в проходе сущностей)
        ctx.fillStyle = "rgba(10,15,30,0.32)";
        ctx.fillRect(px + 2, py + 9, 12, 5);
        ctx.fillStyle = "rgba(10,15,30,0.18)";
        ctx.fillRect(px + 4, py + 7, 8, 2);
      }
    }
  return cv;
}

// ---------- база миникарты (1px на тайл) ----------
export function renderMinimapBase(world) {
  const cv = document.createElement("canvas");
  cv.width = MAP_TILES;
  cv.height = MAP_TILES;
  const ctx = cv.getContext("2d");
  const snow = ["#c9d8ec", "#b0c3de", "#93aad0", "#7b96bf"];
  for (let ty = 0; ty < MAP_TILES; ty++)
    for (let tx = 0; tx < MAP_TILES; tx++) {
      const t = world.get(tx, ty);
      ctx.fillStyle =
        t === T.ROCK
          ? "#3d4d6b"
          : t === T.HOLE
            ? "#1e4a73"
            : t === T.TREE
              ? "#5a718f"
              : snow[t];
      ctx.fillRect(tx, ty, 1, 1);
    }
  return cv;
}
