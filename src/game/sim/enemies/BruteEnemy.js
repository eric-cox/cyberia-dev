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
  r: 8,
  h: 20, // сетка 20×20, scale=1
  xp: 45,
  voice: { freq: 230, wave: "sawtooth", v: 0.12, dur: 0.42, every: 4 },
};

export class BruteEnemy extends Enemy {
  windupTime() {
    return 0.6;
  }
}
