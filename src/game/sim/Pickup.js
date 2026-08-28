// ============================================================
//  sim/Pickup — артефакт, лежащий на земле.
//  update() ведёт «магнит» к игроку и сообщает о подборе.
// ============================================================
import { Entity } from "./Entity.js";

export class Pickup extends Entity {
  constructor(x, y, item) {
    super(x, y);
    this.item = item;
    this.r = 7;
    this.t = Math.random() * 10; // фаза покачивания
  }

  // true, когда предмет подобран
  update(dt, player) {
    this.t += dt;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 42 && d > 0.1) {
      this.x += (dx / d) * 60 * dt;
      this.y += (dy / d) * 60 * dt;
    }
    return d < 11;
  }
}
