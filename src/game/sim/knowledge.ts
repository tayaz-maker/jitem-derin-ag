import { ALL_CLAIMS, RESEARCH_BY_PLAY } from "../db/catalog.ts";
import type { Faction, GameState, Hat, KnowledgeEntry, KnowledgeStatus, Locale } from "../types.ts";
import { rollAi } from "./rng.ts";
import { t } from "../i18n/copy.ts";

export function entry(
  claimId: string,
  status: KnowledgeStatus,
  opts?: Partial<KnowledgeEntry>,
): KnowledgeEntry {
  return {
    claimId,
    status,
    confidence: opts?.confidence ?? (status === "TRUE" ? 80 : status === "RUMOR" ? 35 : 50),
    source: opts?.source ?? "masa",
    freshness: opts?.freshness ?? 0,
    propagationRisk: opts?.propagationRisk ?? (status === "RUMOR" ? 40 : 15),
  };
}

export function playerKnows(state: GameState, claimId: string) {
  const h = state.hand[claimId];
  return Boolean(h && h.status !== "UNKNOWN");
}

export function factionKnows(state: GameState, fac: Faction, claimId: string) {
  const e = state.factions[fac]?.knowledgeBase[claimId];
  return Boolean(e && e.status !== "UNKNOWN");
}

export function setHand(state: GameState, e: KnowledgeEntry): GameState {
  return { ...state, hand: { ...state.hand, [e.claimId]: { ...e, freshness: state.turn } } };
}

export function setFactionKnow(state: GameState, fac: Faction, e: KnowledgeEntry): GameState {
  const mind = state.factions[fac];
  if (!mind) return state;
  const knowledgeBase = { ...mind.knowledgeBase, [e.claimId]: { ...e, freshness: state.turn } };
  const known =
    e.status === "TRUE" || e.status === "PARTIAL"
      ? Array.from(new Set([...mind.known, e.claimId]))
      : mind.known;
  const rumor =
    e.status === "RUMOR"
      ? Array.from(new Set([...mind.rumor, e.claimId]))
      : mind.rumor.filter((x) => x !== e.claimId);
  return {
    ...state,
    factions: { ...state.factions, [fac]: { ...mind, knowledgeBase, known, rumor } },
  };
}

export function initialTruth(): Record<string, KnowledgeStatus> {
  return {
    clm_jitem_exists: "TRUE",
    clm_jitem_founding_date: "UNKNOWN",
    clm_yesil_ersever: "PARTIAL",
    clm_veli_order: "UNKNOWN",
    clm_abas_jitem: "UNKNOWN",
    clm_susurluk_car: "TRUE",
    clm_jitem_catli_command: "UNKNOWN",
    clm_mumcu_jitem: "UNKNOWN",
    clm_agar_catli: "PARTIAL",
    clm_official_denial: "TRUE",
    clm_eymur_abas_split: "TRUE",
    clm_informant_layer: "TRUE",
    clm_bitlis_sabotaj: "UNKNOWN",
    clm_bitlis_jitem: "UNKNOWN",
    clm_dogan_founder: "PARTIAL",
    clm_yesil_kayip: "PARTIAL",
    clm_ersever_tapes: "TRUE",
    clm_abas_watch_withdrawn: "UNKNOWN",
    clm_kocadag_catli_precrash: "PARTIAL",
    clm_eymur_emniyet_warn: "TRUE",
    clm_tbmm_commission: "TRUE",
  };
}

