// ============================================================
//  СИСТЕМА МИКРОМОДУЛЕЙ ПИКСЕЛЬ-АРТА
//  Визуал любого объекта задаётся ПРОГРАММНО:
//   • defineArt({ id, w, h, palette, animations })
//   • кадр = сетка строк (символ = пиксель, '.' = пусто)
//     ИЛИ функция(painter) — процедурная отрисовка кадра.
//   • анимации: { имя: { fps, frames: [...] } }
//  Кэшируется в offscreen-canvas; поддерживаются flip, масштаб,
//  «белые» силуэты для вспышек попаданий.
// ============================================================

export function defineArt(def) {
  return def;
}

// Painter — процедурные кадры (микрокод рисования)
export class Painter {
  constructor(ctx) {
    this.ctx = ctx;
  }
  px(x, y, c) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(x | 0, y | 0, 1, 1);
  }
  rect(x, y, w, h, c) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }
  hline(x, y, len, c) {
    this.rect(x, y, len, 1, c);
  }
  vline(x, y, len, c) {
    this.rect(x, y, 1, len, c);
  }
  // окружность из пикселей (средняя точка)
  disc(cx, cy, r, c) {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++)
        if (x * x + y * y <= r * r) this.px(cx + x, cy + y, c);
  }
  ring(cx, cy, r, c) {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        const d = x * x + y * y;
        if (d <= r * r && d >= (r - 1.2) * (r - 1.2)) this.px(cx + x, cy + y, c);
      }
  }
}

function drawGrid(ctx, grid, palette) {
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === "." || ch === " ") continue;
      const c = palette[ch];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

class ArtSystem {
  constructor() {
    this.arts = new Map();
    this.cache = new Map(); // key -> canvas
  }

  register(def) {
    this.arts.set(def.id, def);
  }
  registerAll(list) {
    for (const d of list) this.register(d);
  }
  get(id) {
    return this.arts.get(id);
  }

  animLength(id, anim) {
    const art = this.arts.get(id);
    const a = art.animations[anim] || art.animations.idle;
    return a.frames.length;
  }
  animIndex(id, anim, timeSec) {
    const art = this.arts.get(id);
    const a = art.animations[anim] || art.animations.idle;
    return Math.floor(timeSec * (a.fps || 6)) % a.frames.length;
  }

  // Построить (или взять из кэша) canvas кадра
  frameCanvas(id, anim, index, white = false) {
    const key = `${id}|${anim}|${index}|${white ? 1 : 0}`;
    const hit = this.cache.get(key);
    if (hit) return hit;

    const art = this.arts.get(id);
    if (!art) return null;
    const a = art.animations[anim] || art.animations.idle;
    const frame = a.frames[index % a.frames.length];

    const cv = document.createElement("canvas");
    cv.width = art.w;
    cv.height = art.h;
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    if (typeof frame === "function") frame(new Painter(ctx), art.palette);
    else drawGrid(ctx, frame, art.palette);

    if (white) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, art.w, art.h);
    }
    this.cache.set(key, cv);
    return cv;
  }

  // Отрисовка с привязкой: по умолчанию низ-центр (для существ)
  draw(ctx, id, anim, index, x, y, opts = {}) {
    const cv = this.frameCanvas(id, anim, index, opts.white);
    if (!cv) return;
    const s = opts.scale || 1;
    const w = cv.width * s;
    const h = cv.height * s;
    ctx.save();
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    ctx.translate(Math.round(x), Math.round(y - (opts.anchorTop ? 0 : h)));
    if (opts.flip) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(cv, 0, 0, w, h);
    ctx.restore();
  }
}

export const artSystem = new ArtSystem();
