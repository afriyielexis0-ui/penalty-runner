import { useState, useEffect, useCallback, useRef } from "react";
import { GameState, Lane, Phase, Ball } from "../types/game";

const TICK_MS = 50;
const PLAYER_Y = 520;
const SPAWN_Y = -60;
const OBSTACLE_SPEED_BASE = 6;
const GOAL_SPEED_BASE = 5;
const OBSTACLE_HIT_RADIUS = 44;
const SHOOT_COOLDOWN_TICKS = 20;
const BALL_SPEED = 24;
const BALL_HIT_RADIUS = 32;
const BALL_DESPAWN_Y = -40;
const GOAL_MISS_Y = PLAYER_Y + 60;

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
    balls: [],
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

      // Move the player's balls upward toward the goals
      let balls = prev.balls
        .map((b) => ({ ...b, y: b.y - BALL_SPEED }))
        .filter((b) => b.y > BALL_DESPAWN_Y);

      // Ball vs goal collision: a ball in the same lane reaching a goal scores it
      let combo = prev.combo;
      let score = prev.score;
      const scoredGoalIds: number[] = [];
      const spentBallIds: number[] = [];
      for (const b of balls) {
        if (spentBallIds.includes(b.id)) continue;
        const target = goals.find(
          (g) =>
            g.lane === b.lane &&
            !scoredGoalIds.includes(g.id) &&
            Math.abs(g.y - b.y) <= BALL_HIT_RADIUS
        );
        if (target) {
          combo += 1;
          score += 10 * combo;
          scoredGoalIds.push(target.id);
          spentBallIds.push(b.id);
        }
      }
      balls = balls.filter((b) => !spentBallIds.includes(b.id));
      goals = goals.filter((g) => !scoredGoalIds.includes(g.id));

      // A goal that drifts past the player without being scored breaks the combo
      const missed = goals.some((g) => g.y >= GOAL_MISS_Y);
      if (missed) combo = 0;

      const distance = prev.distance + speed;
      const newSpeed = 1 + Math.floor(distance / 800) * 0.25;

      const phase: Phase = lives <= 0 ? "gameover" : "running";

      return {
        ...prev,
        obstacles,
        goals,
        balls,
        lives,
        score,
        combo,
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

      const ball: Ball = { id: nextId++, lane: prev.lane, y: PLAYER_Y - 26 };

      return {
        ...prev,
        balls: [...prev.balls, ball],
        shootCooldown: SHOOT_COOLDOWN_TICKS,
      };
    });
  }, []);

  return { state, startGame, moveLeft, moveRight, shoot };
}
