import type { GameState, InvestigationStage } from "../types.ts";
import { applyStat } from "./stats.ts";
import { mechanicUnlocked } from "./acts.ts";

const ORDER: InvestigationStage[] = [
  "dormant",
  "rumor",
  "inquiry",
  "investigation",
  "evidence",
  "public",
  "response",
];

export const STAGE_LABEL: Record<InvestigationStage, string> = {
  dormant: "uyku",
  rumor: "söylenti",
  inquiry: "ön inceleme",
  investigation: "soruşturma",
  evidence: "delil",
  public: "kamu baskısı",
  response: "kurumsal yanıt",
};

export interface InvestigationView {
  stage: InvestigationStage;
  label: string;
  heat: number;
  why: string;
  raising: string[];
  lowering: string[];
  options: string[];
}

export function investigationView(state: GameState): InvestigationView {
  const stage = state.investigation.stage;
  const raising: string[] = [];
  const lowering: string[] = [];
  if (state.stats.giz < 42) raising.push("inv.r.giz");
  if (state.stats.hukuk >= 22) raising.push("inv.r.hukuk");
  if (state.stats.kamuoyu >= 28) raising.push("inv.r.kamu");
  if (state.flags.investigationOpen) raising.push("inv.r.open");
  if (state.investigation.documents.length) raising.push("inv.r.doc");
  if (state.flags.erseverTalked) raising.push("inv.r.talk");
  if (state.stats.giz >= 50) lowering.push("inv.l.giz");
  if (state.stats.etki >= 48) lowering.push("inv.l.kalkan");
  if (state.investigation.suppressed.length) lowering.push("inv.l.sup");
  if (state.stats.hukuk < 16) lowering.push("inv.l.cold");
  if (state.stats.bilgi < 18) lowering.push("inv.l.weak");
  if (Object.values(state.hand).some((h) => h.status === "PARTIAL" || h.status === "FALSE")) lowering.push("inv.l.clash");

  const options: string[] = [];
  if (mechanicUnlocked(state, "investigation") && stage !== "dormant") {
    options.push("inv.optDirect", "inv.optLimit", "inv.optOpen", "inv.optCut");
  } else if (stage === "dormant") {
    options.push("inv.optSleep");
  }

  return {
    stage,
    label: `inv.${stage}`,
    heat: state.investigation.heat,
    why: `inv.why.${stage}`,
    raising,
    lowering,
    options,
  };
}

function bump(stage: InvestigationStage, steps = 1): InvestigationStage {
  const i = Math.min(ORDER.length - 1, ORDER.indexOf(stage) + steps);
  return ORDER[i];
}

export function tickInvestigation(state: GameState, notes: string[]): GameState {
  let next = state;
  let stage = next.investigation.stage;
  let heat = next.investigation.heat;

  if (stage === "dormant" && (next.stats.giz < 42 || next.stats.kamuoyu >= 28 || next.flags.investigationOpen)) {
    stage = "rumor";
    heat += 8;
    notes.push("note.inv.rumor");
  } else if (stage === "rumor" && next.stats.hukuk >= 22) {
    stage = "inquiry";
    heat += 6;
    notes.push("note.inv.inquiry");
  } else if (stage === "inquiry" && (next.stats.hukuk >= 40 || next.flags.investigationOpen)) {
    stage = "investigation";
    heat += 8;
    notes.push("note.inv.investigation");
  } else if (stage === "investigation" && next.stats.bilgi >= 48 && next.investigation.documents.length >= 1) {
    stage = "evidence";
    heat += 10;
    notes.push("note.inv.evidence");
  } else if (stage === "evidence" && next.stats.kamuoyu >= 48) {
    stage = "public";
    heat += 12;
    notes.push("note.inv.public");
  } else if ((stage === "public" || stage === "evidence") && (next.turn >= 10 || next.stats.hukuk >= 70)) {
    stage = "response";
    heat += 8;
    notes.push("note.inv.response");
  }

  const suppressing = next.tags.includes("inv-suppress");
  const limiting = next.tags.includes("inv-limit");
  const directing = next.tags.includes("inv-direct");
  const exposing = next.tags.includes("inv-expose");

  if (suppressing && ORDER.indexOf(stage) >= 2 && ORDER.indexOf(stage) < 5) {
    notes.push("note.inv.suppress");
    heat = Math.max(0, heat - 6);
  } else if (limiting && stage !== "dormant") {
    notes.push("note.inv.limit");
    heat = Math.max(0, heat - 4);
  } else if (directing && stage !== "dormant") {
    stage = bump(stage);
    notes.push("note.inv.direct");
  } else if (exposing && ORDER.indexOf(stage) < 5) {
    stage = "public";
    notes.push("note.inv.expose");
  }

  const tags = next.tags.filter(
    (t) => t !== "inv-suppress" && t !== "inv-direct" && t !== "inv-expose" && t !== "inv-limit",
  );

  next = {
    ...next,
    tags,
    investigation: { ...next.investigation, stage, heat },
    flags: { ...next.flags, investigationOpen: stage !== "dormant" && stage !== "rumor" },
  };

  if (stage === "inquiry" || stage === "investigation") next = applyStat(next, "hukuk", 2);
  if (stage === "public" || stage === "response") {
    next = applyStat(next, "kamuoyu", 3);
    next = applyStat(next, "giz", -3);
  }
  return next;
}

export function addDocument(state: GameState, id: string, suppressed = false): GameState {
  const documents = suppressed ? state.investigation.documents : Array.from(new Set([...state.investigation.documents, id]));
  const suppressedList = suppressed
    ? Array.from(new Set([...state.investigation.suppressed, id]))
    : state.investigation.suppressed;
  return { ...state, investigation: { ...state.investigation, documents, suppressed: suppressedList } };
}

export function recordComparison(state: GameState, claimId: string, sourceIds: string[]): GameState {
  const comparisons = [...(state.investigation.comparisons ?? [])];
  if (comparisons.some((c) => c.claimId === claimId)) return state;
  comparisons.push({ claimId, sourceIds, turn: state.turn });
  const tags = state.tags.includes("src-compared") ? state.tags : [...state.tags, "src-compared"];
  return { ...state, tags, investigation: { ...state.investigation, comparisons, heat: state.investigation.heat + 2 } };
}

export function recordChainLink(state: GameState, claimId: string, documentId: string): GameState {
  let next = addDocument(state, documentId, false);
  const chain = [...(next.investigation.chain ?? [])];
  if (!chain.some((c) => c.documentId === documentId)) {
    chain.push({ claimId, documentId, turn: next.turn });
  }
  const tags = next.tags.includes("chain-link") ? next.tags : [...next.tags, "chain-link"];
  return { ...next, tags, investigation: { ...next.investigation, chain } };
}
