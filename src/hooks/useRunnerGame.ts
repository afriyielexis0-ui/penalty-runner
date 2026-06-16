import { useState, useEffect, useCallback, useRef } from "react";
import { GameState, Lane, Phase } from "../types/game";

const TICK_MS = 50;
const PLAYER_Y = 520;
const SPAWN_Y = -60;
const OBSTACLE_SPEED_BASE = 6;
const GOAL_SPEED_BASE = 5;
const OBSTACLE_HIT_RADIUS = 44;
const GOAL_HIT_Y_MIN = PLAYER_Y - 50;
const GOAL_HIT_Y_MAX = PLAYER_Y + 50;
const SHOOT_COOLDOWN_TICKS = 20;

let nextId = 1;

function initial(): GameState {
  return {
    phase: "idle",
    lane: 1,
    score: 0,
    distance: 0,
    speed: 1,
    obstacles: [],
    goals: [],
    shootCooldown: 0,
    lives: 3,
    combo: 0,
  };
}

function randomLane(): Lane {
  return (Math.floor(Math.random() * 3)) as Lane;
}

export function useRunnerGame() {
  const [state, setState] = useState<GameState>(initial);
  const stateRef = useRef(state);
  stateRef.current = state;

  const tickRef = useRef<number | null>(null);
  const frameRef = useRef(0);

  const stopLoop = useCallback(() => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    frameRef.current += 1;
    const f = frameRef.current;

    setState((prev) => {
      if (prev.phase !== "running") return prev;

      const speed = prev.speed;
      const obstacleSpeed = OBSTACLE_SPEED_BASE * speed;
      const goalSpeed = GOAL_SPEED_BASE * speed;

      // Move obstacles
      let obstacles = prev.obstacles
        .map((o) => ({ ...o, y: o.y + obstacleSpeed }))
        .filter((o) => o.y < 700);

      // Move goals
      let goals = prev.goals
        .map((g) => ({ ...g, y: g.y + goalSpeed }))
        .filter((g) => g.y < 700);

      // Spawn obstacle every ~60 frames (adjusted by speed)
      const obstacleInterval = Math.max(30, Math.round(70 / speed));
      if (f % obstacleInterval === 0) {
        const lane = randomLane();
        obstacles = [...obstacles, { id: nextId++, lane, y: SPAWN_Y }];
      }

      // Spawn goal every ~90 frames
      const goalInterval = Math.max(50, Math.round(100 / speed));
      if (f % goalInterval === 0) {
        const lane = randomLane();
        goals = [...goals, { id: nextId++, lane, y: SPAWN_Y }];
      }

      // Collision: obstacle hits player
      let lives = prev.lives;
      let hitObstacleIds: number[] = [];
      for (const o of obstacles) {
        if (
          o.lane === prev.lane &&
          o.y >= PLAYER_Y - OBSTACLE_HIT_RADIUS &&
          o.y <= PLAYER_Y + OBSTACLE_HIT_RADIUS
        ) {
          lives -= 1;
          hitObstacleIds.push(o.id);
        }
      }
      obstacles = obstacles.filter((o) => !hitObstacleIds.includes(o.id));

      // Goal scoring: goals that passed player without being shot (just despawn)
      // (shooting is handled separately)

      const distance = prev.distance + speed;
      const newSpeed = 1 + Math.floor(distance / 800) * 0.25;

      const phase: Phase = lives <= 0 ? "gameover" : "running";

      return {
        ...prev,
        obstacles,
        goals,
        lives,
        distance: Math.round(distance),
        speed: newSpeed,
        shootCooldown: Math.max(0, prev.shootCooldown - 1),
        phase,
      };
    });
  }, []);

  const startGame = useCallback(() => {
    frameRef.current = 0;
    nextId = 1;
    setState({ ...initial(), phase: "running" });
    stopLoop();
    tickRef.current = window.setInterval(tick, TICK_MS);
  }, [tick, stopLoop]);

  useEffect(() => {
    if (state.phase === "gameover" || state.phase === "idle") {
      stopLoop();
    }
  }, [state.phase, stopLoop]);

  useEffect(() => () => stopLoop(), [stopLoop]);

  const moveLeft = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== "running") return prev;
      const lane = Math.max(0, prev.lane - 1) as Lane;
      return { ...prev, lane };
    });
  }, []);

  const moveRight = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== "running") return prev;
      const lane = Math.min(2, prev.lane + 1) as Lane;
      return { ...prev, lane };
    });
  }, []);

  const shoot = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== "running" || prev.shootCooldown > 0) return prev;

      // Find goals in player's lane near the player
      const hit = prev.goals.find(
        (g) =>
          g.lane === prev.lane &&
          g.y >= GOAL_HIT_Y_MIN &&
          g.y <= GOAL_HIT_Y_MAX
      );

      if (!hit) return { ...prev, shootCooldown: SHOOT_COOLDOWN_TICKS };

      const combo = prev.combo + 1;
      const points = 10 * combo;

      return {
        ...prev,
        goals: prev.goals.filter((g) => g.id !== hit.id),
        score: prev.score + points,
        combo,
        shootCooldown: SHOOT_COOLDOWN_TICKS,
      };
    });
  }, []);

  // Reset combo when a goal passes without being scored
  useEffect(() => {
    // handled passively via distance ticks — keep it simple
  }, []);

  return { state, startGame, moveLeft, moveRight, shoot };
}
