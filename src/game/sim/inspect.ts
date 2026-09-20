import { EDGES, NODES } from "../data.ts";
import type { GameState } from "../types.ts";
import { mechanicUnlocked } from "./acts.ts";
import { liveLine } from "./edges.ts";
import { memoryLine } from "./memory.ts";
import { playerViewOf } from "./knowledge.ts";

export function nodeWhy(state: GameState, id: string): string {
  const n = NODES.find((x) => x.id === id);
  if (!n) return "Bu düğüm yok.";
  const heat = state.nodeHeat[id] ?? 0;
  const mem = memoryLine(state, id);
  const know = playerViewOf(state, id);
  const ties = EDGES.filter((e) => e.from === id || e.to === id).length;
  const personOpen = n.kind === "kisi" && mechanicUnlocked(state, "person");
  const act = personOpen
    ? "dokun: koru / kullan / harca / mesafe"
    : n.kind === "kurum"
      ? "dokun: kurum dosyası · bağlar haritada"
      : "dokun: koridor dosyası";
  return `${n.name} · ${n.evidence} · ${know} · bellek: ${mem} · ${ties} bağ · ısı ${heat} · ${act}`;
}

export function edgeWhy(state: GameState, id: string): string {
  const e = EDGES.find((x) => x.id === id);
  if (!e) return "Bu bağ yok.";
  const live = state.edgeLive[id];
  const liveTxt = live ? liveLine(live) : "ölçüm yok";
  return `${e.label} · ${e.evidence} · ${liveTxt} · dokun: sıkılaştır / gevşet / gözet / koru`;
}
