// ============================================================
//  engine/Input — клавиатура + мышь.
//  Каждый кадр отдаёт «команду» — плоский объект намерений
//  игрока. Симуляция принимает только команды, поэтому в
//  мультиплеере команда удалённого игрока подставляется
//  без единой правки в логике.
// ============================================================
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
  // Нормализованная ось движения (WASD / стрелки)
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

  // Команда кадра — плоский объект намерений игрока.
  // attackAim несёт курсор; мировой угол доворачивает Game
  // (ему известна камера) и кладёт в cmd.aimAngle.
  readCommand() {
    const axis = this.axis();
    return {
      moveX: axis.x,
      moveY: axis.y,
      attackMelee: this.wasPressed("Space", "KeyJ"),
      attackAim: this.clicked,
      aimAngle: null,
      toggleInventory: this.wasPressed("Tab", "KeyI"),
      toggleMute: this.wasPressed("KeyM"),
      // KeyR: в бою — перезарядка дробовика, на экране смерти — рестарт
      reload: this.wasPressed("KeyR"),
      restart: this.wasPressed("KeyR"),
      suicide: this.wasPressed("Delete"),
      enter: this.wasPressed("Enter", "Space"),
      mouseX: this.mouse.x,
      mouseY: this.mouse.y,
    };
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
