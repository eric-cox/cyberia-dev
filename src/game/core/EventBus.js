// ============================================================
//  core/EventBus — шина событий, главный «клей» архитектуры.
//
//  Симуляция НИЧЕГО не знает о звуке, canvas и React: она
//  публикует факты («удар», «подбор», «смерть»). Подписчики:
//    • Renderer  — частицы, всплывающие числа;
//    • Game      — звук, тряска камеры, тосты, снапшоты HUD;
//    • (в будущем) сеть — те же события уходят на клиенты.
// ============================================================
export class EventBus {
  constructor() {
    this.map = new Map();
  }
  on(evt, fn) {
    if (!this.map.has(evt)) this.map.set(evt, new Set());
    this.map.get(evt).add(fn);
    return () => this.off(evt, fn);
  }
  off(evt, fn) {
    const s = this.map.get(evt);
    if (s) s.delete(fn);
  }
  emit(evt, data) {
    const s = this.map.get(evt);
    if (s) for (const fn of s) fn(data);
  }
}
