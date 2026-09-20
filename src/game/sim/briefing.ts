import { EVENTS, EDGES, NODES } from "../data.ts";
import type { GameState, Locale } from "../types.ts";
import { actLabel } from "./acts.ts";
import { eventCopy, t } from "../i18n/copy.ts";

export interface ReturnBriefing {
  hat: GameState["hat"];
  turn: number;
  phase: GameState["phase"];
  act: string;
  year: string;
  lastEvent: string;
  investigation: string;
  criticalTies: string[];
  nextProblem: string;
}

export function briefingFrom(state: GameState, locale: Locale = "tr"): ReturnBriefing {
  const ev = EVENTS.find((e) => e.turn === state.turn);
  const lastLog = [...state.logs].reverse().find((l) => l.kind === "olay" || l.kind === "npc");
  const hot = Object.entries(state.edgeLive)
    .filter(([, e]) => e.tension >= 55 || e.secrecy <= 28)
    .slice(0, 3)
    .map(([id]) => EDGES.find((e) => e.id === id)?.label ?? id);
  const heatedPeople = Object.entries(state.nodeHeat)
    .filter(([, h]) => h > 0)
    .slice(0, 2)
    .map(([id]) => NODES.find((n) => n.id === id)?.name ?? id);

  let nextProblem = t(locale, "brief.nextEvent");
  if (state.phase === "actions") nextProblem = t(locale, "brief.nextAct");
  if (state.phase === "resolution") nextProblem = t(locale, "brief.nextRes");
  if (state.investigation.stage !== "dormant" && state.investigation.stage !== "rumor") {
    nextProblem = t(locale, "brief.nextInv");
  }
  if (state.stats.giz < 18) nextProblem = t(locale, "brief.nextGiz");
  if (state.turn >= 9) nextProblem = t(locale, "brief.nextLate");

  return {
    hat: state.hat,
    turn: state.turn,
    phase: state.phase,
    act: actLabel(state, locale),
    year: ev?.year ?? lastLog?.year ?? "—",
    lastEvent: (ev ? eventCopy(locale, ev.id)?.title : null) ?? ev?.title ?? lastLog?.text ?? "—",
    investigation: `${t(locale, `inv.${state.investigation.stage}`)} · ${t(locale, "inv.heat")} ${state.investigation.heat}`,
    criticalTies: hot.length ? hot : heatedPeople.length ? heatedPeople : [t(locale, "brief.noTie")],
    nextProblem,
  };
}