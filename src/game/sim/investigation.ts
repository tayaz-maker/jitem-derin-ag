import type { GameState, InvestigationStage } from "../types.ts";
import { applyStat } from "./stats.ts";

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
    notes.push("Soruşturma yüzeyi: söylenti. Henüz dosya değil.");
  } else if (stage === "rumor" && next.stats.hukuk >= 22) {
    stage = "inquiry";
    heat += 6;
    notes.push("Ön inceleme açıldı. Emir üretmez; iz bırakır.");
  } else if (stage === "inquiry" && (next.stats.hukuk >= 40 || next.flags.investigationOpen)) {
    stage = "investigation";
    heat += 8;
    notes.push("Soruşturma. Yönlendirebilirsin; tamamen durdurmak zorunda değilsin.");
  } else if (stage === "investigation" && next.stats.bilgi >= 48 && next.investigation.documents.length >= 1) {
    stage = "evidence";
    heat += 10;
    notes.push("Delil eşiği. Bastırılanlar karanlıkta, açılanlar kamuoyuna yürür.");
  } else if (stage === "evidence" && next.stats.kamuoyu >= 48) {
    stage = "public";
    heat += 12;
    notes.push("Kamu baskısı. Meclis ve basın aynı kareye bakmaya başladı.");
  } else if ((stage === "public" || stage === "evidence") && (next.turn >= 10 || next.stats.hukuk >= 70)) {
    stage = "response";
    heat += 8;
    notes.push("Kurumsal yanıt: inkâr, parçalı kabul, tasfiye — hepsi birden olabilir.");
  }

  const suppressing = next.tags.includes("inv-suppress");
  const limiting = next.tags.includes("inv-limit");
  const directing = next.tags.includes("inv-direct");
  const exposing = next.tags.includes("inv-expose");

  if (suppressing && ORDER.indexOf(stage) >= 2 && ORDER.indexOf(stage) < 5) {
    notes.push("Bastırma: soruşturma ilerlemedi. Sönmedi.");
    heat = Math.max(0, heat - 6);
  } else if (limiting && stage !== "dormant") {
    notes.push("Sınırlama: soruşturma dar tutuldu. Sönmedi.");
    heat = Math.max(0, heat - 4);
  } else if (directing && stage !== "dormant") {
    stage = bump(stage);
    notes.push("Yönlendirme: soruşturma senin dosyana kaydı. Kontrol değil, sapma.");
  } else if (exposing && ORDER.indexOf(stage) < 5) {
    stage = "public";
    notes.push("Açığa çıkarma: kamu öne çekildi.");
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
