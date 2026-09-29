// ============================================================
//  sim/AmmoPickup — россыпь патронов на земле.
//  Расходник: при контакте пополняет запас игрока (p.ammo),
//  в постоянный схрон НЕ попадает (в отличие от артефактов).
// ============================================================
import { Entity } from "./Entity.js";

export class AmmoPickup extends Entity {
  constructor(x, y, amount) {
    super(x, y);
    this.amount = amount;
    this.r = 7;
    this.t = Math.random() * 10; // фаза покачивания
  }
  // true, когда подобрано (как и артефакты — только при контакте)
  update(dt, player) {
    this.t += dt;
    const d = Math.hypot(player.x - this.x, player.y - this.y);
    return d < 11;
  }
}
