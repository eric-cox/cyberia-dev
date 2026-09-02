// ============================================================
//  Реестр типов врагов.
//  НОВЫЙ ВРАГ = 1 файл (def + класс) + 1 строка здесь.
//  Механические/подземные классы встанут сюда же.
// ============================================================
import { def as wolfDef, WolfEnemy } from "./WolfEnemy.js";
import { def as boarDef, BoarEnemy } from "./BoarEnemy.js";
import { def as bruteDef, BruteEnemy } from "./BruteEnemy.js";
import { def as rhinoDef, RhinoEnemy } from "./RhinoEnemy.js";
import { def as ratDef, RatEnemy } from "./RatEnemy.js";
import { def as golemDef, GolemEnemy } from "./GolemEnemy.js";

export const ENEMY_TYPES = {
  rat: { def: ratDef, Class: RatEnemy },
  wolf: { def: wolfDef, Class: WolfEnemy },
  boar: { def: boarDef, Class: BoarEnemy },
  brute: { def: bruteDef, Class: BruteEnemy },
  rhino: { def: rhinoDef, Class: RhinoEnemy },
  golem: { def: golemDef, Class: GolemEnemy },
};

export function makeEnemy(type, x, y, rng) {
  const t = ENEMY_TYPES[type];
  if (!t) throw new Error(`Неизвестный тип врага: ${type}`);
  return new t.Class(x, y, t.def, rng);
}
