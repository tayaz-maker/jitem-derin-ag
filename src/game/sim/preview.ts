import { EDGES, NODES } from "../data.ts";
import { executeAction } from "../engine.ts";
import type { GameState, PlannedAction, StatKey } from "../types.ts";

/**
 * Move preview and outcome use one code path: the preview runs the real
 * `executeAction` on a private copy of the state, and the committed move runs
 * it on the live state with the same input. Nothing here is persisted, so
 * the save key and schema are untouched.
 */
export type Change =
  | { kind: "stat"; key: StatKey; from: number; to: number }
  | { kind: "actions"; from: number; to: number }
  | { kind: "heat"; from: number; to: number }
  | {
      kind: "edge";
      id: string;
      label: string;
      field: "trust" | "dependency" | "secrecy" | "tension";
      from: number;
      to: number;
    }
  | { kind: "node"; id: string; label: string; from: number; to: number }
  | { kind: "faction"; id: string; from: number; to: number }
  | { kind: "records"; from: number; to: number };

const STATS: StatKey[] = ["etki", "kara", "giz", "bilgi", "saha", "sadakat", "kamuoyu", "hukuk"];
const EDGE_FIELDS = ["trust", "dependency", "secrecy", "tension"] as const;

/** The exact input a committed move is executed with. */
export function moveInput(state: GameState, plan: PlannedAction): GameState {
  return { ...state, pendingAction: plan.id };
}

export function diffState(before: GameState, after: GameState): Change[] {
  const out: Change[] = [];
  if (after.actionsLeft !== before.actionsLeft)
    out.push({ kind: "actions", from: before.actionsLeft, to: after.actionsLeft });
  for (const key of STATS) {
    const from = before.stats[key] ?? 0;
    const to = after.stats[key] ?? 0;
    if (from !== to) out.push({ kind: "stat", key, from, to });
  }
  if (after.investigation.heat !== before.investigation.heat)
    out.push({ kind: "heat", from: before.investigation.heat, to: after.investigation.heat });
  for (const id of new Set([...Object.keys(before.edgeLive), ...Object.keys(after.edgeLive)])) {
    const a = before.edgeLive[id];
    const b = after.edgeLive[id];
    if (!b) continue;
    for (const field of EDGE_FIELDS) {
      const from = a?.[field] ?? 0;
      if (from !== b[field])
        out.push({
          kind: "edge",
          id,
          label: EDGES.find((e) => e.id === id)?.label ?? id,
          field,
          from,
          to: b[field],
        });
    }
  }
  for (const id of new Set([...Object.keys(before.nodeHeat), ...Object.keys(after.nodeHeat)])) {
    const from = before.nodeHeat[id] ?? 0;
    const to = after.nodeHeat[id] ?? 0;
    if (from !== to)
      out.push({ kind: "node", id, label: NODES.find((n) => n.id === id)?.name ?? id, from, to });
  }
  for (const id of Object.keys(after.factions)) {
    const from = before.factions[id]?.hostility ?? 0;
    const to = after.factions[id].hostility;
    if (from !== to) out.push({ kind: "faction", id, from, to });
  }
  const known = (s: GameState) =>
    Object.values(s.hand).filter((h) => h.status !== "UNKNOWN").length;
  if (known(before) !== known(after))
    out.push({ kind: "records", from: known(before), to: known(after) });
  return out;
}

export interface MovePreview {
  /** false when the engine would refuse the move as it stands */
  ok: boolean;
  changes: Change[];
}

export function previewMove(state: GameState, plan: PlannedAction): MovePreview {
  const input = structuredClone(moveInput(state, plan));
  const next = executeAction(input, plan);
  if (next === input) return { ok: false, changes: [] };
  return { ok: true, changes: diffState(state, next) };
}

/** Which way a change reads for the player, so colour is never the only cue. */
export function changeTone(c: Change): "good" | "bad" | "neutral" {
  const up = c.to > c.from;
  if (c.kind === "actions") return "neutral";
  if (c.kind === "heat" || c.kind === "faction" || c.kind === "node") return up ? "bad" : "good";
  if (c.kind === "edge")
    return c.field === "tension" || c.field === "dependency"
      ? up
        ? "bad"
        : "good"
      : up
        ? "good"
        : "bad";
  if (c.kind === "stat")
    return ["kamuoyu", "hukuk"].includes(c.key) ? (up ? "bad" : "good") : up ? "good" : "bad";
  return up ? "good" : "neutral";
}

export type NextStep = "event" | "target" | "move" | "confirm" | "resolve" | "report" | null;

/** One plain instruction for what the player should do now. */
export function nextStep(state: GameState, ui: { hasTarget: boolean; hasMove: boolean }): NextStep {
  if (state.phase === "event") return "event";
  if (state.phase === "resolution") return "report";
  if (state.phase !== "actions") return null;
  if (state.actionsLeft <= 0) return "resolve";
  if (!ui.hasTarget) return "target";
  if (!ui.hasMove) return "move";
  return "confirm";
}
