import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { artSystem } from "../game/art/pixel.js";

// ---------- пиксельная иконка предмета (рендер через арт-систему) ----------
export function ItemIcon({
  art,
  size = 36,
  dim = false,
}: {
  art: string | null;
  size?: number;
  dim?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!art) return;
    const frame = artSystem.frameCanvas(art, "idle", 0);
    if (!frame) return;
    const s = size / Math.max(frame.width, frame.height);
    const w = frame.width * s;
    const h = frame.height * s;
    ctx.drawImage(frame, (size - w) / 2, (size - h) / 2, w, h);
  }, [art, size]);
  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        imageRendering: "pixelated",
        opacity: dim ? 0.28 : 1,
      }}
    />
  );
}

// ---------- типы снапшота из движка ----------
export type InvItem = {
  id: string;
  name: string;
  slot: string;
  tier: number;
  cold: number;
  dmg: number;
  rate: number;
  range: number;
  art: string | null;
  equipped: boolean;
};
export type EquippedMap = {
  hat: InvItem | null;
  jacket: InvItem | null;
  pants: InvItem | null;
  boots: InvItem | null;
  mittens: InvItem | null;
  weapon: InvItem | null;
};
export type Snapshot = {
  state: string;
  heat: number;
  maxHeat: number;
  hp: number;
  maxHp: number;
  hpRate: number;
  cause: string;
  xp: number;
  xpNext: number;
  level: number;
  insulation: number;
  weapon: { id: string; name: string; dmg: number; rate: number; art: string | null } | null;
  equipped: EquippedMap;
  kills: number;
  time: number;
  found: number;
  total: number;
  inv: InvItem[];
  muted: boolean;
  stats: { bestTime: number; totalKills: number; runs: number; victories: number; inv: string[] };
  wind: { angle: number; strength: number; blizzard: boolean };
  shotgun: {
    tube: number;
    tubeMax: number;
    ammo: number;
    reloading: boolean;
    reloadProgress: number;
  } | null;
};
export type Toast = { id: number; kind: string; text: string; tier?: number };

