// ============================================================
//  render/Weather — снег, ветер и фазы пурги.
//
//  ВЕТЕР: единое направление для ВСЕГО снега. Каждые
//  windChange секунд ветер получает новую случайную сторону и
//  силу, к которым плавно поворачивает (по кратчайшей дуге).
//  Снег всегда чуть оседает вниз (гравитация), но несёт его
//  именно ветер — в метель он может мести почти горизонтально.
//
//  Три слоя (от дальнего к ближнему):
//    • «пыль»    — тайл 512×512, тянется лентой по ветру;
//    • «средний» — такой же тайл, крупнее и быстрее (параллакс);
//    • «ближний» — живые снежинки, плотность которых модулируют
//                  медленные волны: снег идёт полосами —
//                  местами густо, местами редко.
//
//  Фазы цвета: снег белый, но с вероятностью darkChance
//  переходит в серо-чёрную фазу на darkPhase секунд (1–2 мин),
//  затем возвращается к белому. Перекрас плавный (transition).
//
//  Производительность: дальние слои — предрассчитанные канвасы,
//  снежинки отсортированы по (цвет × размер) — за кадр ≤6 смен
//  fillStyle, в циклах update/draw нет ни одной аллокации.
// ============================================================

const DEFAULT_CFG = {
  nearCount: 260, // ближние «живые» снежинки
  darkChance: 0.1, // шанс тёмной фазы при каждой проверке
  whitePhase: [90, 180], // сек белой фазы до следующей проверки
  darkPhase: [60, 120], // длительность серо-чёрной фазы (сек)
  transition: 3, // плавность перекраса (сек)
  windChange: [12, 28], // сек между сменами направления ветра
  windStrength: [45, 95], // сила ветра, px/сек
};

const TILE = 512;
const GRAVITY = 18; // снег всегда чуть оседает вниз

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

    // --- ветер: текущие значения плавно идут к цели ---
    this.windAngle = Math.random() * Math.PI * 2;
    this.windStrength = this.randRange(this.cfg.windStrength);
    this.windTarget = { angle: this.windAngle, strength: this.windStrength };
    this.windChangeT = this.randRange(this.cfg.windChange);

    // --- дальние слои (предрассчитанные тайлы, параллакс) ---
    this.farOffsets = [
      { x: 0, y: 0, par: 0.35 },
      { x: 173, y: 91, par: 0.65 },
    ];
    this.farWhite = [];
    this.farDark = [];
    this.buildFarTiles();

    // --- ближние снежинки ---
    this.flakes = [];
    for (let i = 0; i < this.cfg.nearCount; i++) {
      const sizeRoll = Math.random();
      const size = sizeRoll < 0.55 ? 1 : sizeRoll < 0.88 ? 2 : 3;
      this.flakes.push({
        x: Math.random() * 2000,
        y: Math.random() * 1400,
        // крупные (ближние) снежинки ветер несёт быстрее
        mult: 0.7 + Math.random() * 0.5 + size * 0.35,
        size,
        ph: Math.random() * 10,
        groupWhite: size - 1, // 0..2
        groupDark: size + 2, // 3..5 — порядок групп сохраняется
        shadeAt: Math.random(), // при каком mix снежинка «темнеет»
      });
    }
    // сортировка по белой группе: в кадре fillStyle меняется ≤6 раз
    this.flakes.sort((a, b) => a.groupWhite - b.groupWhite);

    // --- фазовая машина цвета ---
    this.dark = false;
    this.mix = 0; // 0 = белый снег, 1 = серо-чёрный
    this.phaseT = this.randRange(this.cfg.whitePhase);
  }

  randRange([a, b]) {
    return a + Math.random() * (b - a);
  }

  // Вектор ветра для этого кадра
  windVec() {
    return {
      x: Math.cos(this.windAngle) * this.windStrength,
      y: Math.sin(this.windAngle) * this.windStrength,
    };
  }

  // Для HUD: направление (рад) и сила 0..1
  windInfo() {
    const [lo, hi] = this.cfg.windStrength;
    return {
      angle: this.windAngle,
      strength: Math.max(0, Math.min(1, (this.windStrength - lo) / (hi - lo))),
    };
  }

  // Тайл — канвас 512×512 со случайными пикселями.
  // Позиции общие для белой и тёмной версии (перекрас «в тех же местах»).
  buildFarTiles() {
    const spots = [];
    for (let i = 0; i < 280; i++) {
      const roll = Math.random();
      spots.push({
        x: (Math.random() * TILE) | 0,
        y: (Math.random() * TILE) | 0,
        dark:
          roll < 0.55
            ? "#98a3b3"
            : roll < 0.85
              ? "#5b6572"
              : "#161b24",
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

    // --- ветер: периодически получает новую цель и плавно
    // доворачивает к ней по кратчайшей дуге ---
    this.windChangeT -= dt;
    if (this.windChangeT <= 0) {
      this.windChangeT = this.randRange(this.cfg.windChange);
      this.windTarget.angle = Math.random() * Math.PI * 2;
      this.windTarget.strength = this.randRange(this.cfg.windStrength);
    }
    let da = this.windTarget.angle - this.windAngle;
    da = Math.atan2(Math.sin(da), Math.cos(da)); // кратчайшая дуга
    const wk = 1 - Math.pow(0.25, dt);
    this.windAngle += da * wk;
    this.windStrength += (this.windTarget.strength - this.windStrength) * wk;

    const { x: wx, y: wy } = this.windVec();

    // дальние слои — по ветру, каждый со своим параллаксом
    for (const o of this.farOffsets) {
      o.x += wx * o.par * dt;
      o.y += (wy * o.par + GRAVITY * o.par) * dt;
      o.x = ((o.x % TILE) + TILE) % TILE;
      o.y = ((o.y % TILE) + TILE) % TILE;
    }

    // ближние снежинки + медленные волны плотности
    const w1 = Math.sin(this.t * 0.23);
    const w2 = Math.sin(this.t * 0.155 + 2.1);
    this.threshold = -0.25 + w1 * 0.2 + w2 * 0.15;
    for (const f of this.flakes) {
      const jitter = Math.sin(f.y * 0.012 + f.ph) * 14;
      f.x += (wx * f.mult + jitter) * dt;
      f.y += (wy * f.mult + GRAVITY * f.mult) * dt;
      // ветер дует в любую сторону — заворот со всех четырёх краёв
      if (f.y > this.h + 4) {
        f.y = -4;
        f.x = Math.random() * this.w;
      } else if (f.y < -8) {
        f.y = this.h + 2;
        f.x = Math.random() * this.w;
      }
      if (f.x > this.w + 6) f.x = -8;
      else if (f.x < -10) f.x = this.w + 4;
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
    let current = -1;
    for (const f of this.flakes) {
      const g =
        Math.sin(f.x * 0.0042 + this.t * 0.31) *
        Math.sin(f.y * 0.0051 - this.t * 0.19 + f.ph);
      if (g < this.threshold) continue;

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

  // Тайловая отрисовка слоя со смещением (лента снега по ветру)
  drawTiled(ctx, img, ox, oy, alpha) {
    if (alpha <= 0.02) return;
    const x0 = -ox;
    const y0 = -oy;
    ctx.globalAlpha = alpha;
    for (let y = y0; y < this.h; y += TILE)
      for (let x = x0; x < this.w; x += TILE) ctx.drawImage(img, x, y);
    ctx.globalAlpha = 1;
  }
}
