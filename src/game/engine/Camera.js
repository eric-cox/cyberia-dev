// ============================================================
//  engine/Camera — позиция взгляда + «травма» (тряска экрана).
//  Тряску наполняют события симуляции (удары, рёв гигантов) через
//  Game.addTrauma — сама камера от логики не зависит.
// ============================================================
import { clamp, lerp } from "../core/Utils.js";

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.tx = 0;
    this.ty = 0;
    this.trauma = 0;
    this.ox = 0; // смещение тряски
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
