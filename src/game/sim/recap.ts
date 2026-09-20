import { ALL_CLAIMS } from "../db/catalog.ts";
import { EDGES, NODES } from "../data.ts";
import { SAVE_KEY, SCHEMA_VERSION } from "../types.ts";
import type { Decision, Dossier, EndingId, GameState } from "../types.ts";
import { STAGE_LABEL } from "./investigation.ts";

export function pushDecision(state: GameState, d: Omit<Decision, "turn">): GameState {
  return {
    ...state,
    decisions: [...state.decisions, { ...d, turn: state.turn }],
  };
}

function names(ids: string[]) {
  return ids.map((id) => NODES.find((n) => n.id === id)?.name ?? id);
}

export function buildDossier(state: GameState): Dossier {
  const protectedActors = names(Object.entries(state.stance).filter(([, v]) => v === "protect").map(([id]) => id));
  const sacrificedActors = names(Object.entries(state.stance).filter(([, v]) => v === "spend").map(([id]) => id));
  const exposedDocuments = state.investigation.documents;
  const suppressedDocuments = state.investigation.suppressed;
  const risenFactions = Object.values(state.factions)
    .filter((f) => f.hostility >= 28 || f.resources >= 48)
    .map((f) => f.id);
  const brokenTies = Object.entries(state.edgeLive)
    .filter(([, e]) => e.trust < 20 || e.tension > 70)
    .map(([id]) => EDGES.find((e) => e.id === id)?.label ?? id);
  const publicKnowledge = Object.entries(state.factions.media?.knowledgeBase ?? {})
    .filter(([, k]) => k.status === "TRUE" || k.status === "PARTIAL")
    .map(([id]) => ALL_CLAIMS.find((c) => c.id === id)?.title ?? id);
  const contradictions = ALL_CLAIMS.filter((c) => c.contradiction).map((c) => `${c.title}: ${c.contradiction}`);
  const anchorDrift: string[] = [];
  if (state.flags.leakSuppressed) anchorDrift.push("Ersever kaseti bastırıldı; yok edilmedi.");
  if (hasSpend(state) && state.flags.erseverTalked) anchorDrift.push("Harcanan saha hattı konuşmayı sertleştirdi.");
  if (state.flags.emniyetCooledUntil > 0) anchorDrift.push("Emniyet soğutuldu; 3 Kasım durmadı, ısınma yavaşladı.");
  if (state.investigation.stage === "dormant") anchorDrift.push("Soruşturma uyudu. Kamu karesi kaza ile açıldı.");
  if (state.flags.yesilUsed) anchorDrift.push("Yeşil harcandı. Fail iddiası ısındı; emir boşluğu durur.");
  const orderLeft =
    state.stats.giz >= 28 && state.stats.saha >= 18
      ? "Fiilî ağ ince, resmi dil hâlâ ‘yok’. Kontrollü parçalanma mümkün."
      : state.stats.hukuk >= 50
        ? "Hukuk ve kamu önde. Bazı bağlar kilitli, emirler boşlukta."
        : "Düzen dağınık. Parçalı çıkar ağları kendi bildikleriyle yürüdü.";

  return {
    title: "SENİN 1986–1996 HİKÂYEN",
    protectedActors,
    sacrificedActors,
    exposedDocuments,
    suppressedDocuments,
    risenFactions,
    brokenTies,
    publicKnowledge,
    contradictions: contradictions.slice(0, 8),
    anchorDrift,
    orderLeft,
  };
}

function hasSpend(state: GameState) {
  return Object.values(state.actorMemory).some((t) => t.includes("spent"));
}

