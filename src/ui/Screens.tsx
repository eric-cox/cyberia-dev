import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Snapshot, InvItem, EquippedMap } from "./HUD";
import { fmtTime, ItemIcon } from "./HUD";
import { SLOT_NAMES, TIER_COLORS } from "../game/data/items.js";
import { artSystem } from "../game/art/pixel.js";

const TIER_NAMES = ["", "I", "II", "III"];

function Overlay({ children, tint }: { children: ReactNode; tint: string }) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto"
      style={{ background: tint }}
    >
      <div className="overlay-in w-full max-w-3xl px-6 py-10">{children}</div>
    </div>
  );
}

function StatRow({ label, value, accent }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="flex items-center justify-between gap-6 py-1.5 border-b-2 border-[#16233c] last:border-0">
      <span className="font-term text-[12px] text-[#9fb6cc]">{label}</span>
      <span className="font-pixel text-[10px]" style={{ color: accent || "#e8f2ff" }}>
        {value}
      </span>
    </div>
  );
}

// ---------- крупная фигура выжившего для экрана снаряжения ----------
function CharacterFigure() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const frame = artSystem.frameCanvas("player", "idle", 0);
    if (!frame) return;
    const s = 7;
    ctx.drawImage(frame, (cv.width - frame.width * s) / 2, cv.height - frame.height * s - 2, frame.width * s, frame.height * s);
  }, []);
  return (
    <canvas
      ref={ref}
      width={140}
      height={130}
      style={{ width: 140, height: 130, imageRendering: "pixelated" }}
    />
  );
}

// ---------- ячейка слота экипировки ----------
function SlotBox({
  slot,
  item,
  onUnequip,
}: {
  slot: keyof EquippedMap;
  item: InvItem | null;
  onUnequip: (slot: string) => void;
}) {
  const armed = item !== null;
  return (
    <button
      onClick={() => armed && onUnequip(slot)}
      title={armed ? `${item!.name} — снять` : `${SLOT_NAMES[slot]} — пусто`}
      className="group relative w-[74px] h-[86px] flex flex-col items-center justify-between bg-[#0d1526] border-2 px-1 pt-1.5 pb-1 transition-all cursor-pointer hover:-translate-y-0.5"
      style={{
        borderColor: item ? TIER_COLORS[item.tier] : "#1d2c44",
        boxShadow: item ? `0 0 12px ${TIER_COLORS[item.tier]}33` : "none",
      }}
    >
      <div className="flex-1 flex items-center">
        <ItemIcon art={item?.art ?? null} size={40} dim={!item} />
      </div>
      <div
        className="font-pixel text-[7px] leading-none text-center"
        style={{ color: item ? TIER_COLORS[item.tier] : "#2c4266" }}
      >
        {SLOT_NAMES[slot]}
      </div>
      {item && (
        <div className="absolute inset-x-0 bottom-3.5 opacity-0 group-hover:opacity-100 font-pixel text-[6px] text-[#ff8a94] text-center transition-opacity">
          СНЯТЬ
        </div>
      )}
    </button>
  );
}

