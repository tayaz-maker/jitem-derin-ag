import type { GameState, StatKey } from "../types.ts";

export function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function applyStat(state: GameState, key: StatKey, delta: number): GameState {
  return {
    ...state,
    stats: { ...state.stats, [key]: clamp(state.stats[key] + delta) },
  };
}

export function applyMany(
  state: GameState,
  deltas: Partial<Record<StatKey, number>>,
): GameState {
  let next = state;
  for (const [k, v] of Object.entries(deltas)) {
    if (typeof v === "number") next = applyStat(next, k as StatKey, v);
  }
  return next;
}
