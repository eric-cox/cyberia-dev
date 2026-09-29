// ============================================================
//  systems/SaveStore — чистое хранилище прогресса.
//  Только данные и персистентность, никакой игровой логики
//  (логика экипировки — в loot/Equipment).
//
//  Для мультиплеера реализуйте тот же интерфейс поверх
//  серверного API — остальной код не заметит подмены.
// ============================================================
const KEY = "merzloa_save_v2";

const defaults = () => ({
  inv: [], // ids всех найденных артефактов
  equipped: {
    // по предмету на слот (Diablo-модель)
    hat: null,
    jacket: null,
    pants: null,
    boots: null,
    mittens: null,
    weapon: null, // в руке только одно оружие
  },
  bestTime: 0,
  totalKills: 0,
  runs: 0,
  victories: 0,
});

export class SaveStore {
  constructor(storage = null) {
    this.storage = storage; // null → localStorage
    this.data = defaults();
    this.load();
  }

  load() {
    try {
      let raw = this.storage
        ? this.storage.getItem(KEY)
        : window.localStorage.getItem(KEY);
      // миграция со схемы v1 (до введения слотов экипировки)
      if (!raw && !this.storage) {
        const old = window.localStorage.getItem("merzloa_save_v1");
        if (old) {
          raw = old;
          window.localStorage.setItem(KEY, old);
          window.localStorage.removeItem("merzloa_save_v1");
        }
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = { ...defaults(), ...parsed };
        this.data.equipped = { ...defaults().equipped, ...(parsed.equipped || {}) };
        // страховка от битых данных: только существующие предметы
        this.data.inv = this.data.inv.filter((id) => typeof id === "string");
      }
    } catch {
      this.data = defaults();
    }
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
  // true, если предмет действительно новый для схрона
  addItem(id) {
    if (this.hasItem(id)) return false;
    this.data.inv.push(id);
    this.persist();
    return true;
  }
  removeItem(id) {
    this.data.inv = this.data.inv.filter((x) => x !== id);
    for (const slot of Object.keys(this.data.equipped))
      if (this.data.equipped[slot] === id) this.data.equipped[slot] = null;
    this.persist();
  }

  recordRun({ time, kills, victory }) {
    this.data.runs++;
    this.data.totalKills += kills;
    if (victory) this.data.victories++;
    if (time > this.data.bestTime) this.data.bestTime = time;
    this.persist();
  }

  snapshot() {
    return { ...this.data, inv: [...this.data.inv] };
  }
}