// ---------- строка предмета в схроне ----------
function StashRow({
  it,
  onEquip,
  onUnequip,
  onDiscard,
}: {
  it: InvItem;
  onEquip: (id: string) => void;
  onUnequip: (slot: string) => void;
  onDiscard: (id: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-2.5 bg-[#0d1526] border-2 px-2.5 py-2 transition-colors hover:bg-[#101b30]"
      style={{ borderColor: it.equipped ? TIER_COLORS[it.tier] : "#16233c" }}
    >
      <ItemIcon art={it.art} size={30} />
      <div className="flex-1 min-w-0 leading-tight">
        <div className="font-term text-[12px] font-bold truncate" style={{ color: TIER_COLORS[it.tier] }}>
          {it.name} <span className="opacity-60 text-[9px]">T{TIER_NAMES[it.tier]}</span>
        </div>
        <div className="font-term text-[10px] text-[#9fb6cc]">
          {it.slot === "weapon"
            ? `урон ${it.dmg} · ${(it.rate || 0).toFixed(1)}/с`
            : `+${it.cold} к теплу`}
        </div>
      </div>

      {it.equipped ? (
        <span className="font-pixel text-[7px] px-2 py-1" style={{ color: TIER_COLORS[it.tier], border: `1px solid ${TIER_COLORS[it.tier]}` }}>
          НАДЕТО
        </span>
      ) : (
        <button
          onClick={() => onEquip(it.id)}
          className="font-pixel text-[7px] px-2 py-1 text-[#7dff8a] border border-[#2c4266] hover:border-[#7dff8a] hover:bg-[#7dff8a14] cursor-pointer transition-colors"
        >
          НАДЕТЬ
        </button>
      )}
      {it.equipped && (
        <button
          onClick={() => onUnequip(it.slot)}
          className="font-pixel text-[7px] px-2 py-1 text-[#9fb6cc] border border-[#2c4266] hover:border-[#9fb6cc] cursor-pointer transition-colors"
        >
          СНЯТЬ
        </button>
      )}
      <DiscardButton id={it.id} onDiscard={onDiscard} />
    </div>
  );
}

// Выброс в два клика — чтобы не потерять артефакт случайно
import { useState as useLocalState } from "react";
function DiscardButton({ id, onDiscard }: { id: string; onDiscard: (id: string) => void }) {
  const [armed, setArmed] = useLocalState(false);
  return (
    <button
      onClick={() => {
        if (!armed) {
          setArmed(true);
          window.setTimeout(() => setArmed(false), 1800);
        } else {
          setArmed(false);
          onDiscard(id);
        }
      }}
      className="font-pixel text-[7px] px-2 py-1 cursor-pointer transition-colors border"
      style={{
        color: armed ? "#0a1120" : "#ff4757",
        background: armed ? "#ff4757" : "transparent",
        borderColor: "#ff4757",
      }}
    >
      {armed ? "ТОЧНО?" : "ВЫКИНУТЬ"}
    </button>
  );
}

// ---------- ЭКРАН СНАРЯЖЕНИЯ (между играми, Diablo-стиль) ----------
export function LoadoutScreen({
  snap,
  onEquip,
  onUnequip,
  onDiscard,
  onClose,
  onStart,
}: {
  snap: Snapshot | null;
  onEquip: (id: string) => void;
  onUnequip: (slot: string) => void;
  onDiscard: (id: string) => void;
  onClose: () => void;
  onStart: () => void;
}) {
  if (!snap) return null;
  const eq = snap.equipped;
  const stash = [...snap.inv].sort(
    (a, b) => a.slot.localeCompare(b.slot) || b.tier - a.tier
  );

  return (
    <Overlay tint="linear-gradient(180deg, rgba(5,8,15,0.92) 0%, rgba(10,17,32,0.88) 50%, rgba(5,8,15,0.95) 100%)">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-pixel text-2xl text-[#6fd6ff]" style={{ textShadow: "3px 3px 0 #0a1120" }}>
          СНАРЯЖЕНИЕ
        </h2>
        <button onClick={onClose} className="font-pixel text-[9px] text-[#9fb6cc] border-2 border-[#2c4266] px-3 py-2 hover:text-white hover:border-[#6fd6ff] cursor-pointer transition-colors">
          [ESC] НАЗАД
        </button>
      </div>

      <div className="grid md:grid-cols-[380px_1fr] gap-5">
        {/* --- левая колонка: персонаж + слоты --- */}
        <div className="panel-pixel p-5">
          <div className="font-pixel text-[8px] text-[#4d6a8f] mb-4 text-center">
            ОДНО ОРУЖИЕ В РУКЕ · ОДЕЖДА ПО СЛОТАМ
          </div>

          <div className="grid grid-cols-3 gap-2 justify-items-center items-center">
            <div />
            <SlotBox slot="hat" item={eq.hat} onUnequip={onUnequip} />
            <div />

            <SlotBox slot="mittens" item={eq.mittens} onUnequip={onUnequip} />
            <div className="row-span-2 flex items-center justify-center -my-2">
              <CharacterFigure />
            </div>
            <SlotBox slot="jacket" item={eq.jacket} onUnequip={onUnequip} />

            <SlotBox slot="weapon" item={eq.weapon} onUnequip={onUnequip} />
            <SlotBox slot="pants" item={eq.pants} onUnequip={onUnequip} />

            <div />
            <SlotBox slot="boots" item={eq.boots} onUnequip={onUnequip} />
            <div />
          </div>

          <div className="mt-5 space-y-0">
            <StatRow label="ЗАЩИТА ОТ ХОЛОДА" value={`−${Math.round((1 - 100 / (100 + snap.insulation)) * 100)}%`} accent="#6fd6ff" />
            <StatRow
              label="ОРУЖИЕ В РУКЕ"
              value={snap.weapon ? `${snap.weapon.name} · ${snap.weapon.dmg}` : "кулаки"}
              accent="#ffb347"
            />
            <StatRow label="АРТЕФАКТОВ В СХРОНЕ" value={String(snap.inv.length)} accent="#e8f2ff" />
          </div>

          <button onClick={onStart} className="btn-pixel btn-ember w-full mt-5 text-[12px]">
            Выйти на мороз
          </button>
        </div>

        {/* --- правая колонка: схрон --- */}
        <div className="panel-pixel p-5 max-h-[520px] flex flex-col">
          <div className="font-pixel text-[9px] text-[#6fd6ff] mb-1">СХРОН · {stash.length}</div>
          <div className="font-term text-[10px] text-[#4d6a8f] mb-3">
            надень на себя или выброси в пургу — между забегами
          </div>
          <div className="space-y-1.5 overflow-y-auto pr-1 flex-1">
            {stash.length === 0 && (
              <div className="font-term text-[12px] text-[#2c4266] py-8 text-center">
                Схрон пуст. Выйди на мороз и найди артефакты.
              </div>
            )}
            {stash.map((it) => (
              <StashRow key={it.id} it={it} onEquip={onEquip} onUnequip={onUnequip} onDiscard={onDiscard} />
            ))}
          </div>
        </div>
      </div>
    </Overlay>
  );
}

// ---------- ГЛАВНОЕ МЕНЮ ----------
export function MenuScreen({
  snap,
  onStart,
  onLoadout,
}: {
  snap: Snapshot | null;
  onStart: () => void;
  onLoadout: () => void;
}) {
  const st = snap?.stats;
  return (
    <Overlay tint="linear-gradient(180deg, rgba(5,8,15,0.82) 0%, rgba(10,17,32,0.7) 50%, rgba(5,8,15,0.9) 100%)">
      <div className="text-center mb-8">
        <div className="font-pixel text-[10px] tracking-[0.35em] text-[#4d6a8f] mb-4">
          ПИКСЕЛЬНОЕ ВЫЖИВАНИЕ · ВЕЧНАЯ МЕРЗЛОТА
        </div>
        <h1
          className="title-drift font-pixel text-5xl md:text-6xl leading-none text-[#e8f2ff]"
          style={{
            textShadow:
              "4px 4px 0 #0a1120, 8px 8px 0 rgba(111,214,255,0.28), -3px -2px 0 rgba(255,71,87,0.35)",
          }}
        >
          МЕРЗЛОТА
        </h1>
        <p className="font-term text-[13px] text-[#9fb6cc] mt-5 max-w-md mx-auto leading-relaxed">
          Пурга съедает тепло, а когда тепло кончается — мороз выедает жизнь.
          Чем лучше одежда, тем медленнее тает и то и другое. Собирай
          артефакты по карте: всё найденное остаётся в схроне навсегда.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="panel-pixel px-5 py-4">
          <div className="font-pixel text-[9px] text-[#6fd6ff] mb-3">УПРАВЛЕНИЕ</div>
          <div className="font-term text-[12px] text-[#c9d8ec] space-y-2 leading-none">
            <div><span className="key-cap mr-2">WASD</span>передвижение по снегу</div>
            <div><span className="key-cap mr-2">SPACE</span><span className="key-cap mr-2">ЛКМ</span>атака</div>
            <div><span className="key-cap mr-2">TAB</span>открыть схрон</div>
            <div><span className="key-cap mr-2">M</span>звук вкл/выкл</div>
            <div className="text-[#6fd6ff]">снаряжение — между забегами</div>
          </div>
        </div>
        <div className="panel-pixel px-5 py-4">
          <div className="font-pixel text-[9px] text-[#ffb347] mb-3">СХРОН ВЫЖИВШЕГО</div>
          <StatRow label="Артефактов сохранено" value={st ? String(st.inv.length) : "0"} accent="#6fd6ff" />
          <StatRow label="Рекорд выживания" value={st && st.bestTime > 0 ? fmtTime(st.bestTime) : "—"} accent="#ffb347" />
          <StatRow label="Мутантов убито" value={st ? String(st.totalKills) : "0"} accent="#ff6b7a" />
          <StatRow label="Забегов / побед" value={st ? `${st.runs} / ${st.victories}` : "0 / 0"} />
        </div>
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button className="btn-pixel btn-ember text-[13px]" onClick={onStart}>
            Выйти на мороз
          </button>
          <button className="btn-pixel text-[12px]" onClick={onLoadout}>
            Снаряжение · {snap ? snap.inv.length : 0}
          </button>
        </div>
        <div className="font-pixel text-[8px] text-[#4d6a8f] mt-4 blink-soft">
          [ ENTER ] — НАЧАТЬ · КАРТА ГЕНЕРИРУЕТСЯ ЗАНОВО КАЖДЫЙ ЗАБЕГ
        </div>
      </div>
    </Overlay>
  );
}

// ---------- СМЕРТЬ ----------
export function DeathScreen({
  snap,
  onRestart,
  onLoadout,
}: {
  snap: Snapshot | null;
  onRestart: () => void;
  onLoadout: () => void;
}) {
  return (
    <Overlay tint="radial-gradient(ellipse at center, rgba(40,6,12,0.55) 0%, rgba(5,8,15,0.9) 75%)">
      <div className="text-center mb-8">
        <div className="font-pixel text-[10px] tracking-[0.3em] text-[#ff4757] mb-4 blink-soft">
          {snap?.cause === "beast"
            ? "ЖИЗНЬ ВЫБИЛИ МУТАНТЫ"
            : "ТЕПЛО КОНЧИЛОСЬ — МОРОЗ ДОБИЛ ЖИЗНЬ"}
        </div>
        <h2
          className="font-pixel text-4xl md:text-5xl text-[#ff4757]"
          style={{ textShadow: "4px 4px 0 #0a1120, 8px 8px 0 rgba(255,71,87,0.25)" }}
        >
          {snap?.cause === "beast" ? "ВАС РАСТЕРЗАЛИ" : "ВЫ ЗАМЁРЗЛИ"}
        </h2>
      </div>
      <div className="panel-pixel px-6 py-4 max-w-md mx-auto mb-8">
        <StatRow label="Продержались" value={snap ? fmtTime(snap.time) : "0:00"} accent="#ffb347" />
        <StatRow label="Мутантов пало" value={snap ? String(snap.kills) : "0"} accent="#ff6b7a" />
        <StatRow label="Артефактов за забег" value={snap ? `${snap.found} / ${snap.total}` : ""} accent="#6fd6ff" />
        <div className="font-term text-[11px] text-[#4d6a8f] mt-3 leading-snug">
          Всё найденное сохранено в схроне — в следующем забеге оно снова на вас.
        </div>
      </div>
      <div className="text-center flex flex-col items-center gap-3">
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <button className="btn-pixel btn-ember" onClick={onRestart}>
            Начать заново
          </button>
          <button className="btn-pixel" onClick={onLoadout}>
            Снаряжение
          </button>
        </div>
        <div className="font-pixel text-[8px] text-[#4d6a8f] mt-1 blink-soft">[ R ] — БЫСТРЫЙ РЕСТАРТ</div>
      </div>
    </Overlay>
  );
}

// ---------- ПОБЕДА ----------
export function VictoryScreen({
  snap,
  onContinue,
  onRestart,
  onLoadout,
}: {
  snap: Snapshot | null;
  onContinue: () => void;
  onRestart: () => void;
  onLoadout: () => void;
}) {
  return (
    <Overlay tint="radial-gradient(ellipse at center, rgba(60,40,8,0.45) 0%, rgba(5,8,15,0.88) 75%)">
      <div className="text-center mb-8">
        <div className="font-pixel text-[10px] tracking-[0.3em] text-[#ffb347] mb-4">
          ВСЕ АРТЕФАКТЫ КАРТЫ СОБРАНЫ
        </div>
        <h2
          className="font-pixel text-4xl md:text-5xl text-[#ffb347]"
          style={{ textShadow: "4px 4px 0 #0a1120, 8px 8px 0 rgba(255,179,71,0.3)" }}
        >
          СХРОН ПОЛОН
        </h2>
        <p className="font-term text-[13px] text-[#c9d8ec] mt-5">
          {snap ? `Вы выдержали ${fmtTime(snap.time)} и уложили ${snap.kills} мутантов.` : ""} Пурга
          не унимается — рекорд ждёт.
        </p>
      </div>
      <div className="text-center flex flex-col items-center gap-3">
        <button className="btn-pixel btn-ember" onClick={onContinue}>
          Остаться в пурге
        </button>
        <div className="flex items-center gap-3">
          <button className="btn-pixel" onClick={onRestart}>
            Новый забег
          </button>
          <button className="btn-pixel" onClick={onLoadout}>
            Снаряжение
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ---------- СХРОН (инвентарь) ----------
const SLOT_ORDER = ["hat", "jacket", "pants", "boots", "mittens"];

export function InventoryPanel({ snap, onClose }: { snap: Snapshot | null; onClose: () => void }) {
  if (!snap) return null;
  const equippedBySlot = new Map(
    snap.inv.filter((i) => i.equipped).map((i) => [i.slot, i])
  );
  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      <div
        className="absolute right-0 top-0 h-full w-[340px] panel-deep border-l-3 p-5 overflow-y-auto pointer-events-auto"
        style={{ borderLeft: "3px solid #2c4266" }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="font-pixel text-[11px] text-[#6fd6ff]">СХРОН</span>
          <button
            className="font-pixel text-[8px] text-[#9fb6cc] border-2 border-[#2c4266] px-2 py-1.5 hover:text-white cursor-pointer"
            onClick={onClose}
          >
            [ESC]
          </button>
        </div>

        <div className="font-pixel text-[8px] text-[#4d6a8f] mb-2">НАДЕТО СЕЙЧАС</div>
        <div className="flex items-center justify-between bg-[#0d1526] border-2 border-[#16233c] px-3 py-2 mb-1.5">
          <span className="font-term text-[11px] text-[#4d6a8f] w-20">ОРУЖИЕ</span>
          <span className="font-term text-[12px] font-bold text-[#ffb347]">
            {snap.weapon ? `${snap.weapon.name} · ${snap.weapon.dmg}` : "кулаки"}
          </span>
        </div>
        <div className="space-y-1.5 mb-5">
          {SLOT_ORDER.map((slot) => {
            const it = equippedBySlot.get(slot);
            return (
              <div key={slot} className="flex items-center justify-between bg-[#0d1526] border-2 border-[#16233c] px-3 py-2">
                <span className="font-term text-[11px] text-[#4d6a8f] w-20">{SLOT_NAMES[slot]}</span>
                {it ? (
                  <span className="font-term text-[12px] font-bold" style={{ color: TIER_COLORS[it.tier] }}>
                    {it.name} <span className="opacity-70">+{it.cold}</span>
                  </span>
                ) : (
                  <span className="font-term text-[11px] text-[#2c4266]">пусто — холодно</span>
                )}
              </div>
            );
          })}
          <div className="flex items-center justify-between bg-[#0d1526] border-2 border-[#16233c] px-3 py-2">
            <span className="font-term text-[11px] text-[#4d6a8f] w-20">ЗАЩИТА</span>
            <span className="font-term text-[12px] font-bold text-[#6fd6ff]">
              −{Math.round((1 - 100 / (100 + snap.insulation)) * 100)}% потери тепла
            </span>
          </div>
        </div>

        <div className="font-pixel text-[8px] text-[#4d6a8f] mb-2">ВСЕ АРТЕФАКТЫ · {snap.inv.length}</div>
        {snap.inv.length === 0 && (
          <div className="font-term text-[12px] text-[#2c4266]">Пока пусто. Карта полна находок.</div>
        )}
        <div className="space-y-1">
          {snap.inv.map((it) => (
            <div key={it.id} className="flex items-center justify-between px-2 py-1.5" style={{ borderLeft: `4px solid ${TIER_COLORS[it.tier]}` }}>
              <span className="font-term text-[12px] text-[#c9d8ec]">
                {it.name} <span className="text-[#4d6a8f] text-[10px]">T{TIER_NAMES[it.tier]}</span>
              </span>
              <span className="font-term text-[11px] font-bold" style={{ color: TIER_COLORS[it.tier] }}>
                {it.slot === "weapon" ? `урон ${it.dmg}` : `+${it.cold} тепла`}
              </span>
            </div>
          ))}
        </div>
        <div className="font-term text-[10px] text-[#4d6a8f] mt-4 leading-snug">
          Надеть, снять или выбросить артефакты можно на экране снаряжения — между забегами.
        </div>
      </div>
    </div>
  );
}
