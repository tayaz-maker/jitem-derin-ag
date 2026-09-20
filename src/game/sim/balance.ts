import { ACTIONS, EDGES, NODES } from "../data.ts";
import {
  advanceTurn,
  applyEventChoice,
  canPlay,
  createGame,
  eventViewFor,
  executeAction,
  isEdgeVisible,
  isNodeVisible,
  resolveTurn,
} from "../engine.ts";
import type { ActionId, GameState, Hat, PlannedAction } from "../types.ts";

export type PlayStyle =
  | "saha-agresif"
  | "saha-gizlilik"
  | "saha-bilgi"
  | "idari-koruma"
  | "idari-ifsa"
  | "karma";

const STYLE_HAT: Record<PlayStyle, Hat> = {
  "saha-agresif": "saha",
  "saha-gizlilik": "saha",
  "saha-bilgi": "saha",
  "idari-koruma": "idari",
  "idari-ifsa": "idari",
  karma: "saha",
};

function preferredActions(style: PlayStyle): ActionId[] {
  if (style === "saha-agresif") return ["tim_kur", "saha_op", "kisi_kullan", "kisi_harca", "kara_topla", "itirafci_al", "bag_guclendir"];
  if (style === "saha-gizlilik") return ["inkar_yaz", "sizinti_bastir", "kisi_koru", "bag_yalitim", "bag_gevset", "medya_kes", "ankara_koru"];
  if (style === "saha-bilgi") return ["rapor_yaz", "dosya_oku", "bag_gozet", "kisi_harca", "bag_ifsa", "soru_ac"];
  if (style === "idari-koruma") return ["inkar_yaz", "ankara_koru", "dosya_oku", "bag_koru", "kisi_koru", "sizinti_bastir", "soru_sinir"];
  if (style === "idari-ifsa") return ["rapor_yaz", "dosya_oku", "bag_ifsa", "soru_ac", "kisi_harca", "bag_gozet"];
  return ["tim_kur", "bag_guclendir", "kisi_koru", "kara_topla", "rapor_yaz", "inkar_yaz", "dosya_oku"];
}

function pickChoice(state: GameState, style: PlayStyle) {
  const view = eventViewFor(state);
  const choices = view?.choices ?? [];
  if (!choices.length) return "";
  if (style === "saha-gizlilik" || style === "idari-koruma") {
    return choices.find((c) => c.id.includes("bas") || c.id.includes("inkar") || c.id.includes("resmi") || c.id.includes("mesafe"))?.id ?? choices[0].id;
  }
  if (style === "idari-ifsa" || style === "saha-bilgi") {
    return choices.find((c) => c.id.includes("not") || c.id.includes("oku") || c.id.includes("dosya"))?.id ?? choices[choices.length - 1].id;
  }
  if (style === "saha-agresif") return choices[0].id;
  return choices[Math.min(1, choices.length - 1)].id;
}

function planFor(state: GameState, style: PlayStyle): PlannedAction | null {
  const prefs = preferredActions(style);
  const visibleEdge = EDGES.find((e) => isEdgeVisible(state, e.id));
  const visibleNode = NODES.find((n) => n.kind === "kisi" && isNodeVisible(state, n.id) && !state.dead[n.id]);
  for (const id of prefs) {
    if (!canPlay(state, id)) continue;
    const def = ACTIONS.find((a) => a.id === id);
    if (!def) continue;
    if (def.needs === "edge" && visibleEdge) return { id, edgeId: visibleEdge.id };
    if (def.needs === "node" && visibleNode) return { id, nodeId: visibleNode.id };
    if (def.needs === "faction") return { id, faction: state.turn >= 8 ? "emniyet" : "mit" };
    if (def.needs === "none") return { id };
  }
  for (const a of ACTIONS) {
    if (!canPlay(state, a.id)) continue;
    if (a.needs === "none") return { id: a.id };
    if (a.needs === "edge" && visibleEdge) return { id: a.id, edgeId: visibleEdge.id };
    if (a.needs === "node" && visibleNode) return { id: a.id, nodeId: visibleNode.id };
  }
  return null;
}