export const fmtTime = (s: number) => {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, "0")}`;
};

// ---------- пиксельные SVG-иконки ----------
export const IcoFlame = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
    <path d="M4 0L5 2L6 1L6 4L7 4L7 6L6 7L2 7L1 6L1 4L2 4L2 3L3 3L3 1Z" fill="#ffb347" />
    <path d="M4 3L5 5L4 6L3 5Z" fill="#ff5a3c" />
  </svg>
);
export const IcoSnow = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
    <path d="M3 0H5V3H8V5H5V8H3V5H0V3H3Z" fill="#6fd6ff" />
    <path d="M1 1H2V2H1ZM6 1H7V2H6ZM1 6H2V7H1ZM6 6H7V7H6Z" fill="#6fd6ff" />
  </svg>
);
export const IcoSword = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
    <path d="M6 0H8V2L4 6L2 4Z" fill="#cfd8e6" />
    <path d="M2 4L4 6L3 7H2V8H1V7H0V6H1V5Z" fill="#8a93a6" />
  </svg>
);
export const IcoSkull = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
    <path d="M1 1H7V5H6V7H2V5H1Z" fill="#e8f2ff" />
    <path d="M2 3H3V4H2ZM5 3H6V4H5Z" fill="#0a1120" />
  </svg>
);
export const IcoBox = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
    <path d="M0 2H8V8H0Z" fill="#4d6a8f" />
    <path d="M0 2H8V3H0ZM3 3H5V8H3Z" fill="#9fb6cc" />
  </svg>
);
export const IcoClock = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
    <path d="M1 1H7V7H1Z" fill="#16233c" />
    <path d="M0 1H1V7H0ZM7 1H8V7H7ZM1 0H7V1H1ZM1 7H7V8H1Z" fill="#9fb6cc" />
    <path d="M4 2H5V4H6V5H4Z" fill="#6fd6ff" />
  </svg>
);

const TIER_COL = ["#9fb6cc", "#9fb6cc", "#6fd6ff", "#ffb347"];

export const IcoHeart = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
    <path
      d="M1 1H3V2H4V1H6V2H7V4H6V5H5V6H4V7H3V6H2V5H1V4H0V2H1Z"
      fill="#ff4757"
    />
    <path d="M1 2H2V3H1Z" fill="#ff8a94" />
  </svg>
);
export const IcoStar = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
    <path d="M3 0H5V2H7V3H8V5H7V6H5V8H3V6H1V5H0V3H1V2H3Z" fill="#6fd6ff" />
    <path d="M3 2H5V3H6V5H5V6H3V5H2V3H3Z" fill="#d6f6ff" />
  </svg>
);

// ---------- шкала с «хвостом» расхода ----------
// disp догоняет значение быстро, ghost тянется медленно —
// потеря читается как вытекающие пиксели.
function VitalBar({
  label,
  icon,
  value,
  max,
  baseColor,
  ghostColor,
  labelColor,
  rate,
  lowAt,
  colorFor,
}: {
  label: string;
  icon: ReactNode;
  value: number;
  max: number;
  baseColor: string;
  ghostColor: string;
  labelColor: string;
  rate?: number;
  lowAt?: number;
  colorFor?: (pct: number) => string;
}) {
  const target = useRef({ v: value, g: value });
  const [disp, setDisp] = useState({ v: value, g: value });

  useEffect(() => {
    target.current.v = value;
    if (value > target.current.g) target.current.g = value;
  }, [value]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setDisp((prev) => {
        const t = target.current;
        const nv = prev.v + (t.v - prev.v) * Math.min(1, dt * 12);
        const ng = t.v < t.g ? t.g + (t.v - t.g) * Math.min(1, dt * 2.1) : t.v;
        t.g = ng;
        if (Math.abs(nv - prev.v) < 0.02 && Math.abs(ng - prev.g) < 0.02)
          return prev;
        return { v: nv, g: ng };
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pct = Math.max(0, Math.min(100, (disp.v / max) * 100));
  const gpct = Math.max(pct, Math.min(100, (disp.g / max) * 100));
  const critical = lowAt !== undefined && (value / max) * 100 <= lowAt;
  const col = colorFor ? colorFor(pct) : baseColor;
  const draining = rate !== undefined && rate < 0;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span
          className={`font-pixel text-[9px] tracking-wider flex items-center gap-1.5 ${critical ? "heat-critical" : ""}`}
          style={{ color: critical ? "#ff4757" : labelColor }}
        >
          {icon}
          {label}
        </span>
        <span className="flex items-baseline gap-2">
          {rate !== undefined && rate !== 0 && (
            <span
              className={`font-term text-[11px] font-bold tabular-nums ${
                draining ? "text-[#ff4757] blink-soft" : "text-[#7dff8a]"
              }`}
            >
              {draining ? `−${Math.abs(rate).toFixed(1)}/с` : `+${rate.toFixed(1)}/с`}
            </span>
          )}
          <span
            className={`font-term font-bold text-sm tabular-nums ${
              critical ? "text-[#ff4757] heat-critical" : "text-[#e8f2ff]"
            }`}
          >
            {Math.ceil(disp.v)}
          </span>
        </span>
      </div>
      <div className="relative w-60 h-[18px] bg-[#0a0f1e] border-2 border-[#1d2c44] p-[2px]">
        <div className="relative h-full overflow-hidden">
          {/* хвост расхода */}
          <div
            className="absolute inset-y-0 left-0"
            style={{ width: `${gpct}%`, background: ghostColor, opacity: 0.45 }}
          />
          {/* текущее значение */}
          <div
            className={`absolute inset-y-0 left-0 ${critical ? "heat-critical" : ""}`}
            style={{
              width: `${pct}%`,
              background: `repeating-linear-gradient(90deg, ${col} 0px, ${col} 6px, ${col}cc 6px, ${col}cc 8px)`,
            }}
          />
          {/* пиксельная насечка */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "repeating-linear-gradient(90deg, rgba(5,8,15,0) 0px, rgba(5,8,15,0) 7px, rgba(5,8,15,0.85) 7px, rgba(5,8,15,0.85) 8px)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

const heatColor = (pct: number) =>
  pct > 50 ? "#ffb347" : pct > 25 ? "#ff8c42" : "#ff4757";

// ---------- шкала опыта ----------
// Заполняется по мере убийств; при новом уровне (xp сбрасывается)
// быстро опустошается. Уровень вынесен в отдельный значок.
function XpBar({ xp, xpNext, level }: { xp: number; xpNext: number; level: number }) {
  const target = xpNext > 0 ? xp / xpNext : 0;
  const [disp, setDisp] = useState(target);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setDisp((prev) => {
        // подъём плавный, сброс (уровень) — почти мгновенный
        const speed = target > prev ? 6 : 14;
        const nv = prev + (target - prev) * Math.min(1, dt * speed);
        if (Math.abs(nv - prev) < 0.002) return prev;
        return nv;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const pct = Math.max(0, Math.min(100, disp * 100));

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-pixel text-[9px] tracking-wider flex items-center gap-1.5 text-[#6fd6ff]">
          <IcoStar />
          ОПЫТ
        </span>
        <span className="flex items-baseline gap-2">
          <span className="font-pixel text-[8px] px-1.5 py-0.5 border border-[#2c4266] text-[#6fd6ff]">
            УР.{level}
          </span>
          <span className="font-term font-bold text-sm tabular-nums text-[#e8f2ff]">
            {xp}/{xpNext}
          </span>
        </span>
      </div>
      <div className="relative w-60 h-[12px] bg-[#0a0f1e] border-2 border-[#1d2c44] p-[2px]">
        <div className="relative h-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${pct}%`,
              background:
                "repeating-linear-gradient(90deg, #6fd6ff 0px, #6fd6ff 6px, #6fd6ffcc 6px, #6fd6ffcc 8px)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "repeating-linear-gradient(90deg, rgba(5,8,15,0) 0px, rgba(5,8,15,0) 7px, rgba(5,8,15,0.85) 7px, rgba(5,8,15,0.85) 8px)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------- флюгер: направление и сила ветра ----------
