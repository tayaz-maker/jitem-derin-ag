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
import type { ActionId, Faction, GameState, Hat, MobilePane } from "./types.ts";
import { LEGACY_SAVE_KEY, SAVE_KEY } from "./types.ts";

interface Store {
  hydrated: boolean;
  state: GameState | null;
  screen: "start" | "play" | "dosya";
  explainStat: string | null;
  mobilePane: MobilePane;
  hydrate: () => void;
  start: (hat: Hat, seed?: number) => void;
  load: () => boolean;
  clearSave: () => void;
  persist: () => void;
  setScreen: (s: "start" | "play" | "dosya") => void;
  setExplainStat: (k: string | null) => void;
  setMobilePane: (p: MobilePane) => void;
  setGraphMode: (m: "people" | "factions") => void;
  closeEvent: () => void;
  chooseEvent: (choiceId: string) => void;
  pickNode: (id: string | null) => void;
  pickEdge: (id: string | null) => void;
  armAction: (id: ActionId | null) => void;
  play: (opts?: { id?: ActionId; edgeId?: string; nodeId?: string; faction?: Faction }) => void;
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
    const raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(SAVE_KEY + ":bak") ?? localStorage.getItem(LEGACY_SAVE_KEY);
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

const EDGE_ACTIONS: ActionId[] = ["bag_guclendir", "bag_gevset", "bag_gozet", "bag_yalitim", "bag_ifsa", "bag_arabul", "bag_koru"];
const NODE_ACTIONS: ActionId[] = ["kisi_koru", "kisi_kullan", "kisi_harca", "kisi_mesafe"];

export const useGame = create<Store>((set, get) => ({
  hydrated: false,
  state: null,
  screen: "start",
  explainStat: null,
  mobilePane: "map",

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
    set({ state, screen: "play", explainStat: null, mobilePane: "olay" });
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
    set({ state: null, screen: "start", mobilePane: "map" });
  },

  setScreen: (screen) => set({ screen }),
  setExplainStat: (explainStat) => set({ explainStat }),
  setMobilePane: (mobilePane) => set({ mobilePane }),
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
      const state = executeAction({ ...s, selectedNodeId: id }, { id: s.pendingAction, nodeId: id });
      writeSave(state);
      set({ state });
      return;
    }
    set({
      state: {
        ...s,
        selectedNodeId: id,
        selectedEdgeId: EDGE_ACTIONS.includes(s.pendingAction as ActionId) ? s.selectedEdgeId : null,
      },
      mobilePane: get().mobilePane === "map" ? "kisi" : get().mobilePane,
    });
  },

  pickEdge: (id) => {
    const s = get().state;
    if (!s) return;
    if (s.pendingAction && EDGE_ACTIONS.includes(s.pendingAction) && id) {
      const state = executeAction({ ...s, selectedEdgeId: id }, { id: s.pendingAction, edgeId: id });
      writeSave(state);
      set({ state });
      return;
    }
    set({ state: { ...s, selectedEdgeId: id } });
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
    const state = executeAction(
      { ...s, pendingAction: id },
      {
        id,
        edgeId: opts?.edgeId ?? s.selectedEdgeId ?? undefined,
        nodeId: opts?.nodeId ?? s.selectedNodeId ?? undefined,
        faction: opts?.faction,
      },
    );
    writeSave(state);
    set({ state });
  },

  resolve: () => {
    const s = get().state;
    if (!s || s.phase !== "actions") return;
    const state = resolveTurn(s);
    writeSave(state);
    set({ state, mobilePane: "rapor" });
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
