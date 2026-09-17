// ============================================================
//  world/WorldGen — процедурная генерация карты.
//
//  Карта растёт как ЛАБИРИНТ-ОСТРОВ: прорастание от центра
//  (итеративный аналог рекурсивного gridLand — очередь вместо
//  стека, иначе 128×128 переполнит вызовы). Вероятность
//  прорастания ячейки зависит от расстояния до центра:
//    • у центра  — p = 1: открытые снежные поля;
//    • к краю    — p падает: фронт вязнет, и непройденные
//                  ячейки становятся СТЕНОЙ из домов.
//  Граница острова неровная (угловой шум) — фьорды, косы,
//  тупики. Внутри острова: глубина снега и дома тоже
//  смещены к краям, озёра льда, мёртвые деревья.
//
//  Дома генерируются кластерами: соседние ячейки домов
//  объединяются в одно здание. Каждое здание имеет метаданные:
//  высота (1-3 этажа), окна (горят/не горят), неоновые вывески.
// ============================================================
import { MAP_TILES, TILE } from "../core/Constants.js";
import { T } from "./tiles.js";
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
      if (carved[i2] === 1) continue;

      const ddx = nx - C;
      const ddy = ny - C;
      const dist = Math.hypot(ddx, ddy);
      const d = dist / limitR(Math.atan2(ddy, ddx));
      // p = 1 в ядре (d ≤ 0.55), далее падает к границе.
      // Неудача НЕ блокирует ячейку навсегда: её может прорастить
      // другой сосед — остров доходит до расчётного радиуса,
      // а граница остаётся рваной (фьорды, тупики).
      const p = d <= 0.55 ? 1 : Math.max(0.02, 1 - (d - 0.55) / 0.5);

      if (rng() < p) {
        carved[i2] = 1;
        queue.push([nx, ny]);
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
        map.tiles[i] = T.HOUSE; // непройденное — стена из домов
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

      // дома: вероятность растёт к краю (в центре чисто)
      if (dist > 12 && rng() < Math.max(0, dn - 0.45) * 0.22)
        map.tiles[i] = T.HOUSE;
    }

  // ---------- фаза 3: кластеры домов внутри острова ----------
  // Генерируем здания: каждое здание — прямоугольный блок минимум 3×3 тайла.
  // Здания имеют разную высоту (1-3 этажа), окна и неоновые вывески.
  const SIGN_TYPES = ["bar", "shop", "hotel", "clinic", "casino", "neon"];
  const SIGN_COLORS = ["#ff4757", "#6fd6ff", "#ffb347", "#7dff8a", "#d6f6ff"];
  
  for (let i = 0; i < 25; i++) {
    const a = rng() * Math.PI * 2;
    const rr = 16 + rng() * 30;
    const cx = Math.round(C + Math.cos(a) * rr);
    const cy = Math.round(C + Math.sin(a) * rr);
    
    // Размер здания: от 3×3 до 6×6 тайлов
    const width = 3 + Math.floor(rng() * 4); // 3-6
    const depth = 3 + Math.floor(rng() * 4); // 3-6
    const height = 1 + Math.floor(rng() * 3); // 1-3 этажа
    const hasSign = rng() < 0.4; // 40% шанс вывески
    const signType = SIGN_TYPES[Math.floor(rng() * SIGN_TYPES.length)];
    const signColor = SIGN_COLORS[Math.floor(rng() * SIGN_COLORS.length)];
    
    // Проверяем, что здание помещается на карте
    const startX = cx - Math.floor(width / 2);
    const startY = cy - Math.floor(depth / 2);
    
    if (startX < 0 || startY < 0 || startX + width >= MAP_TILES || startY + depth >= MAP_TILES) {
      continue;
    }
    
    // Проверяем, что все тайлы проходимы (снег или лёд)
    let canPlace = true;
    for (let dy = 0; dy < depth && canPlace; dy++) {
      for (let dx = 0; dx < width && canPlace; dx++) {
        const tx = startX + dx;
        const ty = startY + dy;
        const tile = map.get(tx, ty);
        if (tile === T.HOUSE || tile === T.TREE) {
          canPlace = false;
        }
      }
    }
    
    if (!canPlace) continue;
    
    // Размещаем здание
    const tiles = [];
    for (let dy = 0; dy < depth; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const tx = startX + dx;
        const ty = startY + dy;
        map.set(tx, ty, T.HOUSE);
        tiles.push({ tx, ty });
      }
    }
    
    // Сохраняем метаданные для каждого тайла здания
    for (const { tx, ty } of tiles) {
      const windows = [];
      // Каждое окно имеет 60% шанс гореть
      for (let w = 0; w < height * 2; w++) {
        windows.push(rng() < 0.6);
      }
      map.houseData.set(`${tx},${ty}`, {
        height,
        windows,
        hasSign: hasSign && tiles.indexOf({ tx, ty }) === 0, // вывеска только на первом тайле
        signType,
        signColor,
        buildingWidth: width,
        buildingDepth: depth,
      });
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
        if (t < T.SNOW || t > T.SNOW_VERY_DEEP) continue;
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
    if (t >= T.SNOW && t <= T.SNOW_VERY_DEEP) {
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
      if (t === T.HOUSE || t === T.TREE) map.set(C + x, C + y, T.SNOW);
    }

  // индекс проходимых ячеек по радиальным поясам —
  // по нему расселяются враги и артефакты
  map.buildBands();

  return map;
}
