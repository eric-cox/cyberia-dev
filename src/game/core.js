// ============================================================
//  ЯДРО ДВИЖКА «МЕРЗЛОТА»
//  Базовые сервисы: детерминированный РНГ, шина событий,
//  ввод (командная модель — готова к сетевой игре), камера.
// ============================================================

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const angleLerp = (a, b, t) => {
  let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + d * t;
};

// --- Детерминированный генератор (mulberry32) ---
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hashStr = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

// --- Шина событий (связка симуляции и UI / будущей сети) ---
export class EventBus {
  constructor() {
    this.map = new Map();
  }
  on(evt, fn) {
    if (!this.map.has(evt)) this.map.set(evt, new Set());
    this.map.get(evt).add(fn);
    return () => this.off(evt, fn);
  }
  off(evt, fn) {
    const s = this.map.get(evt);
    if (s) s.delete(fn);
  }
  emit(evt, data) {
    const s = this.map.get(evt);
    if (s) for (const fn of s) fn(data);
  }
}

// --- Ввод: клавиатура + мышь.
// Каждый кадр читается «команда» — в мультиплеере сюда же
// встанут команды удалённых игроков без изменения симуляции.
const PREVENT = new Set([
  "Space",
  "Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

export class Input {
  constructor(target) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, down: false };
    this.clicked = false;
    this.target = target;

    this._kd = (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    };
    this._ku = (e) => this.keys.delete(e.code);
    this._mm = (e) => {
      const r = target.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
    };
    this._md = (e) => {
      if (e.button === 0) {
        this.mouse.down = true;
        this.clicked = true;
      }
    };
    this._mu = (e) => {
      if (e.button === 0) this.mouse.down = false;
    };
    this._cm = (e) => e.preventDefault();

    window.addEventListener("keydown", this._kd);
    window.addEventListener("keyup", this._ku);
    target.addEventListener("mousemove", this._mm);
    target.addEventListener("mousedown", this._md);
    window.addEventListener("mouseup", this._mu);
    target.addEventListener("contextmenu", this._cm);
  }
  down(code) {
    return this.keys.has(code);
  }
  wasPressed(...codes) {
    return codes.some((c) => this.pressed.has(c));
  }
  // Ось движения (WASD / стрелки), нормализованная
  axis() {
    let x = 0;
    let y = 0;
    if (this.down("KeyA") || this.down("ArrowLeft")) x -= 1;
    if (this.down("KeyD") || this.down("ArrowRight")) x += 1;
    if (this.down("KeyW") || this.down("ArrowUp")) y -= 1;
    if (this.down("KeyS") || this.down("ArrowDown")) y += 1;
    const l = Math.hypot(x, y);
    return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }
  readCommand() {
    const axis = this.axis();
    const cmd = {
      mx: axis.x,
      my: axis.y,
      attackMelee: this.wasPressed("Space", "KeyJ"),
      attackAim: this.clicked,
      cycleWeapon: this.wasPressed("KeyQ"),
      toggleInventory: this.wasPressed("Tab", "KeyI"),
      closeInventory: this.wasPressed("Escape"),
      toggleMute: this.wasPressed("KeyM"),
      restart: this.wasPressed("KeyR"),
      enter: this.wasPressed("Enter", "Space"),
      mouseX: this.mouse.x,
      mouseY: this.mouse.y,
    };
    return cmd;
  }
  endFrame() {
    this.pressed.clear();
    this.clicked = false;
  }
  destroy() {
    window.removeEventListener("keydown", this._kd);
    window.removeEventListener("keyup", this._ku);
    this.target.removeEventListener("mousemove", this._mm);
    this.target.removeEventListener("mousedown", this._md);
    window.removeEventListener("mouseup", this._mu);
    this.target.removeEventListener("contextmenu", this._cm);
  }
}

// --- Камера с травмой (тряска экрана) ---
export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.tx = 0;
    this.ty = 0;
    this.trauma = 0;
    this.ox = 0;
    this.oy = 0;
    this.t = 0;
  }
  set(x, y) {
    this.x = this.tx = x;
    this.y = this.ty = y;
  }
  follow(x, y, dt, worldW, worldH, viewW, viewH) {
    this.tx = clamp(x, viewW / 2, Math.max(viewW / 2, worldW - viewW / 2));
    this.ty = clamp(y, viewH / 2, Math.max(viewH / 2, worldH - viewH / 2));
    const k = 1 - Math.pow(0.0001, dt);
    this.x = lerp(this.x, this.tx, k);
    this.y = lerp(this.y, this.ty, k);
  }
  addTrauma(v) {
    this.trauma = clamp(this.trauma + v, 0, 1);
  }
  update(dt) {
    this.t += dt * 40;
    this.trauma = Math.max(0, this.trauma - dt * 2.4);
    const s = this.trauma * this.trauma * 7;
    this.ox = (Math.sin(this.t * 1.7) + Math.sin(this.t * 0.9)) * 0.5 * s;
    this.oy = (Math.cos(this.t * 1.3) + Math.cos(this.t * 2.1)) * 0.5 * s;
  }
}

// --- Тайлы карты ---
export const TILE = 16;
export const MAP_TILES = 128;
export const WORLD_PX = MAP_TILES * TILE;

export const T = {
  SNOW0: 0, // наст — быстрый
  SNOW1: 1, // лёгкий снег
  SNOW2: 2, // глубокий снег
  SNOW3: 3, // сугробы — медленный
  ROCK: 4, // скалы — непроходимы
  HOLE: 5, // ледяной провал — опасно
  TREE: 6, // мёртвое дерево — непроходимо
};
export const SOLID_TILES = new Set([T.ROCK, T.TREE]);
// Множитель скорости по глубине снега
export const SNOW_SPEED = [1, 0.88, 0.74, 0.58];
