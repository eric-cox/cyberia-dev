// ============================================================
//  render/Weather — снег и фазы пурги.
//
//  Три слоя (от дальнего к ближнему):
//    • «пыль»  — тайл 512×512 с ~140 пикселями, тянется лентой
//                (2–4 drawImage на кадр);
//    • «средний» — такой же тайл, крупнее и быстрее;
//    • «ближний» — живые снежинки (fillRect), плотность которых
//                модулируется медленными волнами: снег идёт
//                полосами — местами густо, местами редко.
//
//  Фазы цвета: снег белый, но с вероятностью darkChance
//  переходит в серо-чёрную фазу на darkPhase секунд (1–2 мин),
//  затем возвращается к белому. Перекрас плавный (transition),
//  без пересоздания объектов.
//
//  Производительность: дальние слои — предрассчитанные канвасы
//  (перерисовка только при смене фазы), снежинки отсортированы
//  по (цвет × размер), поэтому за кадр меняется всего
//  несколько fillStyle и нет ни одной аллокации в цикле.
// ============================================================

const DEFAULT_CFG = {
  nearCount: 130, // ближние «живые» снежинки
  darkChance: 0.1, // шанс тёмной фазы при каждой проверке
  whitePhase: [90, 180], // сколько сек белая фаза идёт до проверки
  darkPhase: [60, 120], // длительность серо-чёрной фазы (сек)
  transition: 3, // плавность перекраса (сек)
};

const TILE = 512;
// Группа снежинки: { fill, alpha } — по ним снежинки сортируются
const GROUPS = [
  { fill: "#e8f2ff", alpha: 0.4 }, // белая дальняя
  { fill: "#e8f2ff", alpha: 0.75 }, // белая
  { fill: "#ffffff", alpha: 0.95 }, // белая крупная
  { fill: "#98a3b3", alpha: 0.8 }, // серая
  { fill: "#5b6572", alpha: 0.7 }, // тёмно-серая
  { fill: "#161b24", alpha: 0.9 }, // почти чёрная
];

export class Weather {
  constructor(bus = null, cfg = {}) {
    this.bus = bus;
    this.cfg = { ...DEFAULT_CFG, ...(cfg || {}) };
    this.w = 1280;
    this.h = 720;
    this.t = 0;

    // --- дальние слои (предрассчитанные тайлы) ---
    this.farOffsets = [
      { x: 0, y: 0, speed: 26, drift: 6 },
      { x: 173, y: 91, speed: 52, drift: 14 },
    ];
    this.farWhite = [];
    this.farDark = [];
    this.buildFarTiles();

    // --- ближние снежинки ---
    this.flakes = [];
    for (let i = 0; i < this.cfg.nearCount; i++) {
      const sizeRoll = Math.random();
      const size = sizeRoll < 0.55 ? 1 : sizeRoll < 0.88 ? 2 : 3;
      // тёмный оттенок соответствует размеру (как и белый),
      // поэтому порядок групп сохраняется и в тёмной фазе
      const darkGroup = size === 1 ? 3 : size === 2 ? 4 : 5;
      this.flakes.push({
        x: Math.random() * 2000,
        y: Math.random() * 1400,
        speed: 30 + Math.random() * 60 + size * 18,
        drift: 10 + Math.random() * 22,
        size,
        ph: Math.random() * 10,
        groupWhite: size === 1 ? 0 : size === 2 ? 1 : 2,
        groupDark: darkGroup,
        shadeAt: Math.random(), // при каком mix снежинка «темнеет»
      });
    }
    // сортировка по белой группе: в кадре fillStyle меняется ≤6 раз
    this.flakes.sort((a, b) => a.groupWhite - b.groupWhite);

    // --- фазовая машина ---
    this.dark = false;
    this.mix = 0; // 0 = белый снег, 1 = серо-чёрный
    this.phaseT = this.randRange(this.cfg.whitePhase);
  }

  randRange([a, b]) {
    return a + Math.random() * (b - a);
  }

