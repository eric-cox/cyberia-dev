import { useCallback, useEffect, useRef, useState } from "react";
import Game from "./game/Game.js";
import HUD, { type Snapshot, type Toast } from "./ui/HUD";
import {
  MenuScreen,
  DeathScreen,
  VictoryScreen,
  InventoryPanel,
} from "./ui/Screens";

type ScreenId = "menu" | "playing" | "dead" | "victory";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameRef = useRef<any>(null);
  const [screen, setScreen] = useState<ScreenId>("menu");
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [invOpen, setInvOpen] = useState(false);
  const [hurtKey, setHurtKey] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const game = new Game(canvasRef.current, {
      onSnapshot: (s: Snapshot) => setSnap(s),
      onState: (st: string) => {
        setScreen(st as ScreenId);
        if (st === "playing" || st === "dead") setInvOpen(false);
      },
      onToast: (t: { kind: string; text: string; tier?: number }) => {
        const id = Date.now() + Math.random();
        setToasts((ts) => [...ts.slice(-2), { ...t, id }]);
        window.setTimeout(
          () => setToasts((ts) => ts.filter((x) => x.id !== id)),
          2600
        );
      },
      onToggleInventory: () => setInvOpen((v) => !v),
      onHurt: () => setHurtKey((k) => k + 1),
    });
    gameRef.current = game;
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  // ESC закрывает схрон (движок перехватывает Tab/I сам)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") setInvOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const start = useCallback(() => {
    gameRef.current?.sfx.unlock();
    gameRef.current?.startRun();
    setInvOpen(false);
  }, []);

  // морозное дыхание: рамка льда растёт, когда тепло тает
  const heat = snap?.heat ?? 100;
  const frost = heat < 65 ? ((65 - heat) / 65) * 0.9 : 0;
  // кровавая пульсация: жизнь на исходе
  const hp = snap?.hp ?? 100;
  const danger = hp < 35 ? (35 - hp) / 35 : 0;

  return (
    <div className="relative w-full h-full overflow-hidden scanlines" style={{ cursor: screen === "playing" ? "crosshair" : "default" }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* ледяная vignette — усиливается с потерей тепла */}
      <div
        className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-500"
        style={{
          opacity: frost,
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 42%, rgba(159,214,255,0.28) 78%, rgba(232,242,255,0.5) 100%)",
          boxShadow: "inset 0 0 140px 40px rgba(159,214,255,0.35)",
        }}
      />
      {/* красная пульсация — жизнь вымораживается */}
      {danger > 0 && (
        <div
          className="danger-pulse absolute inset-0 z-10 pointer-events-none"
          style={{
            opacity: danger,
            background:
              "radial-gradient(ellipse at center, rgba(255,71,87,0) 42%, rgba(255,71,87,0.42) 100%)",
            boxShadow: "inset 0 0 120px 30px rgba(255,71,87,0.35)",
          }}
        />
      )}
      {/* постоянная vignette */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(5,8,15,0.55) 100%)",
        }}
      />
      {/* вспышка урона */}
      {hurtKey > 0 && (
        <div
          key={hurtKey}
          className="hurt-flash absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255,71,87,0.12) 40%, rgba(255,71,87,0.45) 100%)",
          }}
        />
      )}

      {snap && screen !== "menu" && (
        <HUD
          snap={snap}
          toasts={toasts}
          minimapRef={(el) => {
            if (el && gameRef.current) gameRef.current.attachMinimap(el);
          }}
        />
      )}

      {invOpen && screen === "playing" && (
        <InventoryPanel snap={snap} onClose={() => setInvOpen(false)} />
      )}

      {screen === "menu" && <MenuScreen snap={snap} onStart={start} />}
      {screen === "dead" && <DeathScreen snap={snap} onRestart={start} />}
      {screen === "victory" && (
        <VictoryScreen
          snap={snap}
          onContinue={() => setScreen("playing")}
          onRestart={start}
        />
      )}
    </div>
  );
}
