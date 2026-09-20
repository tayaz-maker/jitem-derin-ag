import { EDGES, NODES } from "../data.ts";
import type { GameState, Locale } from "../types.ts";
import { mechanicUnlocked } from "./acts.ts";
import { liveLine } from "./edges.ts";
import { memoryLine } from "./memory.ts";
import { playerViewOf } from "./knowledge.ts";
import { t } from "../i18n/copy.ts";

export function nodeWhy(state: GameState, id: string, locale: Locale = "tr"): string {
  const n = NODES.find((x) => x.id === id);
  if (!n) return t(locale, "map.missingNode");
  const heat = state.nodeHeat[id] ?? 0;
  const mem = memoryLine(state, id, locale);
  const know = playerViewOf(state, id, locale);
  const ties = EDGES.filter((e) => e.from === id || e.to === id).length;
  const personOpen = n.kind === "kisi" && mechanicUnlocked(state, "person");
  const act = personOpen
    ? t(locale, "map.actPerson")
    : n.kind === "kurum"
      ? t(locale, "map.actOrg")
      : t(locale, "map.actCorridor");
  return t(locale, "map.inspectNode", {
    name: n.name,
    evidence: t(locale, `evidence.${n.evidence}.label`),
    know,
    mem,
    ties,
    heat,
    act,
  });
}

export function edgeWhy(state: GameState, id: string, locale: Locale = "tr"): string {
  const e = EDGES.find((x) => x.id === id);
  if (!e) return t(locale, "map.missingEdge");
  const live = state.edgeLive[id];
  const liveTxt = live ? liveLine(live, locale) : t(locale, "map.noLive");
  return t(locale, "map.inspectEdge", {
    label: e.label,
    evidence: t(locale, `evidence.${e.evidence}.label`),
    live: liveTxt,
    act: t(locale, "map.actEdge"),
  });
}
