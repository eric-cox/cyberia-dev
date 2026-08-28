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
  scale: 1,
  r: 6,
  h: 16, // высота арт-кадра (для полосы HP)
  orbs: 1,
};

export class WolfEnemy extends Enemy {}