function WindVane({
  wind,
}: {
  wind: { angle: number; strength: number; blizzard: boolean };
}) {
  if (!wind) return null;
  const deg = (wind.angle * 180) / Math.PI;
  const segs = Math.round(wind.strength * 3); // 0..3
  return (
    <div className="flex items-center gap-2">
      <span className="font-pixel text-[8px] text-[#4d6a8f]">ВЕТЕР</span>
      <svg
        width="18"
        height="18"
        viewBox="0 0 10 10"
        shapeRendering="crispEdges"
        style={{
          transform: `rotate(${deg}deg)`,
          transition: "transform 1.4s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* стрелка направлена вдоль +X (по направлению ветра) */}
        <path d="M1 4H6V2L10 5L6 8V6H1Z" fill="#6fd6ff" />
      </svg>
      <span className="flex gap-[2px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block w-[3px]"
            style={{
              height: 5 + i * 2,
              background: i < segs ? "#6fd6ff" : "#1d2c44",
              alignSelf: "flex-end",
            }}
          />
        ))}
      </span>
      {wind.blizzard && (
        <span
          className="font-pixel text-[7px] px-1.5 py-1 blink-soft"
          style={{ color: "#a9d7f2", border: "1px solid #6fd6ff" }}
        >
          МЕТЕЛЬ
        </span>
      )}
    </div>
  );
}

