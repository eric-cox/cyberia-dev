// ============================================================
//  render/painters — отрисовка сущностей через микро-модули
//  арт-системы. Симуляция о художниках не знает: чтобы
//  полностью поменять визуал (или сделать псевдо-3d),
//  переписываются ТОЛЬКО эти функции.
// ============================================================
import { artSystem } from "../art/pixel.js";
import { TIER_COLORS } from "../data/items.js";

// ---------- игрок ----------
export function drawPlayer(ctx, p, weapon) {
  const anim = p.attackAnimTime > 0 ? "attack" : p.moving ? "walk" : "idle";
  const idx = artSystem.animIndex("player", anim, p.animT);
  const lx = Math.cos(p.face) * p.lunge * 4;
  const ly = Math.sin(p.face) * p.lunge * 4;
  ctx.fillStyle = "rgba(10,15,30,0.35)";
  ctx.fillRect(Math.round(p.x - 5), Math.round(p.y - 1), 10, 3);
  artSystem.draw(ctx, "player", anim, idx, p.x + lx, p.y + 1, {
    flip: Math.cos(p.face) < 0,
    white: p.flash > 0,
  });
  // дробовик в руке, повёрнут по направлению прицела
  if (weapon && weapon.kind === "shotgun") drawShotgunInHand(ctx, p);
}

// Дробовик рисуется отдельным спрайтом, повёрнутым на p.face:
// приклад у плеча, ствол вперёд. При взгляде влево отражаем,
// чтобы оружие не переворачивалось «вверх ногами».
function drawShotgunInHand(ctx, p) {
  const frame = artSystem.frameCanvas("shotgun", "idle", 0);
  if (!frame) return;
  const bob = Math.sin(p.animT * 9) * (p.moving ? 0.8 : 0);
  ctx.save();
  ctx.translate(Math.round(p.x), Math.round(p.y - 8 + bob));
  ctx.rotate(p.face);
  if (Math.cos(p.face) < 0) ctx.scale(1, -1);
  // точка хвата — цевьё (в арте ~x=10): приклад уходит к телу
  ctx.drawImage(frame, -10, -3);
  ctx.restore();
}

// ---------- летящая дробь ----------
export function drawPellets(ctx, pellets) {
  for (const pl of pellets) {
    // короткий след (размаз по скорости)
    ctx.fillStyle = "rgba(255,200,120,0.4)";
    ctx.fillRect((pl.x - pl.vx * 0.012) | 0, (pl.y - pl.vy * 0.012) | 0, 2, 2);
    // сама дробинка
    ctx.fillStyle = "#ffd98a";
    ctx.fillRect(pl.x | 0, pl.y | 0, 2, 2);
  }
}

// ---------- россыпь патронов ----------
export function drawAmmoPickup(ctx, ap) {
  const bob = Math.sin(ap.t * 2.6) * 1.2;
  ctx.fillStyle = "rgba(10,15,30,0.25)";
  ctx.fillRect(Math.round(ap.x - 4), Math.round(ap.y - 1), 8, 3);
  artSystem.draw(ctx, "shell", "idle", 0, ap.x, ap.y - 1 + bob, {});
  // второй патрон рядом — видно, что это россыпь
  artSystem.draw(ctx, "shell", "idle", 0, ap.x + 5, ap.y + bob, {});
}

// замёрз: повален и припорошен
export function drawDeadPlayer(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y - 6);
  ctx.rotate(Math.PI / 2);
  artSystem.draw(ctx, "player", "idle", 0, 0, 0, {});
  ctx.restore();
  ctx.fillStyle = "rgba(223,233,245,0.75)";
  ctx.fillRect(p.x - 7, p.y - 4, 14, 5);
}

// ---------- мутант ----------
export function drawEnemy(ctx, e) {
  const art = e.def.art;
  let anim = "walk";
  if (e.state === "windup") anim = "windup";
  else if (e.state === "strike") anim = "attack";
  else if (e.state === "wander")
    anim = Math.hypot(e.wx - e.x, e.wy - e.y) < 4 ? "idle" : "walk";

  const idx = artSystem.animIndex(art, anim, e.animT);
  const shake = e.state === "windup" ? (Math.random() - 0.5) * 1.6 : 0;

  ctx.fillStyle = "rgba(10,15,30,0.35)";
  const sw = e.r * 2;
  ctx.fillRect(Math.round(e.x - sw / 2), Math.round(e.y - 1), sw, 3);
  // Единый масштаб пикселя: все враги рисуются с scale = 1,
  // а габариты типа заданы размером его арт-сетки.
  artSystem.draw(ctx, art, anim, idx, e.x + shake, e.y + 1, {
    flip: e.flip,
    white: e.flash > 0,
  });

  // полоса HP при уроне
  if (e.hp < e.maxHp) {
    const w = Math.min(80, Math.max(14, Math.round(e.r * 2)));
    const top = e.y - e.def.h - 3;
    ctx.fillStyle = "#0a0f1e";
    ctx.fillRect(e.x - w / 2 - 1, top, w + 2, 3);
    ctx.fillStyle = "#ff4757";
    ctx.fillRect(e.x - w / 2, top + 1, (w * e.hp) / e.maxHp, 1);
  }
}

// ---------- артефакт на земле ----------
export function drawPickup(ctx, pk) {
  const col = TIER_COLORS[pk.item.tier] || "#9fb6cc";
  const pulse = 0.5 + Math.sin(pk.t * 3.2) * 0.5;
  // сигнальное кольцо
  ctx.strokeStyle = col;
  ctx.globalAlpha = 0.25 + pulse * 0.35;
  ctx.strokeRect(
    Math.round(pk.x - 8 - pulse * 2),
    Math.round(pk.y - 10 - pulse * 2),
    16 + pulse * 4,
    16 + pulse * 4
  );
  ctx.globalAlpha = 1;
  // подложка-сугроб
  ctx.fillStyle = "rgba(10,15,30,0.25)";
  ctx.fillRect(Math.round(pk.x - 5), Math.round(pk.y - 2), 10, 3);
  const bob = Math.sin(pk.t * 2.6) * 1.5;
  artSystem.draw(ctx, pk.item.art, "idle", 0, pk.x, pk.y - 2 + bob, {});
}

// ---------- мёртвое дерево (покачивается в пургу) ----------
export function drawTree(ctx, tr, t) {
  const sway = Math.sin(t * 1.3 + tr.sway) * 0.02;
  ctx.save();
  ctx.translate(Math.round(tr.x), Math.round(tr.y));
  ctx.rotate(sway);
  artSystem.draw(ctx, "tree", "idle", 0, 0, 0, {});
  ctx.restore();
}
