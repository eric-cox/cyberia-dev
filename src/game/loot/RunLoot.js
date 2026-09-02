// ============================================================
//  loot/RunLoot — правила лута ОДНОГО забега:
//    • placeRunLoot — где артефакты лежат на карте (по тирам —
//      кольца из Difficulty; выше тир → дальше от центра);
//    • collectArtifact — что происходит при подборе: предмет
//      кладётся в схрон; базовый лут (тир ≤ loot.autoEquipMaxTier)
//      надевается сразу, а ПРОДВИНУТЫЙ — нет: его снаряжают
//      только между играми (LoadoutScreen).
//
//  Расширение: новые предметы добавляются в data/items.js
//  (реестр) и, при желании, в RUN_LOOT; новые правила дропа
//  (сундуки, дроп с боссов) — сюда, не трогая симуляцию.
// ============================================================
import { RUN_LOOT, ITEMS, TIER_COLORS } from "../data/items.js";
import { Pickup } from "../sim/Pickup.js";
import { AmmoPickup } from "../sim/AmmoPickup.js";

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

// Россыпи патронов для дробовика (расходник, не артефакт)
export function placeAmmo(map, rng, diff) {
  const pickups = [];
  const [minR, maxR] = diff.loot.ammoRing;
  for (let i = 0; i < diff.loot.ammoCount; i++) {
    const pos = map.freeSpot(minR, maxR, rng);
    pickups.push(new AmmoPickup(pos.x, pos.y, diff.loot.ammoPerPickup));
  }
  return pickups;
}

// Обработка подбора: предмет всегда кладётся в схрон; базовый
// лут (тир ≤ diff.loot.autoEquipMaxTier) дополнительно надевается
// сразу, продвинутый — остаётся в схроне до экрана снаряжения.
// Возвращает { isNew, equipped } для тостов/событий.
export function collectArtifact(store, equipment, item, diff) {
  const isNew = store.addItem(item.id);
  const maxTier = diff.loot.autoEquipMaxTier;
  const equipped = item.tier <= maxTier ? equipment.tryAutoEquip(item) : false;
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