// ---------- дробовик: ствол (2 патрона) + запас + перезарядка ----------
function ShotgunAmmo({
  s,
}: {
  s: { tube: number; tubeMax: number; ammo: number; reloading: boolean; reloadProgress: number };
}) {
  return (
    <div className="mt-2 pt-2 border-t-2 border-[#16233c]">
      <div className="flex items-center gap-2">
        {/* патроны в стволе */}
        <span className="flex gap-1">
          {Array.from({ length: s.tubeMax }).map((_, i) => (
            <span
              key={i}
              className="inline-block w-[6px] h-[12px]"
              style={{
                background: i < s.tube ? "#c23b3b" : "#1d2c44",
                boxShadow: i < s.tube ? "inset 0 -3px 0 #d9b54a" : "none",
              }}
            />
          ))}
        </span>
        <span className="font-term text-[11px] font-bold text-[#d9b54a] tabular-nums">
          +{s.ammo}
        </span>
        {s.reloading && (
          <span className="font-pixel text-[7px] text-[#7dff8a] blink-soft">ЗАРЯДКА</span>
        )}
      </div>
      {s.reloading && (
        <div className="w-full h-[5px] bg-[#0a0f1e] border border-[#1d2c44] mt-1.5">
          <div
            className="h-full bg-[#7dff8a]"
            style={{ width: `${Math.round(s.reloadProgress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ---------- HUD ----------
function HUD({
  snap,
  toasts,
  minimapRef,
}: {
  snap: Snapshot;
  toasts: Toast[];
  minimapRef: (el: HTMLCanvasElement | null) => void;
}) {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 select-none">
      {/* верх слева: тепло / защита / оружие */}
      <div className="absolute top-4 left-4 panel-pixel px-4 py-3 space-y-3">
        <VitalBar
          label="ЖИЗНЬ"
          icon={<IcoHeart />}
          value={snap.hp}
          max={snap.maxHp}
          baseColor="#ff4757"
          ghostColor="#ffb3bc"
          labelColor="#ff6b7a"
          rate={snap.hpRate}
          lowAt={30}
        />
        <VitalBar
          label="ТЕПЛО"
          icon={<IcoFlame />}
          value={snap.heat}
          max={snap.maxHeat}
          baseColor="#ffb347"
          ghostColor="#ffe0b8"
          labelColor="#ffb347"
          lowAt={25}
          colorFor={heatColor}
        />
        <XpBar xp={snap.xp} xpNext={snap.xpNext} level={snap.level} />
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-term text-[12px] font-bold text-[#6fd6ff]">
            <IcoSnow /> ЗАЩИТА <b className="text-[#e8f2ff]">{snap.insulation}</b>
          </span>
          <span className="flex items-center gap-1.5 font-term text-[12px] font-bold text-[#cfd8e6]">
            <IcoSword /> {snap.weapon?.name} · <b className="text-[#ffd9ac]">{snap.weapon?.dmg}</b>
          </span>
        </div>
      </div>

      {/* верх справа: миникарта + счёт */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
        <div className="panel-pixel p-2">
          <canvas
            ref={minimapRef}
            width={128}
            height={128}
            style={{ width: 144, height: 144, display: "block" }}
          />
        </div>
        <div className="panel-pixel px-3 py-2 flex items-center gap-4 font-term text-[12px] font-bold">
          <span className="flex items-center gap-1.5 text-[#9fb6cc]">
            <IcoClock /> <span className="text-[#e8f2ff] tabular-nums">{fmtTime(snap.time)}</span>
          </span>
          <span className="flex items-center gap-1.5 text-[#9fb6cc]">
            <IcoSkull /> <span className="text-[#ff6b7a] tabular-nums">{snap.kills}</span>
          </span>
          <span className="flex items-center gap-1.5 text-[#9fb6cc]">
            <IcoBox />
            <span className="text-[#6fd6ff] tabular-nums">
              {snap.found}/{snap.total}
            </span>
          </span>
        </div>
        <div className="panel-pixel px-3 py-2">
          <WindVane wind={snap.wind} />
        </div>
      </div>

      {/* низ слева: оружие в руке (ровно одно) */}
      <div className="absolute bottom-4 left-4 panel-pixel px-3 py-2.5">
        <div className="font-pixel text-[8px] text-[#4d6a8f] mb-2">В РУКЕ</div>
        <div className="flex items-center gap-2.5">
          {snap.weapon?.art && <ItemIcon art={snap.weapon.art} size={30} />}
          <div className="leading-tight">
            <div className="font-term text-[12px] font-bold text-[#ffb347]">
              {snap.weapon?.name}
            </div>
            <div className="font-term text-[10px] text-[#9fb6cc]">
              урон <span className="text-[#ffd9ac] font-bold">{snap.weapon?.dmg}</span>
              <span className="opacity-60"> · {(snap.weapon?.rate ?? 0).toFixed(1)}/с</span>
            </div>
          </div>
        </div>

        {/* дробовик: патроны в стволе + запас + перезарядка */}
        {snap.shotgun && <ShotgunAmmo s={snap.shotgun} />}

        <div className="font-term text-[9px] text-[#4d6a8f] mt-1.5">
          смена оружия — в снаряжении между играми
        </div>
      </div>

      {/* низ справа: управление */}
      <div className="absolute bottom-4 right-4 panel-pixel px-3 py-2.5 font-term text-[11px] text-[#9fb6cc] leading-relaxed">
        <div><span className="key-cap mr-1.5">WASD</span>движение</div>
        <div><span className="key-cap mr-1.5">SPACE</span><span className="key-cap mr-1.5">ЛКМ</span>атака</div>
        <div><span className="key-cap mr-1.5">TAB</span>схрон · <span className="key-cap ml-1.5 mr-1.5">M</span>звук</div>
      </div>

      {/* тосты находок */}
      <div className="absolute left-1/2 bottom-24 -translate-x-1/2 flex flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-in panel-deep px-4 py-2.5 font-pixel text-[9px] tracking-wide"
            style={{
              borderColor: t.kind === "item" ? TIER_COL[t.tier || 1] : "#2c4266",
              color: t.kind === "item" ? TIER_COL[t.tier || 1] : "#9fb6cc",
              textShadow: "0 0 10px rgba(111,214,255,0.35)",
            }}
          >
            {t.kind === "item" ? "НАЙДЕНО: " : ""}
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(HUD);
