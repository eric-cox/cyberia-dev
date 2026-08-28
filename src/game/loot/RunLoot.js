// ============================================================
//  loot/RunLoot — правила лута ОДНОГО забега:
//    • placeRunLoot — где артефакты лежат на карте (по тирам —
//      кольца из Difficulty; выше тир → дальше от центра);
//    • collectArtifact — что происходит при подборе
//      (в схрон + авто-надевание по правилам Equipment).
//
//  Расширение: новые предметы добавляются в data/items.js
//  (реестр) и, при желании, в RUN_LOOT; новые правила дропа
//  (сундуки, дроп с боссов) — сюда, не трогая симуляцию.
// ============================================================
import { RUN_LOOT, ITEMS, TIER_COLORS } from "../data/items.js";
import { Pickup } from "../sim/Pickup.js";

// Раскладка артефактов забега по карте
export function placeRunLoot(map, rng, diff) {
  const pickups = [];
  for (const id of RUN_LOOT) {
    const item = ITEMS[id];
    const [minR, maxR] = diff.loot.rings[item.tier];
    const pos = map.freeSpot(minR, maxR, rng);
    pickups.push(new Pickup(pos.x, pos.y, item));
  }
  return pickups;
}

// Обработка подбора: схрон + авто-экипировка.
// Возвращает { isNew, equipped } для тостов/событий.
export function collectArtifact(store, equipment, item) {
  const isNew = store.addItem(item.id);
  const equipped = equipment.tryAutoEquip(item);
  return { isNew, equipped };
}

// Человекочитаемое описание статов предмета (для тостов)
export function itemStatText(item) {
  return item.slot === "weapon"
    ? `урон ${item.dmg}`
    : `+${item.cold} к теплу`;
}

export function itemColor(item) {
  return TIER_COLORS[item.tier] || "#e8f2ff";
}
