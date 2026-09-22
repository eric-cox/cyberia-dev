// ============================================================
//  loot/RunLoot — правила лута ОДНОГО забега:
//    • placeUpgrades — на карте лежат ТОЛЬКО улучшения надетого
//      (от 0 до 2 шт., каждое чуть сильнее текущего); слабее
//      надетого на карте не бывает никогда. Вокруг каждого
//      предмета EnemyFactory расселяет охрану (lootGuard).
//    • placeAmmo — россыпи патронов (расходник, не улучшение).
//    • collectArtifact — что происходит при подборе: предмет
//      кладётся в схрон; базовый лут (тир ≤ loot.autoEquipMaxTier)
//      надевается сразу, а ПРОДВИНУТЫЙ — нет: его снаряжают
//      только между играми (LoadoutScreen).
//
//  Расширение: новые предметы добавляются в data/items.js
//  (реестр); новые правила дропа (сундуки, дроп с боссов) — сюда,
//  не трогая симуляцию.
// ============================================================
import { ITEMS, TIER_COLORS } from "../data/items.js";
import { Pickup } from "../sim/Pickup.js";
import { AmmoPickup } from "../sim/AmmoPickup.js";

// «Сила» предмета — единая мера для сравнения «лучше/хуже»:
// для одежды это защита от холода, для оружия — суммарный урон
// (у дробовика — урон всего залпа, не одной дробинки).
export function itemPower(item) {
  if (item.slot !== "weapon") return item.cold || 0;
  if (item.kind === "shotgun") return (item.pelletDmg || 0) * (item.pellets || 1);
  return item.dmg || 0;
}

// Раскладка лута забега: на карте лежат ТОЛЬКО улучшения надетого.
//  • предмет не может быть слабее или равен надетому в том же слоте;
//  • всего на карте от 0 до 2 предметов (upgradeCountRange);
//  • каждый — ближайшее по силе улучшение («немного лучше»).
export function placeUpgrades(map, rng, diff, equipment) {
  const pickups = [];

  // кандидаты: для каждого слота — предметы строго сильнее надетого
  const candidates = [];
  for (const slot of Object.keys(equipment.slots)) {
    const cur = equipment.equippedItem(slot);
    const curPower = cur ? itemPower(cur) : -1; // пустой слот — всё лучше
    for (const it of Object.values(ITEMS)) {
      if (it.slot !== slot) continue;
      if (itemPower(it) <= curPower) continue; // слабее/равно — не кладём
      candidates.push({ item: it, power: itemPower(it) });
    }
  }
  if (!candidates.length) return pickups; // всё уже лучшее — лута нет

  // «немного лучше»: сортируем по силе, берём минимальные апгрейды
  candidates.sort((a, b) => a.power - b.power);

  const [minN, maxN] = diff.loot.upgradeCountRange;
  let n = minN + Math.floor(rng() * (maxN - minN + 1));
  n = Math.min(n, candidates.length);

  // сначала по одному из разных слотов (разнообразие), затем добор
  const chosen = [];
  const usedSlots = new Set();
  for (const c of candidates) {
    if (chosen.length >= n) break;
    if (usedSlots.has(c.item.slot)) continue;
    chosen.push(c);
    usedSlots.add(c.item.slot);
  }
  for (const c of candidates) {
    if (chosen.length >= n) break;
    if (chosen.includes(c)) continue;
    chosen.push(c);
  }

  for (const c of chosen) {
    const [minR, maxR] = diff.loot.rings[c.item.tier];
    const pos = map.freeSpot(minR, maxR, rng);
    pickups.push(new Pickup(pos.x, pos.y, c.item));
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
  if (item.kind === "shotgun")
    return `${item.pellets}×${item.pelletDmg} урон залпом`;
  return item.slot === "weapon"
    ? `урон ${item.dmg}`
    : `+${item.cold} к теплу`;
}

export function itemColor(item) {
  return TIER_COLORS[item.tier] || "#e8f2ff";
}
