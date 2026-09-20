import type { GameState } from "../types.ts";

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickSeed() {
  return (Math.floor(Math.random() * 0xffffffff) ^ Date.now()) >>> 0;
}

export function pickWeighted<T extends { weight: number }>(
  rng: () => number,
  items: T[],
): T {
  const viable = items.filter((i) => i.weight > 0);
  const pool = viable.length ? viable : items;
  const sum = pool.reduce((s, i) => s + i.weight, 0);
  let r = rng() * sum;
  for (const item of pool) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return pool[pool.length - 1];
}

export function roll(state: GameState, salt = 0): [GameState, number] {
  const rng = mulberry32((state.eventSeed ^ (state.rngCursor * 0x9e3779b9) ^ salt) >>> 0);
  const v = rng();
  return [{ ...state, rngCursor: state.rngCursor + 1 }, v];
}

export function rollAi(state: GameState, salt = 0): [GameState, number] {
  const rng = mulberry32((state.aiSeed ^ (state.rngCursor * 0x85ebca6b) ^ salt) >>> 0);
  const v = rng();
  return [{ ...state, rngCursor: state.rngCursor + 1 }, v];
}
