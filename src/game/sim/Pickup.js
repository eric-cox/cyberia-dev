// ============================================================
//  sim/Pickup — артефакт, лежащий на земле.
//  Предмет НЕ притягивается к игроку (канон мира: вещи мёртвые
//  и тяжёлые — к ним нужно подойти вплотную). Подбор — только
//  при непосредственном контакте.
// ============================================================
import { Entity } from "./Entity.js";

export class Pickup extends Entity {
  constructor(x, y, item) {
    super(x, y);
    this.item = item;
    this.r = 7;
    this.t = Math.random() * 10; // фаза покачивания
  }

  // true, когда игрок подошёл вплотную и предмет подобран
  update(dt, player) {
    this.t += dt;
    const d = Math.hypot(player.x - this.x, player.y - this.y);
    return d < this.r + player.r; // контакт тел: ~12px
  }
}
