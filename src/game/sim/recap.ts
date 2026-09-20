import { ALL_CLAIMS } from "../db/catalog.ts";
import { EDGES, NODES } from "../data.ts";
import { SAVE_KEY, SCHEMA_VERSION } from "../types.ts";
import type { Decision, Dossier, EndingId, GameState, Locale } from "../types.ts";
import { t } from "../i18n/copy.ts";

export function pushDecision(state: GameState, d: Omit<Decision, "turn">): GameState {
  return {
    ...state,
    decisions: [...state.decisions, { ...d, turn: state.turn }],
  };
}

function names(ids: string[]) {
  return ids.map((id) => NODES.find((n) => n.id === id)?.name ?? id);
}

function orderKey(state: GameState): "intact" | "legal" | "scatter" {
  if (state.stats.giz >= 28 && state.stats.saha >= 18) return "intact";
  if (state.stats.hukuk >= 50) return "legal";
  return "scatter";
}

function driftKeys(state: GameState): string[] {
  const keys: string[] = [];
  if (state.flags.leakSuppressed) keys.push("drift.tapes");
  if (hasSpend(state) && state.flags.erseverTalked) keys.push("drift.spent");
  if (state.flags.emniyetCooledUntil > 0) keys.push("drift.emniyet");
  if (state.investigation.stage === "dormant") keys.push("drift.sleep");
  if (state.flags.yesilUsed) keys.push("drift.yesil");
  return keys;
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
  const locale: Locale = "tr";
  const anchorDrift = driftKeys(state).map((k) => t(locale, k));
  const orderLeft = t(locale, `endOrder.${orderKey(state)}`);

  return {
    title: t(locale, "end.title"),
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
    causal: causalNarrative(state),
  };
}

