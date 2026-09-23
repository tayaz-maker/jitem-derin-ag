import { create } from "zustand";
import {
  advanceTurn,
  applyEventChoice,
  createGame,
  executeAction,
  resolveTurn,
  startActions,
} from "./engine.ts";
import { parseSave, serialize } from "./sim/save.ts";
import type { ActionId, GameState, Hat, MobilePane, PlannedAction } from "./types.ts";
import { LEGACY_SAVE_KEY, SAVE_KEY } from "./types.ts";
import type { InteractiveCopy } from "./i18n/types.ts";
import { resultForAction } from "./i18n/interactive.ts";
import { useLocale } from "./i18n/locale.ts";
import { diffState, moveInput, type Change } from "./sim/preview.ts";
import type { PlanMethod } from "./sim/planning.ts";

/** The move the player is preparing. UI-only: never written to the save. */
export interface MoveDraft {
  id: ActionId;
  targetKind: "node" | "edge";
  targetId: string;
  method: PlanMethod;
}
/** What the last committed move actually changed, for the result card. */
export interface MoveResult {
  id: ActionId;
  targetId: string | null;
  turn: number;
  changes: Change[];
}

interface Store {
  hydrated: boolean;
  state: GameState | null;
  screen: "start" | "play" | "dosya";
  explainStat: string | null;
  mobilePane: MobilePane;
  feedback: InteractiveCopy | null;
  claimId: string | null;
  move: MoveDraft | null;
  lastResult: MoveResult | null;
  setMove: (m: MoveDraft | null) => void;
  hydrate: () => void;
  start: (hat: Hat, seed?: number) => void;
  load: () => boolean;
  clearSave: () => void;
  persist: () => void;
  setScreen: (s: "start" | "play" | "dosya") => void;
  setExplainStat: (k: string | null) => void;
  setMobilePane: (p: MobilePane) => void;
  setGraphMode: (m: "people" | "factions") => void;
  setClaimId: (id: string | null) => void;
  closeEvent: () => void;
  chooseEvent: (choiceId: string) => void;
  pickNode: (id: string | null) => void;
  pickEdge: (id: string | null) => void;
  armAction: (id: ActionId | null) => void;
  play: (opts?: Partial<PlannedAction>) => void;
  resolve: () => void;
  nextTurn: () => void;
}

function writeSave(state: GameState) {
  try {
    const payload = JSON.stringify(serialize(state));
    localStorage.setItem(SAVE_KEY, payload);
    localStorage.setItem(SAVE_KEY + ":bak", payload);
  } catch {
    /* private mode */
  }
}

function readSave(): GameState | null {
  try {
    const raw =
      localStorage.getItem(SAVE_KEY) ??
      localStorage.getItem(SAVE_KEY + ":bak") ??
      localStorage.getItem(LEGACY_SAVE_KEY);
    if (!raw) return null;
    return parseSave(raw);
  } catch {
    try {
      const bak = localStorage.getItem(SAVE_KEY + ":bak");
      return bak ? parseSave(bak) : null;
    } catch {
      return null;
    }
  }
}

const EDGE_ACTIONS: ActionId[] = [
  "bag_guclendir",
  "bag_gevset",
  "bag_gozet",
  "bag_yalitim",
  "bag_ifsa",
  "bag_arabul",
  "bag_koru",
];
const NODE_ACTIONS: ActionId[] = ["kisi_koru", "kisi_kullan", "kisi_harca", "kisi_mesafe"];