  // Тайл — канвас 512×512 со случайными пикселями.
  // Позиции общие для белой и тёмной версии (перекрас «в тех же местах»).
  buildFarTiles() {
    const spots = [];
    for (let i = 0; i < 140; i++) {
      const shade = Math.random();
      spots.push({
        x: (Math.random() * TILE) | 0,
        y: (Math.random() * TILE) | 0,
        dark: shade < 0.55 ? "#98a3b3" : shade < 0.85 ? "#5b6572" : "#161b24",
      });
    }
    for (const big of [false, true]) {
      const w = document.createElement("canvas");
      const d = document.createElement("canvas");
      w.width = w.height = TILE;
      d.width = d.height = TILE;
      const wc = w.getContext("2d");
      const dc = d.getContext("2d");
      for (const s of spots) {
        const size = big && Math.random() < 0.3 ? 2 : 1;
        wc.fillStyle = Math.random() < 0.7 ? "#e8f2ff" : "#ffffff";
        wc.fillRect(s.x, s.y, size, size);
        dc.fillStyle = s.dark;
        dc.fillRect(s.x, s.y, size, size);
      }
      this.farWhite.push(w);
      this.farDark.push(d);
    }
  }

  setSize(w, h) {
    this.w = w;
    this.h = h;
  }

  // ---------- обновление (без аллокаций) ----------
  update(dt) {
    this.t += dt;

    // фазы цвета
    this.phaseT -= dt;
    if (this.phaseT <= 0) {
      if (!this.dark) {
        if (Math.random() < this.cfg.darkChance) {
          this.dark = true;
          this.phaseT = this.randRange(this.cfg.darkPhase);
          this.bus && this.bus.emit("weather", { dark: true });
        } else {
          this.phaseT = this.randRange(this.cfg.whitePhase);
        }
      } else {
        this.dark = false;
        this.phaseT = this.randRange(this.cfg.whitePhase);
        this.bus && this.bus.emit("weather", { dark: false });
      }
    }
    // плавный перекрас
    const target = this.dark ? 1 : 0;
    const step = dt / this.cfg.transition;
    this.mix += Math.max(-step, Math.min(step, target - this.mix));

    // дальние слои
    for (const o of this.farOffsets) {
      o.y += o.speed * dt;
      o.x += o.drift * dt;
      if (o.y >= TILE) o.y -= TILE;
      if (o.x >= TILE) o.x -= TILE;
    }

    // ближние снежинки + медленные волны плотности
    for (const f of this.flakes) {
      f.y += f.speed * dt * (0.7 + f.size * 0.4);
      f.x += f.drift * dt + Math.sin(f.y * 0.012 + f.ph) * 26 * dt;
      if (f.y > this.h + 4) {
        f.y = -4;
        f.x = Math.random() * this.w;
      }
      if (f.x > this.w + 6) f.x = -6;
    }
  }

  // ---------- отрисовка ----------
  draw(ctx) {
    const mix = this.mix;

    // дальние слои: при чистых фазах рисуется только один набор тайлов
    for (let i = 0; i < this.farOffsets.length; i++) {
      const o = this.farOffsets[i];
      if (mix < 0.999) this.drawTiled(ctx, this.farWhite[i], o.x, o.y, (1 - mix) * (i === 0 ? 0.5 : 0.8));
      if (mix > 0.001) this.drawTiled(ctx, this.farDark[i], o.x, o.y, mix * (i === 0 ? 0.5 : 0.8));
    }

    // ближние снежинки: сгустки через медленные волны —
    // в одних местах снег густеет, в других редеет
    const w1 = Math.sin(this.t * 0.23);
    const w2 = Math.sin(this.t * 0.155 + 2.1);
    // густота: -1..1; ниже порога снежинка в «разрыве» полосы
    const threshold = -0.25 + w1 * 0.2 + w2 * 0.15;
    let current = -1;
    for (const f of this.flakes) {
      const g =
        Math.sin(f.x * 0.0042 + this.t * 0.31) *
        Math.sin(f.y * 0.0051 - this.t * 0.19 + f.ph);
      if (g < threshold) continue;

      const group = f.shadeAt < mix ? f.groupDark : f.groupWhite;
      if (group !== current) {
        const gr = GROUPS[group];
        ctx.fillStyle = gr.fill;
        ctx.globalAlpha = gr.alpha;
        current = group;
      }
      ctx.fillRect(f.x | 0, f.y | 0, f.size, f.size);
    }
    ctx.globalAlpha = 1;
  }

  // Тайловая отрисовка слоя со смещением (лента снега)
  drawTiled(ctx, img, ox, oy, alpha) {
    if (alpha <= 0.02) return;
    const x0 = -(ox % TILE);
    const y0 = -(oy % TILE);
    ctx.globalAlpha = alpha;
    for (let y = y0; y < this.h; y += TILE)
      for (let x = x0; x < this.w; x += TILE) ctx.drawImage(img, x, y);
    ctx.globalAlpha = 1;
  }
}
