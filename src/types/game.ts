export type Lane = 0 | 1 | 2;
export type Phase = "idle" | "running" | "shooting" | "gameover";

export interface Obstacle {
  id: number;
  lane: Lane;
  y: number;
}

export interface Goal {
  id: number;
  lane: Lane;
  y: number;
}

export interface Ball {
  id: number;
  lane: Lane;
  y: number;
}

export interface GameState {
  phase: Phase;
  lane: Lane;
  score: number;
  distance: number;
  speed: number;
  obstacles: Obstacle[];
  goals: Goal[];
  balls: Ball[];
  shootCooldown: number;
  lives: number;
  combo: number;
}