export function autoCampaign(style: PlayStyle, seed: number): GameState {
  let s = createGame(STYLE_HAT[style], seed);
  let guard = 0;
  while (s.phase !== "ended" && guard < 40) {
    guard += 1;
    if (s.phase === "event") {
      s = applyEventChoice(s, pickChoice(s, style));
      continue;
    }
    if (s.phase === "actions") {
      let steps = 0;
      while (s.phase === "actions" && s.actionsLeft > 0 && steps < 8) {
        const plan = planFor(s, style);
        if (!plan) break;
        const before = s.actionsLeft;
        s = executeAction(s, plan);
        if (s.actionsLeft === before) break;
        steps += 1;
      }
      if (s.phase === "actions") s = resolveTurn(s);
      continue;
    }
    if (s.phase === "resolution") {
      s = advanceTurn(s);
    }
  }
  return s;
}

export interface BalanceReport {
  runs: number;
  endings: Record<string, number>;
  byStyle: Record<string, Record<string, number>>;
  avgGiz: number;
  avgSaha: number;
  avgKara: number;
  avgHukuk: number;
  avgActionsPerTurn: number;
  softlocks: number;
  sameEnding: boolean;
  runawayGiz: number;
  infiniteKara: number;
  notes: string[];
}

export const BALANCE_STYLES: PlayStyle[] = [
  "saha-agresif",
  "saha-gizlilik",
  "saha-bilgi",
  "idari-koruma",
  "idari-ifsa",
  "karma",
];

export function runBalance(seeds = 50): BalanceReport {
  const endings: Record<string, number> = {};
  const byStyle: Record<string, Record<string, number>> = {};
  let giz = 0;
  let saha = 0;
  let kara = 0;
  let hukuk = 0;
  let acts = 0;
  let softlocks = 0;
  let runawayGiz = 0;
  let infiniteKara = 0;
  const notes: string[] = [];
  let n = 0;
  for (let i = 0; i < seeds; i++) {
    const style = BALANCE_STYLES[i % BALANCE_STYLES.length];
    const seed = 1000 + i * 7919;
    const s = autoCampaign(style, seed);
    n += 1;
    const end = s.ending ?? "none";
    endings[end] = (endings[end] ?? 0) + 1;
    byStyle[style] ??= {};
    byStyle[style][end] = (byStyle[style][end] ?? 0) + 1;
    giz += s.stats.giz;
    saha += s.stats.saha;
    kara += s.stats.kara;
    hukuk += s.stats.hukuk;
    acts += s.decisions.filter((d) => d.kind === "action" || d.kind === "stance").length;
    if (s.phase !== "ended") softlocks += 1;
    if (s.stats.giz <= 0 && s.turn < 6) runawayGiz += 1;
    if (s.stats.kara >= 95) infiniteKara += 1;
  }
  const distinct = Object.keys(endings).length;
  if (distinct === 1) notes.push("Tek ending: çeşit yok.");
  if (softlocks) notes.push(`Softlock ${softlocks}.`);
  if (runawayGiz) notes.push(`Erken giz çöküşü ${runawayGiz}.`);
  if (infiniteKara) notes.push(`Kara tavan ${infiniteKara}.`);
  if (giz / n > 90) notes.push("Giz çok yüksek — inkâr bedelsiz kalabilir.");
  const gizCoktu = endings.giz_coktu ?? 0;
  if (gizCoktu > seeds * 0.55) notes.push(`giz_coktu dominant (${gizCoktu}/${seeds}).`);
  return {
    runs: n,
    endings,
    byStyle,
    avgGiz: Math.round(giz / n),
    avgSaha: Math.round(saha / n),
    avgKara: Math.round(kara / n),
    avgHukuk: Math.round(hukuk / n),
    avgActionsPerTurn: Math.round((acts / n) * 10) / 10,
    softlocks,
    sameEnding: distinct === 1,
    runawayGiz,
    infiniteKara,
    notes,
  };
}
