// ============================================================
//  Реестр типов врагов.
//  НОВЫЙ ВРАГ = 1 файл (def + класс) + 1 строка здесь.
//  Механические/подземные классы встанут сюда же.
// ============================================================
import { def as houndDef, HoundEnemy } from "./HoundEnemy.js";
import { def as boarDef, BoarEnemy } from "./BoarEnemy.js";
import { def as bruteDef, BruteEnemy } from "./BruteEnemy.js";
import { def as sweeperDef, SweeperEnemy } from "./SweeperEnemy.js";
import { def as ratDef, RatEnemy } from "./RatEnemy.js";
import { def as awakenedDef, AwakenedEnemy } from "./AwakenedEnemy.js";

export const ENEMY_TYPES = {
  rat: { def: ratDef, Class: RatEnemy },
  hound: { def: houndDef, Class: HoundEnemy },
  boar: { def: boarDef, Class: BoarEnemy },
  brute: { def: bruteDef, Class: BruteEnemy },
  sweeper: { def: sweeperDef, Class: SweeperEnemy },
  awakened: { def: awakenedDef, Class: AwakenedEnemy },
};

export function makeEnemy(type, x, y, rng) {
  const t = ENEMY_TYPES[type];
  if (!t) throw new Error(`Неизвестный тип врага: ${type}`);
  return new t.Class(x, y, t.def, rng);
}
