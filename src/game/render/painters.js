// ============================================================
//  render/painters — отрисовка сущностей через микро-модули
//  арт-системы. Симуляция о художниках не знает: чтобы
//  полностью поменять визуал (или сделать псевдо-3d),
//  переписываются ТОЛЬКО эти функции.
// ============================================================
import { artSystem } from "../art/pixel.js";
import { TIER_COLORS } from "../data/items.js";

// ---------- игрок ----------
export function drawPlayer(ctx, player, weapon) {
  const anim = player.attackAnimTime > 0 ? "attack" : player.moving ? "walk" : "idle";
  const idx = artSystem.animIndex("player", anim, player.animT);
  // смещение вперёд по направлению взгляда во время выпада
  const lungeX = Math.cos(player.face) * player.lunge * 4;
  const lungeY = Math.sin(player.face) * player.lunge * 4;
  ctx.fillStyle = "rgba(10,15,30,0.35)";
  ctx.fillRect(Math.round(player.x - 5), Math.round(player.y - 1), 10, 3);
  artSystem.draw(ctx, "player", anim, idx, player.x + lungeX, player.y + 1, {
    flip: Math.cos(player.face) < 0,
    white: player.flash > 0,
  });
  // дробовик в руке, повёрнут по направлению прицела
  if (weapon && weapon.kind === "shotgun") drawShotgunInHand(ctx, player);
}

// Дробовик рисуется отдельным спрайтом, повёрнутым на p.face:
// приклад у плеча, ствол вперёд. При взгляде влево отражаем,
// чтобы оружие не переворачивалось «вверх ногами».
function drawShotgunInHand(ctx, player) {
  const frame = artSystem.frameCanvas("shotgun", "idle", 0);
  if (!frame) return;
  const bob = Math.sin(player.animT * 9) * (player.moving ? 0.8 : 0);
  ctx.save();
  ctx.translate(Math.round(player.x), Math.round(player.y - 8 + bob));
  ctx.rotate(player.face);
  if (Math.cos(player.face) < 0) ctx.scale(1, -1);
  // точка хвата — цевьё (в арте ~x=10): приклад уходит к телу
  ctx.drawImage(frame, -10, -3);
  ctx.restore();
}

// ---------- летящая дробь ----------
export function drawPellets(ctx, pellets) {
  for (const pellet of pellets) {
    // короткий след (размаз по скорости)
    ctx.fillStyle = "rgba(255,200,120,0.4)";
    ctx.fillRect((pellet.x - pellet.vx * 0.012) | 0, (pellet.y - pellet.vy * 0.012) | 0, 2, 2);
    // сама дробинка
    ctx.fillStyle = "#ffd98a";
    ctx.fillRect(pellet.x | 0, pellet.y | 0, 2, 2);
  }
}

// ---------- россыпь патронов ----------
export function drawAmmoPickup(ctx, ammo) {
  const bob = Math.sin(ammo.t * 2.6) * 1.2;
  ctx.fillStyle = "rgba(10,15,30,0.25)";
  ctx.fillRect(Math.round(ammo.x - 4), Math.round(ammo.y - 1), 8, 3);
  artSystem.draw(ctx, "shell", "idle", 0, ammo.x, ammo.y - 1 + bob, {});
  // второй патрон рядом — видно, что это россыпь
  artSystem.draw(ctx, "shell", "idle", 0, ammo.x + 5, ammo.y + bob, {});
}

// замёрз: повален и припорошен
export function drawDeadPlayer(ctx, player) {
  ctx.save();
  ctx.translate(player.x, player.y - 6);
  ctx.rotate(Math.PI / 2);
  artSystem.draw(ctx, "player", "idle", 0, 0, 0, {});
  ctx.restore();
  ctx.fillStyle = "rgba(223,233,245,0.75)";
  ctx.fillRect(player.x - 7, player.y - 4, 14, 5);
}

// ---------- мутант ----------
export function drawEnemy(ctx, enemy) {
  const art = enemy.def.art;
  let anim = "walk";
  if (enemy.state === "windup") anim = "windup";
  else if (enemy.state === "strike") anim = "attack";
  else if (enemy.state === "wander")
    anim = Math.hypot(enemy.wx - enemy.x, enemy.wy - enemy.y) < 4 ? "idle" : "walk";

  const idx = artSystem.animIndex(art, anim, enemy.animT);
  const shake = enemy.state === "windup" ? (Math.random() - 0.5) * 1.6 : 0;

  // тень под зверем
  ctx.fillStyle = "rgba(10,15,30,0.35)";
  const shadowWidth = enemy.r * 2;
  ctx.fillRect(Math.round(enemy.x - shadowWidth / 2), Math.round(enemy.y - 1), shadowWidth, 3);
  // Единый масштаб пикселя: все враги рисуются с scale = 1,
  // а габариты типа заданы размером его арт-сетки.
  artSystem.draw(ctx, art, anim, idx, enemy.x + shake, enemy.y + 1, {
    flip: enemy.flip,
    white: enemy.flash > 0,
  });

  // полоса HP при уроне
  if (enemy.hp < enemy.maxHp) {
    const barWidth = Math.min(80, Math.max(14, Math.round(enemy.r * 2)));
    const top = enemy.y - enemy.def.h - 3;
    ctx.fillStyle = "#0a0f1e";
    ctx.fillRect(enemy.x - barWidth / 2 - 1, top, barWidth + 2, 3);
    ctx.fillStyle = "#ff4757";
    ctx.fillRect(enemy.x - barWidth / 2, top + 1, (barWidth * enemy.hp) / enemy.maxHp, 1);
  }
}

// ---------- артефакт на земле ----------
export function drawPickup(ctx, pickup) {
  const color = TIER_COLORS[pickup.item.tier] || "#9fb6cc";
  const pulse = 0.5 + Math.sin(pickup.t * 3.2) * 0.5;
  // пульсирующее сигнальное кольцо цвета тира
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.25 + pulse * 0.35;
  ctx.strokeRect(
    Math.round(pickup.x - 8 - pulse * 2),
    Math.round(pickup.y - 10 - pulse * 2),
    16 + pulse * 4,
    16 + pulse * 4
  );
  ctx.globalAlpha = 1;
  // подложка-сугроб
  ctx.fillStyle = "rgba(10,15,30,0.25)";
  ctx.fillRect(Math.round(pickup.x - 5), Math.round(pickup.y - 2), 10, 3);
  const bob = Math.sin(pickup.t * 2.6) * 1.5;
  artSystem.draw(ctx, pickup.item.art, "idle", 0, pickup.x, pickup.y - 2 + bob, {});
}

// ---------- мёртвое дерево (покачивается в пургу) ----------
export function drawTree(ctx, tree, time) {
  const sway = Math.sin(time * 1.3 + tree.sway) * 0.02;
  ctx.save();
  ctx.translate(Math.round(tree.x), Math.round(tree.y));
  ctx.rotate(sway);
  artSystem.draw(ctx, "tree", "idle", 0, 0, 0, {});
  ctx.restore();
}
