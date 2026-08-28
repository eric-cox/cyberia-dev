// ============================================================
//  render/painters — отрисовка сущностей через микро-модули
//  арт-системы. Симуляция о художниках не знает: чтобы
//  полностью поменять визуал (или сделать псевдо-3d),
//  переписываются ТОЛЬКО эти функции.
// ============================================================
import { artSystem } from "../art/pixel.js";
import { TIER_COLORS } from "../data/items.js";

// ---------- игрок ----------
export function drawPlayer(ctx, p) {
  const anim = p.attackAnimT > 0 ? "attack" : p.moving ? "walk" : "idle";
  const idx = artSystem.animIndex("player", anim, p.animT);
  const lx = Math.cos(p.face) * p.lunge * 4;
  const ly = Math.sin(p.face) * p.lunge * 4;
  ctx.fillStyle = "rgba(10,15,30,0.35)";
  ctx.fillRect(Math.round(p.x - 5), Math.round(p.y - 1), 10, 3);
  artSystem.draw(ctx, "player", anim, idx, p.x + lx, p.y + 1, {
    flip: Math.cos(p.face) < 0,
    white: p.flash > 0,
  });
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
  const scale = e.def.scale * e.mul;

  ctx.fillStyle = "rgba(10,15,30,0.35)";
  const sw = e.r * 2;
  ctx.fillRect(Math.round(e.x - sw / 2), Math.round(e.y - 1), sw, 3);
  artSystem.draw(ctx, art, anim, idx, e.x + shake, e.y + 1, {
    flip: e.flip,
    scale,
    white: e.flash > 0,
  });

  // полоса HP при уроне
  if (e.hp < e.maxHp) {
    const w = Math.max(14, Math.round(e.r * 2 * e.def.scale));
    const top = e.y - e.def.h * scale - 3;
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

// ---------- тепловые орбы ----------
export function drawOrbs(ctx, list) {
  for (const o of list) {
    const blink = o.life < 2 && Math.floor(o.life * 6) % 2 === 0;
    if (blink) continue;
    const idx = Math.floor(o.t * 6) % 2;
    const bob = Math.sin(o.t * 4) * 1;
    ctx.fillStyle = "rgba(255,140,66,0.16)";
    ctx.fillRect((o.x - 4) | 0, (o.y - 4 + bob) | 0, 8, 8);
    const frame = artSystem.frameCanvas("orb", "idle", idx);
    if (frame) ctx.drawImage(frame, (o.x - 4) | 0, (o.y - 4 + bob) | 0);
  }
}
