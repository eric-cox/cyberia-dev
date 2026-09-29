// ============================================================
//  sim/Experience — опыт и уровни игрока.
//
//  Убийство врага даёт опыт (def.xp). Это ЕДИНСТВЕННАЯ
//  награда за бой — ни тепла, ни жизни мутанты не роняют.
//  Накопленный опыт поднимает уровень; каждый уровень
//  увеличивает максимальную жизнь на hpPerLevel.
//
//  Шкала «базовая»: xp — прогресс внутри текущего уровня,
//  при повышении переполнение переносится на следующий.
//  Опыт сбрасывается с каждым забегом (см. Simulation.resetRun)
//  — это прогрессия внутри забега, а не мета-прогресс.
// ============================================================
export class Experience {
  constructor(cfg, baseMaxHp) {
    this.cfg = cfg;
    this.baseMaxHp = baseMaxHp;
    this.xp = 0;
    this.level = 1;
  }

  // Максимальная жизнь растёт с уровнем
  get maxHp() {
    return this.baseMaxHp + (this.level - 1) * this.cfg.hpPerLevel;
  }

  // Сколько опыта нужно, чтобы подняться с текущего уровня на следующий
  xpForNextLevel() {
    return this.cfg.baseXp + (this.level - 1) * this.cfg.xpGrowth;
  }

  // Начислить опыт. Возвращает список взятых уровней
  // (обычно пустой или из одного элемента — для событий).
  addXp(amount) {
    this.xp += amount;
    const gained = [];
    while (this.xp >= this.xpForNextLevel()) {
      this.xp -= this.xpForNextLevel();
      this.level++;
      gained.push(this.level);
    }
    return gained;
  }

  // Сброс к началу забега
  reset() {
    this.xp = 0;
    this.level = 1;
  }
}