export const useGame = create<Store>((set, get) => ({
  hydrated: false,
  state: null,
  screen: "start",
  explainStat: null,
  mobilePane: "map",
  feedback: null,
  claimId: null,
  move: null,
  lastResult: null,

  setMove: (move) => set({ move }),

  hydrate: () => {
    if (get().hydrated) return;
    set({ hydrated: true, state: readSave(), screen: "start" });
  },

  persist: () => {
    const s = get().state;
    if (s) writeSave(s);
  },

  start: (hat, seed) => {
    const state = createGame(hat, seed);
    writeSave(state);
    set({
      state,
      screen: "play",
      explainStat: null,
      mobilePane: "olay",
      feedback: null,
      claimId: null,
      move: null,
      lastResult: null,
    });
  },

  load: () => {
    const saved = readSave();
    if (!saved) return false;
    set({ state: saved, screen: "play", mobilePane: saved.phase === "event" ? "olay" : "map" });
    return true;
  },

  clearSave: () => {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(SAVE_KEY + ":bak");
      localStorage.removeItem(LEGACY_SAVE_KEY);
    } catch {
      /* */
    }
    set({
      state: null,
      screen: "start",
      mobilePane: "map",
      feedback: null,
      claimId: null,
      move: null,
      lastResult: null,
    });
  },

  setScreen: (screen) => set({ screen }),
  setExplainStat: (explainStat) => set({ explainStat }),
  setMobilePane: (mobilePane) => set({ mobilePane }),
  setClaimId: (claimId) => set({ claimId }),
  setGraphMode: (m) => {
    const s = get().state;
    if (!s) return;
    set({ state: { ...s, graphMode: m } });
  },

  closeEvent: () => {
    const s = get().state;
    if (!s || s.phase !== "event") return;
    const state = startActions(s);
    writeSave(state);
    set({ state, mobilePane: "isler" });
  },

  chooseEvent: (choiceId) => {
    const s = get().state;
    if (!s || s.phase !== "event") return;
    const state = applyEventChoice(s, choiceId);
    writeSave(state);
    set({ state, mobilePane: "isler" });
  },

  pickNode: (id) => {
    const s = get().state;
    if (!s) return;
    if (s.pendingAction && NODE_ACTIONS.includes(s.pendingAction) && id) {
      const state = executeAction(
        { ...s, selectedNodeId: id },
        { id: s.pendingAction, nodeId: id },
      );
      const locale = useLocale.getState().locale;
      writeSave(state);
      set({ state, feedback: resultForAction(s.pendingAction, locale, state, id) });
      return;
    }
    set({
      state: {
        ...s,
        selectedNodeId: id,
        selectedEdgeId: EDGE_ACTIONS.includes(s.pendingAction as ActionId)
          ? s.selectedEdgeId
          : null,
      },
      mobilePane: get().mobilePane === "map" ? "kisi" : get().mobilePane,
    });
  },

  pickEdge: (id) => {
    const s = get().state;
    if (!s) return;
    if (s.pendingAction && EDGE_ACTIONS.includes(s.pendingAction) && id) {
      const state = executeAction(
        { ...s, selectedEdgeId: id },
        { id: s.pendingAction, edgeId: id },
      );
      const locale = useLocale.getState().locale;
      writeSave(state);
      set({ state, feedback: resultForAction(s.pendingAction, locale, state, id) });
      return;
    }
    set({
      state: { ...s, selectedEdgeId: id },
      mobilePane: get().mobilePane === "map" ? "kisi" : get().mobilePane,
    });
  },

  armAction: (id) => {
    const s = get().state;
    if (!s) return;
    set({ state: { ...s, pendingAction: id } });
  },

  play: (opts) => {
    const s = get().state;
    if (!s) return;
    const id = opts?.id ?? s.pendingAction;
    if (!id) return;
    // A plan that names its own target keeps exactly that target: filling the
    // other slot from the map selection would make the committed move differ
    // from the one previewed on the desk.
    const named = Boolean(opts?.edgeId || opts?.nodeId);
    const plan: PlannedAction = {
      id,
      edgeId: named ? opts?.edgeId : (s.selectedEdgeId ?? undefined),
      nodeId: named ? opts?.nodeId : (s.selectedNodeId ?? undefined),
      faction: opts?.faction,
      claimId: opts?.claimId,
      method: opts?.method,
      contextual: opts?.contextual,
    };
    // Same input the preview used, so the result card shows what was shown.
    const state = executeAction(moveInput(s, plan), plan);
    const locale = useLocale.getState().locale;
    const targetId =
      opts?.nodeId ?? opts?.edgeId ?? s.selectedNodeId ?? s.selectedEdgeId ?? undefined;
    const feedback = resultForAction(id, locale, state, targetId);
    writeSave(state);
    set({
      state,
      feedback,
      move: null,
      lastResult:
        state === s
          ? null
          : { id, targetId: targetId ?? null, turn: s.turn, changes: diffState(s, state) },
    });
  },

  resolve: () => {
    const s = get().state;
    if (!s || s.phase !== "actions") return;
    const state = resolveTurn(s);
    writeSave(state);
    set({ state, mobilePane: "rapor", feedback: null, move: null, lastResult: null });
  },

  nextTurn: () => {
    const s = get().state;
    if (!s || s.phase !== "resolution") return;
    const state = advanceTurn(s);
    writeSave(state);
    set({ state, mobilePane: state.phase === "event" ? "olay" : "map" });
  },
}));

export { EDGE_ACTIONS, NODE_ACTIONS };
export { migrate } from "./sim/save.ts";
