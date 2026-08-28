// ============================================================
//  Реестр типов врагов.
//  НОВЫЙ ВРАГ = 1 файл (def + класс) + 1 строка здесь.
//  Механические/подземные классы встанут сюда же.
// ============================================================
import { def as wolfDef, WolfEnemy } from "./WolfEnemy.js";
import { def as boarDef, BoarEnemy } from "./BoarEnemy.js";
import { def as bruteDef, BruteEnemy } from "./BruteEnemy.js";
import { def as rhinoDef, RhinoEnemy } from "./RhinoEnemy.js";

export const ENEMY_TYPES = {
  wolf: { def: wolfDef, Class: WolfEnemy },
  boar: { def: boarDef, Class: BoarEnemy },
  brute: { def: bruteDef, Class: BruteEnemy },
  rhino: { def: rhinoDef, Class: RhinoEnemy },
};

export function makeEnemy(type, x, y, rng, mul = 1) {
  const t = ENEMY_TYPES[type];
  if (!t) throw new Error(`Неизвестный тип врага: ${type}`);
  return new t.Class(x, y, t.def, rng, mul);
}
