// ============================================================
//  СХРОН (сохранение)
//  Артефакты сохраняются между забегами и сессиями.
//  Модель Diablo: inv — всё найденное; equipped — по одному
//  предмету на слот (одежда) + одно оружие в руке.
//  Интерфейс хранилища изолирован — для мультиплеера меняется
//  на серверный адаптер без трогания игровой логики.
// ============================================================
import { ITEMS, FISTS } from "./data/items.js";

const EMPTY_LOADOUT = () => ({
  hat: null,
  jacket: null,
  pants: null,
  boots: null,
  mittens: null,
  weapon: null,
});

const defaults = () => ({
  inv: [],
  equipped: EMPTY_LOADOUT(),
  bestTime: 0,
  totalKills: 0,
  runs: 0,
  victories: 0,
});

const KEY = "merzloa_save_v1";

export class SaveSystem {
  constructor(storage = null) {
    this.storage = storage; // null → localStorage
    this.data = defaults();
    this.load();
  }

  load() {
    try {
      const raw = this.storage
        ? this.storage.getItem(KEY)
        : window.localStorage.getItem(KEY);
      if (raw) this.data = { ...defaults(), ...JSON.parse(raw) };
    } catch {
      this.data = defaults();
    }
    this.sanitize();
  }

  // Приводим старые/битые сохранения к актуальной модели
  sanitize() {
    if (!Array.isArray(this.data.inv)) this.data.inv = [];
    this.data.inv = this.data.inv.filter((id) => ITEMS[id]);
    const eq = { ...EMPTY_LOADOUT(), ...(this.data.equipped || {}) };
    for (const slot of Object.keys(EMPTY_LOADOUT())) {
      const id = eq[slot];
      if (id && (!ITEMS[id] || !this.data.inv.includes(id))) eq[slot] = null;
    }
    this.data.equipped = eq;
  }

  persist() {
    try {
      const raw = JSON.stringify(this.data);
      if (this.storage) this.storage.setItem(KEY, raw);
      else window.localStorage.setItem(KEY, raw);
    } catch {
      /* приватный режим — играем без сохранения */
    }
  }

  hasItem(id) {
    return this.data.inv.includes(id);
  }

  addItem(id) {
    if (!this.hasItem(id)) {
      this.data.inv.push(id);
      this.persist();
      return true;
    }
    return false;
  }

  // ---------- экипировка (Diablo-слоты) ----------
  get equipped() {
    return this.data.equipped;
  }

  equip(id) {
    const it = ITEMS[id];
    if (!it || !this.hasItem(id)) return false;
    this.data.equipped[it.slot] = id;
    this.persist();
    return true;
  }

  unequip(slot) {
    if (!(slot in this.data.equipped)) return false;
    this.data.equipped[slot] = null;
    this.persist();
    return true;
  }

  isEquipped(id) {
    const it = ITEMS[id];
    return !!it && this.data.equipped[it.slot] === id;
  }

  // Выкинуть из схрона навсегда (снимает, если надето)
  discard(id) {
    const i = this.data.inv.indexOf(id);
    if (i === -1) return false;
    this.data.inv.splice(i, 1);
    const it = ITEMS[id];
    if (it && this.data.equipped[it.slot] === id) this.data.equipped[it.slot] = null;
    this.persist();
    return true;
  }

  // Суммарная защита от холода надетой одежды
  insulation() {
    let sum = 0;
    for (const slot of ["hat", "jacket", "pants", "boots", "mittens"]) {
      const it = ITEMS[this.data.equipped[slot]];
      if (it) sum += it.cold || 0;
    }
    return sum;
  }

  // Оружие в руке (ровно одно; пусто → кулаки)
  weapon() {
    return ITEMS[this.data.equipped.weapon] || FISTS;
  }

  recordRun({ time, kills, victory }) {
    this.data.runs++;
    this.data.totalKills += kills;
    if (victory) this.data.victories++;
    if (time > this.data.bestTime) this.data.bestTime = time;
    this.persist();
  }

  snapshot() {
    return {
      ...this.data,
      inv: [...this.data.inv],
      equipped: { ...this.data.equipped },
    };
  }
}
