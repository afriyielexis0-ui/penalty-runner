import { useEffect, useCallback } from "react";
import { useRunnerGame } from "./hooks/useRunnerGame";
import { Lane } from "./types/game";

const LANE_X: Record<Lane, number> = { 0: 80, 1: 200, 2: 320 };
const TRACK_W = 400;
const TRACK_H = 600;
const PLAYER_Y = 520;

function Heart({ filled }: { filled: boolean }) {
  return (
    <span style={{ fontSize: 22, color: filled ? "#ef4444" : "#333", marginRight: 2 }}>
      {filled ? "❤️" : "🖤"}
    </span>
  );
}

export default function App() {
  const { state, startGame, moveLeft, moveRight, shoot } = useRunnerGame();
  const { phase, lane, score, distance, obstacles, goals, balls, lives, combo, shootCooldown } = state;

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") moveLeft();
      if (e.key === "ArrowRight" || e.key === "d") moveRight();
      if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); shoot(); }
      if (e.key === "Enter" && phase !== "running") startGame();
    },
    [moveLeft, moveRight, shoot, startGame, phase]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const canShoot = shootCooldown === 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Courier New', monospace",
        color: "#e6edf3",
        userSelect: "none",
        padding: 16,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 12, textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: 6, color: "#444", marginBottom: 2 }}>
          ⚽ PENALTY RUNNER
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 4 }}>SCORE: {score}</div>
        {combo > 1 && (
          <div style={{ fontSize: 13, color: "#f59e0b", letterSpacing: 2, marginTop: 2 }}>
            🔥 x{combo} COMBO
          </div>
        )}
      </div>

      {/* Lives */}
      <div style={{ marginBottom: 10 }}>
        {[0, 1, 2].map((i) => <Heart key={i} filled={i < lives} />)}
      </div>

      {/* Track */}
      <div
        style={{
          position: "relative",
          width: TRACK_W,
          height: TRACK_H,
          background: "linear-gradient(180deg, #0d2318 0%, #143020 40%, #0f2318 100%)",
          borderRadius: 12,
          overflow: "hidden",
          border: "2px solid #1a3a24",
        }}
      >
        {/* Lane dividers */}
        {[133, 266].map((x) => (
          <div
            key={x}
            style={{
              position: "absolute",
              left: x,
              top: 0,
              width: 2,
              height: "100%",
              background: "repeating-linear-gradient(180deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 20px, transparent 20px, transparent 40px)",
            }}
          />
        ))}

        {/* Pitch lines (horizontal stripes) */}
        {[100, 200, 300, 400, 500].map((y) => (
          <div
            key={y}
            style={{
              position: "absolute",
              top: y,
              left: 0,
              right: 0,
              height: 1,
              background: "rgba(255,255,255,0.05)",
            }}
          />
        ))}

        {/* Goals (penalty targets) */}
        {goals.map((g) => (
          <div
            key={g.id}
            style={{
              position: "absolute",
              left: LANE_X[g.lane as Lane] - 28,
              top: g.y - 28,
              width: 56,
              height: 56,
              borderRadius: 8,
              border: "3px solid #39d353",
              background: "rgba(57,211,83,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              boxShadow: "0 0 12px rgba(57,211,83,0.3)",
            }}
          >
            🥅
          </div>
        ))}

        {/* Obstacles */}
        {obstacles.map((o) => (
          <div
            key={o.id}
            style={{
              position: "absolute",
              left: LANE_X[o.lane as Lane] - 22,
              top: o.y - 22,
              width: 44,
              height: 44,
              borderRadius: 6,
              background: "rgba(239,68,68,0.2)",
              border: "2px solid #ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            🚧
          </div>
        ))}

        {/* Balls in flight */}
        {balls.map((b) => (
          <div
            key={b.id}
            style={{
              position: "absolute",
              left: LANE_X[b.lane as Lane] - 12,
              top: b.y - 12,
              width: 24,
              height: 24,
              borderRadius: 12,
              background: "#f5f5f0",
              border: "2px solid #1a1a1a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              boxShadow: "0 0 8px rgba(255,255,255,0.6)",
            }}
          >
            ⚽
          </div>
        ))}

        {/* Player */}
        {phase === "running" && (
          <div
            style={{
              position: "absolute",
              left: LANE_X[lane as Lane] - 24,
              top: PLAYER_Y - 24,
              width: 48,
              height: 48,
              borderRadius: 24,
              background: "rgba(251,191,36,0.15)",
              border: `3px solid ${canShoot ? "#fbbf24" : "#555"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              transition: "left 0.1s ease, border-color 0.2s",
              boxShadow: canShoot ? "0 0 14px rgba(251,191,36,0.4)" : "none",
            }}
          >
            🧍
          </div>
        )}

        {/* Idle overlay */}
        {phase === "idle" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.75)",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 52 }}>⚽</div>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3 }}>PENALTY RUNNER</div>
            <div style={{ fontSize: 12, color: "#555", letterSpacing: 1, textAlign: "center", lineHeight: 1.8, maxWidth: 240 }}>
              Dodge 🚧 obstacles<br />
              Shoot 🥅 goals for points<br />
              Combos multiply your score
            </div>
            <button onClick={startGame} style={btnStyle("#39d353")}>▶ START</button>
            <div style={{ fontSize: 11, color: "#333", letterSpacing: 1, marginTop: 4 }}>
              ← → MOVE &nbsp;|&nbsp; SPACE SHOOT
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {phase === "gameover" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.8)",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 48 }}>💔</div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, color: "#ef4444" }}>GAME OVER</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#fbbf24" }}>{score} pts</div>
            <div style={{ fontSize: 12, color: "#555" }}>{Math.round(distance)}m run</div>
            <button onClick={startGame} style={btnStyle("#39d353")}>↺ PLAY AGAIN</button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
        <button onPointerDown={moveLeft} style={btnStyle("#4d6a56", 48)}>◀</button>
        <button
          onPointerDown={shoot}
          style={btnStyle(canShoot ? "#fbbf24" : "#333", 80)}
        >
          ⚽ SHOOT
        </button>
        <button onPointerDown={moveRight} style={btnStyle("#4d6a56", 48)}>▶</button>
      </div>

      <div style={{ marginTop: 14, fontSize: 11, color: "#333", letterSpacing: 2 }}>
        {Math.round(distance)}m · speed x{state.speed.toFixed(1)}
      </div>
    </div>
  );
}

function btnStyle(color: string, minWidth?: number): React.CSSProperties {
  return {
    padding: "10px 20px",
    minWidth,
    background: "transparent",
    border: `2px solid ${color}`,
    borderRadius: 8,
    color,
    fontSize: 13,
    fontFamily: "monospace",
    fontWeight: 800,
    letterSpacing: 2,
    cursor: "pointer",
    transition: "opacity 0.15s",
  };
}
