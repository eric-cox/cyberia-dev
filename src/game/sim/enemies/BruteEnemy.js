// ============================================================
//  Отродье — крупный мутант: долгий замах, тяжёлый удар.
//  Стандартное поведение, усиленные числа.
// ============================================================
import { Enemy } from "./Enemy.js";

export const def = {
  type: "brute",
  art: "brute",
  name: "Отродье",
  hp: 110,
  speed: 43,
  aggro: 155,
  range: 21,
  dmg: 20,
  cd: 2.6,
  scale: 1.25,
  r: 8,
  h: 20,
  orbs: 1,
};

export class BruteEnemy extends Enemy {
  windupTime() {
    return 0.6;
  }
}
