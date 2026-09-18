// ============================================================
//  world/WorldMap — ДАННЫЕ карты и пространственные запросы.
//  Только тайлы + декор, без генерации и без отрисовки.
//  Параметры ячеек (скорость/инерция) берёт из world/tiles.js.
//  freeSpot() работает по индексу проходимых ячеек (bands) —
//  расселение врагов/лута гарантированно попадает на остров,
//  даже если запрошенное кольцо выходит за его границу.
//
//  Здесь будущее: чанки и on-demand загрузка реализуются
//  ВНУТРИ этого класса (get/set начнут читать из чанков),
//  а потребители (симуляция, рендер) не изменятся.
//  decor — визуальный слой (люки, лужи с точками отрисовки).
// ============================================================
import { TILE } from "../core/Constants.js";
import { T, cellOf } from "./tiles.js";
import { clamp } from "../core/Utils.js";

export class WorldMap {
  constructor(seed, size, tiles) {
    this.seed = seed;
    this.size = size; // тайлов по стороне
    this.tiles = tiles; // Uint8Array size*size
    this.decor = []; // { kind:"manhole"|"puddle", x, y, ... }
    this.bands = null; // индекс: band[радиус] → [индексы проходимых ячеек]
    this.houseData = new Map(); // метаданные домов: key = "x,y" → { height, windows, sign }
    this.objects = []; // уличные объекты (префабы)
    this.buildings = []; // здания (для отрисовки и логики)
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
    if (tx < 0 || ty < 0 || tx >= this.size || ty >= this.size) return T.HOUSE;
    return this.tiles[ty * this.size + tx];
  }
  set(tx, ty, v) {
    if (tx < 0 || ty < 0 || tx >= this.size || ty >= this.size) return;
    this.tiles[ty * this.size + tx] = v;
  }
  tileAt(x, y) {
    return this.get(Math.floor(x / TILE), Math.floor(y / TILE));
  }
  // Ячейка (с параметрами движения) в мировой точке
  cellAt(x, y) {
    return cellOf(this.tileAt(x, y));
  }
  // Метаданные дома по координатам тайла (null если не дом)
  houseAt(tx, ty) {
    return this.houseData.get(`${tx},${ty}`) || null;
  }

  // --- физика ---
  collidesCircle(x, y, r) {
    const x0 = Math.floor((x - r) / TILE);
    const x1 = Math.floor((x + r) / TILE);
    const y0 = Math.floor((y - r) / TILE);
    const y1 = Math.floor((y + r) / TILE);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++) {
        if (!cellOf(this.get(tx, ty)).solid) continue;
        const cx = clamp(x, tx * TILE, tx * TILE + TILE);
        const cy = clamp(y, ty * TILE, ty * TILE + TILE);
        if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
      }
    return false;
  }

  // ---------- индекс проходимости по радиальным поясам ----------
  // band[r] = список индексов проходимых ячеек на расстоянии ~r
  // от центра. Строится один раз после генерации; расселение
  // врагов и лута выбирает точки ТОЛЬКО из реально проходимых
  // ячеек — даже если остров заканчивается раньше кольца,
  // всё расселяется по его кромке, а не сваливается в центр.
  buildBands() {
    const C = this.size / 2;
    const bands = new Array(Math.ceil(Math.hypot(C, C)) + 1).fill(null);
    for (let ty = 0; ty < this.size; ty++)
      for (let tx = 0; tx < this.size; tx++) {
        if (cellOf(this.get(tx, ty)).solid) continue;
        const b = Math.round(Math.hypot(tx + 0.5 - C, ty + 0.5 - C));
        (bands[b] || (bands[b] = [])).push(ty * this.size + tx);
      }
    this.bands = bands;
  }

  pxOf(cellIndex) {
    const tx = cellIndex % this.size;
    const ty = (cellIndex / this.size) | 0;
    return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
  }

  // Свободная точка в кольце [minR..maxR] тайлов от центра.
  // Сначала ищет «чистое» место (3×3 без препятствий — для
  // крупных зверей), затем соглашается на место вплотную к
  // стене — там удобно устраивать засады.
  freeSpot(minR, maxR, rng) {
    if (!this.bands) this.buildBands();
    const bMin = Math.max(0, Math.round(minR));
    let bMax = Math.min(this.bands.length - 1, Math.round(maxR));
    if (bMax < bMin) bMax = bMin;

    const pick = (strict) => {
      for (let tries = 0; tries < 24; tries++) {
        const b = bMin + Math.floor(rng() * (bMax - bMin + 1));
        const band = this.bands[b];
        if (!band || !band.length) continue;
        const i = band[Math.floor(rng() * band.length)];
        if (strict && !this.clearAround(i)) continue;
        return this.pxOf(i);
      }
      return null;
    };

    return (
      pick(true) ||
      pick(false) ||
      this.inwardSpot(bMin - 1, rng) ||
      this.center
    );
  }

  // 3×3 вокруг ячейки без твёрдых препятствий
  clearAround(cellIndex) {
    const tx = cellIndex % this.size;
    const ty = (cellIndex / this.size) | 0;
    for (let y = -1; y <= 1; y++)
      for (let x = -1; x <= 1; x++)
        if (cellOf(this.get(tx + x, ty + y)).solid) return false;
    return true;
  }

  // Последний шанс: ближайший непустой пояс ВНУТРИ от запрошенного
  inwardSpot(fromBand, rng) {
    for (let b = fromBand; b >= 0; b--) {
      const band = this.bands[b];
      if (band && band.length)
        return this.pxOf(band[Math.floor(rng() * band.length)]);
    }
    return null;
  }

  // Свободная точка в кольце [minR..maxR] тайлов ВОКРУГ заданной
  // точки (в отличие от freeSpot — вокруг центра карты).
  // Используется для расселения охраны вокруг артефактов.
  freeSpotAround(cx, cy, minR, maxR, rng) {
    for (let tries = 0; tries < 40; tries++) {
      const a = rng() * Math.PI * 2;
      const rr = minR + rng() * (maxR - minR);
      const tx = Math.round(cx + Math.cos(a) * rr);
      const ty = Math.round(cy + Math.sin(a) * rr);
      const i = ty * this.size + tx;
      if (cellOf(this.get(tx, ty)).solid) continue;
      if (this.clearAround(i)) return this.pxOf(i);
    }
    // запасной вариант: любая проходимая клетка поблизости
    for (let tries = 0; tries < 20; tries++) {
      const tx = Math.round(cx + (rng() - 0.5) * maxR * 2);
      const ty = Math.round(cy + (rng() - 0.5) * maxR * 2);
      if (!cellOf(this.get(tx, ty)).solid)
        return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
    }
    return { x: cx * TILE + TILE / 2, y: cy * TILE + TILE / 2 };
  }
}