export function buildRecap(state: GameState): string[] {
  const d = state.dossier ?? buildDossier(state);
  const lines: string[] = [d.title];
  lines.push(d.protectedActors.length ? `Korudukların: ${d.protectedActors.join(", ")}.` : "Kimseyi özellikle korumadın.");
  lines.push(d.sacrificedActors.length ? `Harcadıkların: ${d.sacrificedActors.join(", ")}.` : "Kimseyi açıkça harcamadın.");
  lines.push(d.exposedDocuments.length ? `Açığa çıkanlar: ${d.exposedDocuments.join(", ")}.` : "Açığa çıkan belge zinciri kısa.");
  lines.push(d.suppressedDocuments.length ? `Karanlıkta kalanlar: ${d.suppressedDocuments.join(", ")}.` : "Bastırılan özel bir dosya yok — ya açılmadı ya tutulamadı.");
  lines.push(d.risenFactions.length ? `Güçlenen kurumlar: ${d.risenFactions.join(", ")}.` : "Hiçbir taraf net yükselmedi.");
  lines.push(d.brokenTies.length ? `Dağılan ilişkiler: ${d.brokenTies.join(", ")}.` : "Bağlar kopmadı, inceldi.");
  lines.push(
    d.publicKnowledge.length
      ? `Kamuoyunun bildiği: ${d.publicKnowledge.join(", ")}.`
      : "Kamuoyu JİTEM’i teyit etmedi; söylenti veya sis.",
  );
  if (d.contradictions.length) lines.push(`Kaynakların çeliştiği noktalar: ${d.contradictions.slice(0, 3).join(" / ")}`);
  if (d.anchorDrift.length) lines.push(`Çıpalardan sapma: ${d.anchorDrift.join(" ")}`);
  lines.push(`Soruşturma: ${STAGE_LABEL[state.investigation.stage]}.`);
  lines.push(`Senin bıraktığın düzen: ${d.orderLeft}`);
  lines.push(
    `Gizlilik ${state.stats.giz} · Sadakat ${state.stats.sadakat} · Kamuoyu ${state.stats.kamuoyu} · Hukuk ${state.stats.hukuk}.`,
  );
  return lines;
}

export function formatReplay(state: GameState): string {
  const d = state.dossier ?? buildDossier(state);
  const lines: string[] = [
    "DERİN AĞ — SENİN 1986–1996 HİKÂYEN",
    `${SAVE_KEY} · schema ${SCHEMA_VERSION}`,
    `tohum ${state.worldSeed} · hat ${state.hat} · tur ${state.turn} · sonuç ${state.ending ?? "—"}`,
    "",
    ...buildRecap({ ...state, dossier: d }),
    "",
    "KARARLAR",
  ];
  for (const dec of state.decisions) {
    lines.push(`t${dec.turn} ${dec.kind} ${dec.id}${dec.target ? ` @${dec.target}` : ""} — ${dec.summary}`);
  }
  if (!state.decisions.length) lines.push("(kayıt yok)");
  lines.push("", "OLAYLAR");
  const frames = state.replayMeta.events.length ? state.replayMeta.events : state.replay;
  for (const f of frames) {
    if (!f.familyId && !f.note) continue;
    lines.push(`t${f.turn} ${f.familyId ?? "—"}/${f.variantId ?? "—"} ${f.note}`);
  }
  lines.push("", "FACTION");
  for (const f of Object.values(state.factions)) {
    lines.push(`${f.id}: ${f.currentObjective} · son ${f.lastAct || "—"} · bellek ${f.memory.slice(-3).join(",") || "—"}`);
  }
  return lines.join("\n");
}

export function pickEnding(state: GameState): EndingId | null {
  if (
    state.flags.erseverTalked &&
    state.turn === 6 &&
    state.stats.giz < 14 &&
    !state.flags.leakSuppressed &&
    state.stats.sadakat < 28
  ) {
    return "ersever_esigi";
  }
  if (state.flags.commandShifted && state.stats.saha < 12 && state.stats.etki < 12 && state.turn >= 5) {
    return "komuta_felaketi";
  }
  if (state.flags.gizCrisisTurns >= 3 && state.stats.hukuk >= 55 && state.stats.giz < 6 && state.turn >= 8) {
    return "giz_coktu";
  }
  if (state.stats.sadakat < 10 && state.stats.saha >= 45 && state.turn >= 8) {
    return "saha_felaketi";
  }
  if (state.turn < 10) return null;

  const inv = state.investigation.stage;
  const protectedN = Object.values(state.stance).filter((v) => v === "protect").length;
  const spentN = Object.values(state.stance).filter((v) => v === "spend").length;
  if (inv === "public" || inv === "response") {
    if (state.stats.hukuk >= 55 && state.stats.kamuoyu >= 42) return "kismi_adalet";
  }
  if (state.stats.etki < 16 && state.stats.kara >= 38 && state.stats.saha < 20) return "rakip_zafer";
  if (state.stats.saha < 14 && state.stats.etki >= 32 && state.stats.giz >= 22) return "kurumsal_tasfiye";
  if (state.stats.giz >= 30 && state.stats.saha >= 18 && state.stats.etki >= 16 && spentN < 3) return "inkar_ayakta";
  if (state.stats.giz >= 18 && protectedN >= 1) return "kontrollu_parcalanma";
  if (state.stats.giz >= 18) return "kontrollu_parcalanma";
  return "susurluk_patlama";
}
