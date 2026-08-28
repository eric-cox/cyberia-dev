// ============================================================
//  world/WorldMap — ДАННЫЕ карты и пространственные запросы.
//  Только тайлы + декор, без генерации и без отрисовки.
//
//  Здесь будущее: чанки и on-demand загрузка реализуются
//  ВНУТРИ этого класса (get/set начнут читать из чанков),
//  а потребители (симуляция, рендер) не изменятся.
//  decor — визуальный слой (деревья с точками отрисовки).
// ============================================================
import { TILE, T, SOLID_TILES, SNOW_SPEED } from "../core/Constants.js";
import { clamp } from "../core/Utils.js";

export class WorldMap {
  constructor(seed, size, tiles) {
    this.seed = seed;
    this.size = size; // тайлов по стороне
    this.tiles = tiles; // Uint8Array size*size
    this.decor = []; // { kind:"tree", x, y, sway }
  }

  get widthPx() {
    return this.size * TILE;
  }
  get heightPx() {
    return this.size * TILE;
  }
  get center() {
    const c = (this.size / 2) * TILE + TILE / 2;
    return { x: c, y: c };
  }

  // --- тайлы ---
  get(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.size || ty >= this.size) return T.ROCK;
    return this.tiles[ty * this.size + tx];
  }
  set(tx, ty, v) {
    if (tx < 0 || ty < 0 || tx >= this.size || ty >= this.size) return;
    this.tiles[ty * this.size + tx] = v;
  }
  tileAt(x, y) {
    return this.get(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  // --- физика ---
  collidesCircle(x, y, r) {
    const x0 = Math.floor((x - r) / TILE);
    const x1 = Math.floor((x + r) / TILE);
    const y0 = Math.floor((y - r) / TILE);
    const y1 = Math.floor((y + r) / TILE);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++) {
        if (!SOLID_TILES.has(this.get(tx, ty))) continue;
        const cx = clamp(x, tx * TILE, tx * TILE + TILE);
        const cy = clamp(y, ty * TILE, ty * TILE + TILE);
        if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
      }
    return false;
  }

  // Множитель скорости в точке (глубина снега / провал)
  speedFactor(x, y) {
    const t = this.tileAt(x, y);
    if (t <= T.SNOW3) return SNOW_SPEED[t];
    if (t === T.HOLE) return 0.5;
    return 0.8;
  }

  // Свободная точка в кольце [minR..maxR] тайлов от центра
  freeSpot(minR, maxR, rng) {
    const C = this.size / 2;
    for (let i = 0; i < 80; i++) {
      const a = rng() * Math.PI * 2;
      const rr = minR + rng() * (maxR - minR);
      const tx = Math.round(C + Math.cos(a) * rr);
      const ty = Math.round(C + Math.sin(a) * rr);
      if (this.get(tx, ty) > T.SNOW3) continue;
      let solidNear = false;
      for (let y = -1; y <= 1 && !solidNear; y++)
        for (let x = -1; x <= 1; x++)
          if (this.get(tx + x, ty + y) > T.SNOW3) {
            solidNear = true;
            break;
          }
      if (!solidNear)
        return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
    }
    return { x: C * TILE, y: C * TILE };
  }
}
