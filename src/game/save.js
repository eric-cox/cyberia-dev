// ============================================================
//  СХРОН (сохранение)
//  Артефакты сохраняются между забегами и сессиями.
//  Интерфейс хранилища изолирован — для мультиплеера меняется
//  на серверный адаптер без трогания игровой логики.
// ============================================================
const KEY = "merzloa_save_v1";

const defaults = () => ({
  inv: [],
  bestTime: 0,
  totalKills: 0,
  runs: 0,
  victories: 0,
});

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
