// ============================================================
//  Волк-мутант — быстрый, слабый. Стандартное поведение.
// ============================================================
import { Enemy } from "./Enemy.js";

export const def = {
  type: "wolf",
  art: "wolf",
  name: "Волк-мутант",
  hp: 30,
  speed: 74,
  aggro: 132,
  range: 15,
  dmg: 8,
  cd: 1.5,
  r: 6,
  h: 16, // высота арт-кадра, px (сетка 16×16, scale=1)
  xp: 15,
  // слабый и мелкий — голос высокий
  voice: { freq: 900, wave: "sawtooth", v: 0.09, dur: 0.3, every: 3.2 },
};

export class WolfEnemy extends Enemy {}
