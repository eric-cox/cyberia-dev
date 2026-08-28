import type { ReactNode } from "react";
import type { Snapshot } from "./HUD";
import { fmtTime } from "./HUD";
import { SLOT_NAMES, TIER_COLORS } from "../game/data/items.js";

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

// ---------- ГЛАВНОЕ МЕНЮ ----------
export function MenuScreen({ snap, onStart }: { snap: Snapshot | null; onStart: () => void }) {
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
            <div><span className="key-cap mr-2">Q</span>сменить оружие</div>
            <div><span className="key-cap mr-2">TAB</span>открыть схрон</div>
            <div><span className="key-cap mr-2">M</span>звук вкл/выкл</div>
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
        <button className="btn-pixel btn-ember text-[13px]" onClick={onStart}>
          Выйти на мороз
        </button>
        <div className="font-pixel text-[8px] text-[#4d6a8f] mt-4 blink-soft">
          [ ENTER ] — НАЧАТЬ · КАРТА ГЕНЕРИРУЕТСЯ ЗАНОВО КАЖДЫЙ ЗАБЕГ
        </div>
      </div>
    </Overlay>
  );
}

// ---------- СМЕРТЬ ----------
export function DeathScreen({ snap, onRestart }: { snap: Snapshot | null; onRestart: () => void }) {
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
      <div className="text-center">
        <button className="btn-pixel btn-ember" onClick={onRestart}>
          Начать заново
        </button>
        <div className="font-pixel text-[8px] text-[#4d6a8f] mt-4 blink-soft">[ R ] — БЫСТРЫЙ РЕСТАРТ</div>
      </div>
    </Overlay>
  );
}

// ---------- ПОБЕДА ----------
export function VictoryScreen({
  snap,
  onContinue,
  onRestart,
}: {
  snap: Snapshot | null;
  onContinue: () => void;
  onRestart: () => void;
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
        <button className="btn-pixel" onClick={onRestart}>
          Новый забег
        </button>
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

        <div className="font-pixel text-[8px] text-[#4d6a8f] mb-2">НАДЕТО (лучшее)</div>
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
      </div>
    </div>
  );
}