export function initialHand(hat: Hat): Record<string, KnowledgeEntry> {
  const jitem = entry("clm_jitem_exists", hat === "arastirmaci" ? "RUMOR" : "PARTIAL", {
    source: hat === "saha" ? "saha" : hat === "arastirmaci" ? "kaynak" : "masa",
    confidence: hat === "saha" ? 70 : hat === "arastirmaci" ? 40 : 55,
  });
  const denial = entry("clm_official_denial", "TRUE", { source: "resmi dil", confidence: 90 });
  const founder = entry("clm_dogan_founder", hat === "idari" ? "PARTIAL" : "RUMOR", {
    source: hat === "idari" ? "idari masa" : "saha fısıltı",
    confidence: hat === "idari" ? 60 : 35,
  });
  const out: Record<string, KnowledgeEntry> = {
    clm_jitem_exists: jitem,
    clm_official_denial: denial,
    clm_dogan_founder: founder,
  };
  if (hat === "arastirmaci") {
    out.clm_informant_layer = entry("clm_informant_layer", "RUMOR", { source: "kaynak karşılaştırması", confidence: 32 });
    out.clm_eymur_abas_split = entry("clm_eymur_abas_split", "RUMOR", { source: "açık yazı", confidence: 38 });
    out.clm_jitem_founding_date = entry("clm_jitem_founding_date", "PARTIAL", { source: "belge boşluğu", confidence: 55 });
  }
  if (hat === "hukuk") {
    out.clm_jitem_exists = entry("clm_jitem_exists", "UNKNOWN", { source: "dosya", confidence: 15 });
    out.clm_tbmm_commission = entry("clm_tbmm_commission", "RUMOR", { source: "meclis karesi", confidence: 30 });
    out.clm_jitem_founding_date = entry("clm_jitem_founding_date", "UNKNOWN", { source: "standart", confidence: 10 });
  }
  return out;
}

export function knowledgeLabel(s: KnowledgeStatus, locale: Locale = "tr") {
  return t(locale, `know.${s}`);
}

export function playerViewOf(state: GameState, nodeId: string, locale: Locale = "tr") {
  const rec = RESEARCH_BY_PLAY[nodeId];
  const about = rec?.id;
  const related = ALL_CLAIMS.filter(
    (c) => (about && c.aboutIds.includes(about)) || c.aboutIds.includes(nodeId) || c.aboutIds.includes(`per_${nodeId}`) || c.aboutIds.includes(`org_${nodeId}`),
  );
  const held = related
    .map((c) => state.hand[c.id])
    .filter((h): h is KnowledgeEntry => Boolean(h && h.status !== "UNKNOWN"));
  if (!held.length) {
    const direct = state.hand[nodeId];
    if (direct && direct.status !== "UNKNOWN") return knowledgeLabel(direct.status, locale);
    return t(locale, "know.thin");
  }
  return held.map((h) => `${h.claimId.replace("clm_", "")}: ${knowledgeLabel(h.status, locale)}`).join(" · ");
}

export function theySeePlayer(state: GameState, actorId: string, locale: Locale = "tr") {
  const tags = state.actorMemory[actorId] ?? [];
  if (!tags.length) return t(locale, "see.none");
  if (tags.includes("spent")) return t(locale, "see.spent");
  if (tags.includes("abandoned")) return t(locale, "see.abandoned");
  if (tags.includes("protected") && tags.includes("promise-kept")) return t(locale, "see.kept");
  if (tags.includes("protected")) return t(locale, "see.protected");
  if (tags.includes("used")) return t(locale, "see.used");
  if (tags.includes("leaked")) return t(locale, "see.leaked");
  if (tags.includes("backed-rival")) return t(locale, "see.rival");
  return t(locale, "see.vague");
}

/** Allied factions may inherit a rumor. Never copies the player hand. One leak note per tick. */
export function tickKnowledge(state: GameState, notes: string[]): GameState {
  let next = state;
  let leaked = 0;
  const minds = Object.values(next.factions);
  for (const mind of minds) {
    if (leaked >= 1) break;
    for (const ally of mind.allies) {
      if (leaked >= 1) break;
      for (const [claimId, k] of Object.entries(mind.knowledgeBase)) {
        if (k.status !== "RUMOR" && k.status !== "PARTIAL") continue;
        if (k.propagationRisk < 32) continue;
        const theirs = next.factions[ally]?.knowledgeBase[claimId];
        if (theirs && theirs.status !== "UNKNOWN") continue;
        const [rolled, r] = rollAi(next, next.turn + claimId.length + ally.length);
        next = rolled;
        if (r <= 0.62) continue;
        next = setFactionKnow(
          next,
          ally,
          entry(claimId, "RUMOR", {
            source: `${mind.id} sızıntı`,
            confidence: Math.min(38, k.confidence),
            propagationRisk: Math.max(10, k.propagationRisk - 10),
          }),
        );
        notes.push(`note.know.leak|ally=${ally}|from=${mind.id}`);
        leaked += 1;
        break;
      }
    }
  }
  return next;
}
