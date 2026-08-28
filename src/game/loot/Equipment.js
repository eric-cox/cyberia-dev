// ============================================================
//  loot/Equipment — модель экипировки (Diablo-принцип):
//  по одному предмету на слот, оружие — только в руке.
//  Владеет ПРАВИЛАМИ (надеть/снять/выбросить/авто-надеть),
//  персистентность делегирует SaveStore.
//
//  Расширение: новые слоты (кольцо, амулет…) = добавить ключ
//  в defaults SaveStore + имя слота в data/items.SLOT_NAMES.
// ============================================================
import { ITEMS, FISTS } from "../data/items.js";

export class Equipment {
  constructor(store) {
    this.store = store;
  }

  get slots() {
    return this.store.data.equipped;
  }

  itemOf(id) {
    return ITEMS[id] || null;
  }
  equippedItem(slot) {
    return this.itemOf(this.slots[slot]);
  }
  isEquipped(id) {
    return Object.values(this.slots).includes(id);
  }

  // --- действия (доступны на экране между играми) ---
  equip(id) {
    const it = this.itemOf(id);
    if (!it || !this.store.hasItem(id)) return false;
    this.slots[it.slot] = id;
    this.store.persist();
    return true;
  }

  unequip(slot) {
    if (!this.slots[slot]) return false;
    this.slots[slot] = null;
    this.store.persist();
    return true;
  }

  discard(id) {
    const it = this.itemOf(id);
    if (!it || !this.store.hasItem(id)) return false;
    if (this.isEquipped(id)) this.unequip(it.slot);
    this.store.removeItem(id);
    return true;
  }

  // --- правила подбора (вызывает симуляция при находке) ---
  // Оружие надевается, только если рука пуста; одежда — если
  // слот пуст или новинка теплее надетого. Всё остальное
  // оседает в схроне до экрана снаряжения.
  tryAutoEquip(item) {
    if (item.slot === "weapon") {
      if (!this.slots.weapon) return this.equip(item.id);
      return false;
    }
    const cur = this.equippedItem(item.slot);
    if (!cur || (item.cold || 0) > (cur.cold || 0)) return this.equip(item.id);
    return false;
  }

  // --- производные характеристики ---
  insulation() {
    let sum = 0;
    for (const slot of Object.keys(this.slots)) {
      const it = this.equippedItem(slot);
      if (it && it.slot !== "weapon") sum += it.cold || 0;
    }
    return sum;
  }

  weapon() {
    return this.equippedItem("weapon") || FISTS;
  }
}
