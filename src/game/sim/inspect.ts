import { EDGES, NODES } from "../data.ts";
import type { GameState, Locale } from "../types.ts";
import { dangerousActors, edgeForecast, edgeSignal } from "./edges.ts";
import { t } from "../i18n/copy.ts";

/**
 * MAP SUMMARY tier only: what this is and why it might matter at a glance.
 * Knowledge state, memory/causal history, sourcing and available actions are
 * deliberately left out here -- they already have a dedicated, structured
 * ACTIONABLE/DETAIL view (SidePanel's PersonPane dl + its "Kanıt katmanları"
 * detail drawer), which selecting a node or edge on the map now opens
 * automatically. Cramming everything into this one line was the flat
 * "dashboard" string the map's bottom bar used to show for every selection.
 */
export function nodeWhy(state: GameState, id: string, locale: Locale = "tr"): string {
  const n = NODES.find((x) => x.id === id);
  if (!n) return t(locale, "map.missingNode");
  const heat = state.nodeHeat[id] ?? 0;
  const ties = EDGES.filter((e) => e.from === id || e.to === id).length;
  const danger = dangerousActors(state).includes(id) ? t(locale, "map.danger") : "";
  return t(locale, "map.inspectNode", {
    name: n.name,
    evidence: t(locale, `evidence.${n.evidence}.label`),
    ties,
    heat,
    danger,
  });
}

export function edgeWhy(state: GameState, id: string, locale: Locale = "tr"): string {
  const e = EDGES.find((x) => x.id === id);
  if (!e) return t(locale, "map.missingEdge");
  const live = state.edgeLive[id];
  const signal = live ? t(locale, `map.signal.${edgeSignal(live)}`) : t(locale, "map.noLive");
  const forecast = edgeForecast(state, id, locale);
  return t(locale, "map.inspectEdge", {
    label: e.label,
    evidence: t(locale, `evidence.${e.evidence}.label`),
    signal,
    forecast,
  });
}
