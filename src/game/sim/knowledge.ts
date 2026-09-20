import { ALL_CLAIMS, RESEARCH_BY_PLAY } from "../db/catalog.ts";
import type { Faction, GameState, KnowledgeEntry, KnowledgeStatus } from "../types.ts";
import { rollAi } from "./rng.ts";

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
  };
}

export function initialHand(hat: "saha" | "idari"): Record<string, KnowledgeEntry> {
  const jitem = entry("clm_jitem_exists", "PARTIAL", { source: "saha", confidence: hat === "saha" ? 70 : 55 });
  const denial = entry("clm_official_denial", "TRUE", { source: "resmi dil", confidence: 90 });
  const founder = entry("clm_dogan_founder", hat === "idari" ? "PARTIAL" : "RUMOR", {
    source: hat === "idari" ? "idari masa" : "saha fısıltı",
    confidence: hat === "idari" ? 60 : 35,
  });
  return { clm_jitem_exists: jitem, clm_official_denial: denial, clm_dogan_founder: founder };
}

export function knowledgeLabel(s: KnowledgeStatus) {
  if (s === "TRUE") return "ELİNDE · doğru sanıyor";
  if (s === "FALSE") return "ELİNDE · yanlış inanış";
  if (s === "PARTIAL") return "ELİNDE · kısmi";
  if (s === "RUMOR") return "ELİNDE · söylenti";
  return "BİLİNMİYOR";
}

export function playerViewOf(state: GameState, nodeId: string) {
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
    if (direct && direct.status !== "UNKNOWN") return knowledgeLabel(direct.status);
    return "ELİNDE · bu isim hakkında dosyan ince.";
  }
  return held.map((h) => `${h.claimId.replace("clm_", "")}: ${knowledgeLabel(h.status)}`).join(" · ");
}

export function theySeePlayer(state: GameState, actorId: string) {
  const tags = state.actorMemory[actorId] ?? [];
  if (!tags.length) return "Seni henüz dosyalamadı.";
  if (tags.includes("spent")) return "Seni yakmış biri olarak görüyor.";
  if (tags.includes("abandoned")) return "Seni yalnız bırakan masa olarak görüyor.";
  if (tags.includes("protected") && tags.includes("promise-kept")) return "Seni sözünü tutan koruyucu olarak görüyor.";
  if (tags.includes("protected")) return "Seni koruyan hat olarak görüyor.";
  if (tags.includes("used")) return "Seni kullanan masa olarak görüyor.";
  if (tags.includes("leaked")) return "Bilgisinin sızdığını düşünüyor.";
  if (tags.includes("backed-rival")) return "Rakibini tuttuğunu düşünüyor.";
  return "Seni henüz net koymadı.";
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
        notes.push(`${ally} hattı ${mind.id} söylentisini kaptı. Teyit yok — yanlış da olabilir.`);
        leaked += 1;
        break;
      }
    }
  }
  return next;
}
