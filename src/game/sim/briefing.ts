import { EVENTS, EDGES, NODES } from "../data.ts";
import type { GameState } from "../types.ts";
import { actLabel } from "./acts.ts";
import { STAGE_LABEL } from "./investigation.ts";

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

export function briefingFrom(state: GameState): ReturnBriefing {
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

  let nextProblem = "Duruşu seç, sonra kapasiteni harca.";
  if (state.phase === "actions") nextProblem = "Bu tur kapasite kaldı. Ağ / kişi / gerçek.";
  if (state.phase === "resolution") nextProblem = "Karşı hatlar hareket etti. Sonraki döneme geç.";
  if (state.investigation.stage !== "dormant" && state.investigation.stage !== "rumor") {
    nextProblem = `Soruşturma: ${STAGE_LABEL[state.investigation.stage]}. Yönlendir, sınırla veya yüzeyi aç — durdurmak zorunda değilsin.`;
  }
  if (state.stats.giz < 18) nextProblem = "Gizlilik kritik. Kampanya bitmedi; soruşturma ısınır.";
  if (state.turn >= 9) nextProblem = "Son dönem. 3 Kasım takvimi durmaz.";

  return {
    hat: state.hat,
    turn: state.turn,
    phase: state.phase,
    act: actLabel(state),
    year: ev?.year ?? lastLog?.year ?? "—",
    lastEvent: ev?.title ?? lastLog?.text ?? "Kayıt ince",
    investigation: `${STAGE_LABEL[state.investigation.stage]} · ısı ${state.investigation.heat}`,
    criticalTies: hot.length ? hot : heatedPeople.length ? heatedPeople : ["Henüz ısınan bağ yok"],
    nextProblem,
  };
}
