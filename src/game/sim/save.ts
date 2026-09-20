import { initialFactions } from "./factions.ts";
import { seedEdgeLive } from "./edges.ts";
import { initialHand, initialTruth } from "./knowledge.ts";
import type { GameState, Hat } from "../types.ts";
import { SAVE_VERSION, SCHEMA_VERSION } from "../types.ts";

function apFallback(hat: Hat) {
  return hat === "saha" ? 5 : 4;
}

const FLAG_DEFAULTS: GameState["flags"] = {
  commandShifted: false,
  abasDead: false,
  erseverTalked: false,
  erseverDead: false,
  susurluk: false,
  mitCooledUntil: 0,
  emniyetCooledUntil: 0,
  leakSuppressed: false,
  lastReportTurn: 0,
  investigationOpen: false,
  gizCrisisTurns: 0,
  informantBurned: false,
  yesilUsed: false,
};

const STAT_DEFAULTS: GameState["stats"] = {
  etki: 40,
  kara: 40,
  giz: 70,
  bilgi: 20,
  saha: 40,
  sadakat: 50,
  kamuoyu: 12,
  hukuk: 10,
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

export function migrate(raw: GameState | Record<string, unknown>): GameState {
  const state = (raw ?? {}) as Partial<GameState>;
  const hat: Hat = state.hat === "idari" ? "idari" : "saha";
  const stats = { ...STAT_DEFAULTS, ...(isRecord(state.stats) ? state.stats : {}) };
  for (const k of Object.keys(STAT_DEFAULTS) as (keyof typeof STAT_DEFAULTS)[]) {
    if (typeof stats[k] !== "number" || Number.isNaN(stats[k])) stats[k] = STAT_DEFAULTS[k];
  }
  const worldSeed = typeof state.worldSeed === "number" ? state.worldSeed : 1;
  const next: GameState = {
    version: SAVE_VERSION,
    schemaVersion: SCHEMA_VERSION,
    hat,
    turn: typeof state.turn === "number" && state.turn >= 1 ? Math.min(10, state.turn) : 1,
    phase: state.phase === "event" || state.phase === "actions" || state.phase === "resolution" || state.phase === "ended" ? state.phase : "event",
    stats,
    nodeHeat: isRecord(state.nodeHeat) ? (state.nodeHeat as GameState["nodeHeat"]) : {},
    edgeStr: isRecord(state.edgeStr) ? (state.edgeStr as GameState["edgeStr"]) : {},
    edgeLive: isRecord(state.edgeLive) && Object.keys(state.edgeLive).length ? (state.edgeLive as GameState["edgeLive"]) : seedEdgeLive(),
    stance: isRecord(state.stance) ? (state.stance as GameState["stance"]) : {},
    actorMemory: isRecord(state.actorMemory) ? (state.actorMemory as GameState["actorMemory"]) : {},
    revealed: isRecord(state.revealed) ? (state.revealed as GameState["revealed"]) : {},
    dead: isRecord(state.dead) ? (state.dead as GameState["dead"]) : {},
    logs: Array.isArray(state.logs) ? state.logs : [],
    decisions: Array.isArray(state.decisions) ? state.decisions : [],
    tags: Array.isArray(state.tags) ? state.tags : [],
    factions: state.factions && isRecord(state.factions) && Object.keys(state.factions).length ? (state.factions as GameState["factions"]) : initialFactions(),
    hand: state.hand && isRecord(state.hand) && Object.keys(state.hand).length ? (state.hand as GameState["hand"]) : initialHand(hat),
    truth: state.truth && isRecord(state.truth) && Object.keys(state.truth).length ? (state.truth as GameState["truth"]) : initialTruth(),
    investigation: state.investigation && isRecord(state.investigation)
      ? {
          stage: (state.investigation as GameState["investigation"]).stage ?? "dormant",
          heat: (state.investigation as GameState["investigation"]).heat ?? 0,
          documents: (state.investigation as GameState["investigation"]).documents ?? [],
          suppressed: (state.investigation as GameState["investigation"]).suppressed ?? [],
        }
      : { stage: "dormant", heat: 0, documents: [], suppressed: [] },
    objectives: Array.isArray(state.objectives) ? state.objectives : [],
    replay: Array.isArray(state.replay) ? state.replay : [],
    replayMeta: state.replayMeta && isRecord(state.replayMeta)
      ? {
          seed: (state.replayMeta as GameState["replayMeta"]).seed ?? worldSeed,
          hat,
          decisions: (state.replayMeta as GameState["replayMeta"]).decisions ?? state.decisions ?? [],
          events: (state.replayMeta as GameState["replayMeta"]).events ?? [],
          factions: (state.replayMeta as GameState["replayMeta"]).factions ?? [],
          major: (state.replayMeta as GameState["replayMeta"]).major ?? [],
        }
      : { seed: worldSeed, hat, decisions: state.decisions ?? [], events: [], factions: [], major: [] },
    actionsLeft: typeof state.actionsLeft === "number" ? state.actionsLeft : apFallback(hat),
    flags: { ...FLAG_DEFAULTS, ...(isRecord(state.flags) ? state.flags : {}) },
    selectedNodeId: state.selectedNodeId ?? "jitem",
    selectedEdgeId: state.selectedEdgeId ?? null,
    pendingAction: state.pendingAction ?? null,
    ending: state.ending ?? null,
    lastResolution: Array.isArray(state.lastResolution) ? state.lastResolution : [],
    recap: Array.isArray(state.recap) ? state.recap : [],
    dossier: state.dossier ?? null,
    worldSeed,
    eventSeed: typeof state.eventSeed === "number" ? state.eventSeed : (worldSeed ^ 0x9e3779b9) >>> 0,
    aiSeed: typeof state.aiSeed === "number" ? state.aiSeed : (worldSeed ^ 0x85ebca6b) >>> 0,
    rngCursor: typeof state.rngCursor === "number" ? state.rngCursor : 0,
    graphMode: state.graphMode === "factions" ? "factions" : "people",
  };
  return next;
}

export function serialize(state: GameState) {
  return {
    version: SAVE_VERSION,
    schemaVersion: SCHEMA_VERSION,
    state,
    replayMeta: state.replayMeta,
  };
}

export function parseSave(raw: string): GameState | null {
  try {
    const parsed = JSON.parse(raw) as { version?: number; schemaVersion?: number; state?: GameState };
    if (!parsed?.state) return null;
    return migrate(parsed.state);
  } catch {
    return null;
  }
}
