// ============================================================
//  Секач — мутировавший кабан: медленнее робо-пса, но плотнее
//  и больнее. Стандартное поведение.
// ============================================================
import { Enemy } from "./Enemy.js";

export const def = {
  type: "boar",
  art: "boar",
  name: "Секач",
  hp: 55,
  speed: 58,
  aggro: 112,
  range: 17,
  dmg: 12,
  cd: 2.0,
  r: 7,
  h: 14, // сетка 18×14, scale=1
  xp: 25,
  voice: { freq: 520, wave: "square", v: 0.1, dur: 0.3, every: 3.6 },
};

export class BoarEnemy extends Enemy {}