export function displayDossier(state: GameState, locale: Locale) {
  const d = state.dossier ?? buildDossier(state);
  return {
    title: t(locale, "end.title"),
    protectedActors: d.protectedActors,
    sacrificedActors: d.sacrificedActors,
    exposedDocuments: d.exposedDocuments,
    suppressedDocuments: d.suppressedDocuments,
    risenFactions: d.risenFactions,
    brokenTies: d.brokenTies,
    publicKnowledge: d.publicKnowledge,
    contradictions: d.contradictions,
    anchorDrift: driftKeys(state).map((k) => t(locale, k)),
    orderLeft: t(locale, `endOrder.${orderKey(state)}`),
    causal: causalNarrative(state, locale),
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
  lines.push(`Soruşturma: ${t("tr", `inv.${state.investigation.stage}`)}.`);
  lines.push(`Senin bıraktığın düzen: ${d.orderLeft}`);
  lines.push(
    `Gizlilik ${state.stats.giz} · Sadakat ${state.stats.sadakat} · Kamuoyu ${state.stats.kamuoyu} · Hukuk ${state.stats.hukuk}.`,
  );
  return lines;
}

export function replayFilename(seed: number) {
  return `DERIN-AG-1986-1996-${seed}.json`;
}

export function formatReplayJson(state: GameState) {
  const d = state.dossier ?? buildDossier(state);
  const frames = state.replayMeta.events.length ? state.replayMeta.events : state.replay;
  return {
    saveKey: SAVE_KEY,
    schemaVersion: SCHEMA_VERSION,
    seed: state.worldSeed,
    hat: state.hat,
    turn: state.turn,
    ending: state.ending,
    stats: state.stats,
    investigation: state.investigation,
    decisions: state.decisions,
    events: frames.map((f) => ({
      turn: f.turn,
      familyId: f.familyId ?? null,
      variantId: f.variantId ?? null,
      note: f.note,
      factionActs: f.factionActs,
    })),
    factionActions: Object.values(state.factions).map((f) => ({
      id: f.id,
      lastAct: f.lastAct,
      memory: f.memory.slice(-4),
    })),
    major: state.replayMeta.major,
    dossier: d,
  };
}

export function formatReplay(state: GameState): string {
  const json = formatReplayJson(state);
  const d = json.dossier;
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
  for (const f of json.events) {
    if (!f.familyId && !f.note) continue;
    lines.push(`t${f.turn} ${f.familyId ?? "—"}/${f.variantId ?? "—"} ${f.note}`);
  }
  lines.push("", "FACTION");
  for (const f of json.factionActions) {
    lines.push(`${f.id}: son ${f.lastAct || "—"} · bellek ${f.memory.join(",") || "—"}`);
  }
  return lines.join("\n");
}

export function causalNarrative(state: GameState, locale: Locale = "tr"): string[] {
  const protectedN = Object.values(state.stance).filter((v) => v === "protect").length;
  const spentN = Object.values(state.stance).filter((v) => v === "spend").length;
  const denies = state.decisions.filter((d) => d.id === "inkar_yaz" || d.id === "sizinti_bastir" || d.id === "e6-bas" || d.id === "e10-inkar").length;
  const opens = state.decisions.filter((d) => d.id === "rapor_yaz" || d.id === "soru_ac" || d.id === "bag_ifsa" || d.id === "e6-not").length;
  const en = locale === "en";
  const lines: string[] = [];
  if (state.ending === "kontrollu_parcalanma" || state.ending === "inkar_ayakta") {
    lines.push(
      protectedN >= 1
        ? en
          ? "The network did not fully come apart. The main reason is that you protected critical ties late while limiting public pressure."
          : "Ağ tamamen çözülmedi. Bunun temel nedeni, geç dönemde kritik bağları korurken kamuoyu baskısını sınırlaman oldu."
        : en
          ? "The network did not fully come apart. Denial language and field capacity were carried at the same time."
          : "Ağ tamamen çözülmedi. İnkâr dili ve saha kapasitesi aynı anda taşındı.",
    );
    if (state.investigation.documents.length === 0 || state.investigation.suppressed.length) {
      lines.push(
        en
          ? "Files that did not come into view kept the legal line from closing some connections."
          : "Ancak açığa çıkmayan dosyalar, hukuk hattının bazı bağlantıları kapatmasına engel oldu.",
      );
    }
  } else if (state.ending === "giz_coktu" || state.ending === "susurluk_patlama") {
    lines.push(
      opens >= 2
        ? en
          ? "Visibility was chosen: a report, an exposure or an opened surface carried secrecy into a public frame."
          : "Görünürlük seçildi: rapor, ifşa veya yüzey açma, gizliliği kamu karesine taşıdı."
        : en
          ? "Secrecy could not carry the weight of the working structure. The leak was not pressed."
          : "Gizlilik, fiilî yapının ağırlığını taşıyamadı. Sızıntı basılmadı.",
    );
  } else if (state.ending === "ersever_esigi") {
    lines.push(
      en
        ? "The insider who talked arrived before the crash outside. Suppression came late."
        : "Konuşan içerideki, dışarıdaki kazadan önce geldi. Bastırma geç kaldı.",
    );
  } else if (state.ending === "kismi_adalet") {
    lines.push(
      en
        ? "Public and legal heat rose. Some ties were documented; the order-gap remained."
        : "Kamu ve hukuk ısındı. Bazı bağlar belgelendi; emir boşluğu durdu.",
    );
    const chainN = state.investigation.chain?.length ?? 0;
    const cmpN = state.investigation.comparisons?.length ?? 0;
    if (chainN >= 2) {
      lines.push(
        en
          ? "The legal line contributed: claim-bound evidence links moved the file a tier without inventing an order."
          : "Hukuk hattı katkı verdi: iddiaya bağlı delil halkaları dosyayı bir kat ilerletti; emir uydurulmadı.",
      );
    }
    if (cmpN >= 1) {
      lines.push(
        en
          ? "The researcher line contributed: two sources were set side by side. Contradiction stayed on file."
          : "Araştırmacı hattı katkı verdi: iki kaynak yan yana kondu. Çelişki dosyada kaldı.",
      );
    }
  } else if (spentN >= 2) {
    lines.push(
      en
        ? "Spent people wrote talk and resentment into memory. The network broke from inside."
        : "Harcanan kişiler belleğe konuşma ve kin yazdı. Ağ kendi içinde kırıldı.",
    );
  }
  if (denies >= 3 && state.stats.giz < 22) {
    lines.push(
      en
        ? "Repeating denial did not hold the fog; repetition did not convince the public."
        : "İnkâr tekrarı sis tutmadı; tekrar, kamuoyunu inandırmadı.",
    );
  }
  if (!lines.length) {
    lines.push(
      en
        ? "Partial interest-networks walked on what they themselves knew. There was no single hand."
        : "Parçalı çıkar ağları kendi bildikleriyle yürüdü. Tek el yoktu.",
    );
  }
  return lines;
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
  if (state.flags.gizCrisisTurns >= 4 && state.stats.hukuk >= 62 && state.stats.giz < 4 && state.turn >= 9) {
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
    if ((state.investigation.chain?.length ?? 0) >= 2 && state.stats.hukuk >= 48 && state.stats.kamuoyu >= 32) return "kismi_adalet";
  }
  if (state.stats.etki < 16 && state.stats.kara >= 38 && state.stats.saha < 20) return "rakip_zafer";
  if (state.stats.saha < 14 && state.stats.etki >= 32 && state.stats.giz >= 22) return "kurumsal_tasfiye";
  if (state.stats.giz >= 30 && state.stats.saha >= 18 && state.stats.etki >= 16 && spentN < 3) return "inkar_ayakta";
  if (state.stats.giz >= 18 && protectedN >= 1) return "kontrollu_parcalanma";
  if (state.stats.giz >= 18) return "kontrollu_parcalanma";
  return "susurluk_patlama";
}
