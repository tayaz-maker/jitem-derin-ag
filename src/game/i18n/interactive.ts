import type { ActionId, FogGrade, GameState, KnowledgeStatus } from "../types.ts";
import type { InteractiveCopy, Locale } from "./types.ts";
import { t, actionCopy } from "./copy.ts";
import { ALL_CLAIMS } from "../db/catalog.ts";
import { NODES, EDGES } from "../data.ts";

export function fogOf(status: KnowledgeStatus | undefined): FogGrade {
  if (status === "TRUE") return "KNOWN";
  if (status === "PARTIAL") return "SUSPECTED";
  if (status === "RUMOR" || status === "FALSE") return "RUMOR";
  return "UNKNOWN";
}

export function playerFog(state: GameState, claimId: string): FogGrade {
  return fogOf(state.hand[claimId]?.status);
}

/** Copy must not leak world-truth the player does not hold. */
export function foggedClaimLine(state: GameState, claimId: string, locale: Locale): string {
  const claim = ALL_CLAIMS.find((c) => c.id === claimId);
  const grade = playerFog(state, claimId);
  if (!claim) return t(locale, "know.thin");
  if (grade === "UNKNOWN") return t(locale, "know.thin");
  if (grade === "RUMOR") {
    return locale === "en"
      ? "Unconfirmed signs on this heading. Not a fact in your hand."
      : "Bu başlıkta doğrulanmamış işaretler var. Elinde olgu değil.";
  }
  if (grade === "SUSPECTED") {
    return locale === "en"
      ? "Partial file: a source speaks; the counter-account still stands."
      : "Kısmi dosya: kaynak konuşur; karşı anlatım durur.";
  }
  return claim.statement;
}

export function affiliationLine(state: GameState, nodeId: string, locale: Locale): string {
  const node = NODES.find((n) => n.id === nodeId);
  if (!node?.faction || node.faction === "jitem") {
    return locale === "en"
      ? "This name sits on your own line, as far as your file goes."
      : "Bu isim, elindeki kadarıyla, senin hatta.";
  }
  const related = ALL_CLAIMS.filter((c) => c.aboutIds.some((id) => id.includes(nodeId) || id === node.researchId));
  const known = related.find((c) => playerFog(state, c.id) === "KNOWN");
  const suspected = related.find((c) => playerFog(state, c.id) === "SUSPECTED");
  const rumor = related.find((c) => playerFog(state, c.id) === "RUMOR");
  if (known) return foggedClaimLine(state, known.id, locale);
  if (suspected) {
    return locale === "en"
      ? "There are unverified signs this person has been in contact with another institutional line."
      : "Bu kişinin başka bir kurumsal hatla temas kurduğuna dair doğrulanmamış işaretler var.";
  }
  if (rumor) {
    return locale === "en"
      ? "A rumor of another desk. Nothing in your hand confirms it."
      : "Başka bir masa söylentisi. Elinde teyit yok.";
  }
  return t(locale, "know.thin");
}

export function copyForAction(id: ActionId, locale: Locale, state?: GameState): InteractiveCopy {
  const raw = actionCopy(locale, id);
  const underWatch = Boolean(
    state &&
      (state.investigation.stage === "inquiry" ||
        state.investigation.stage === "investigation" ||
        state.stats.hukuk >= 28),
  );
  const result = underWatch && raw.resultWatch ? raw.resultWatch : raw.resultOk;
  return {
    label: raw.label,
    verb: raw.verb,
    shortExplanation: raw.shortExplanation,
    whyItMatters: raw.whyItMatters,
    knownCost: raw.knownCost,
    expectedEffect: raw.expectedEffect,
    uncertainty: raw.uncertainty,
    resultExplanation: result,
    nextSuggestion: raw.nextSuggestion,
  };
}

export function resultForAction(id: ActionId, locale: Locale, state: GameState, target?: string): InteractiveCopy {
  const copy = copyForAction(id, locale, state);
  const name =
    target ? (NODES.find((n) => n.id === target)?.name ?? EDGES.find((e) => e.id === target)?.label ?? target) : "";
  const watched =
    state.investigation.heat >= 8 ||
    state.investigation.stage === "inquiry" ||
    state.investigation.stage === "investigation" ||
    (target ? (state.nodeHeat[target] ?? 0) >= 2 : false);
  const raw = actionCopy(locale, id);
  const why =
    watched && (id === "kisi_koru" || id === "bag_koru")
      ? locale === "en"
        ? "Why: this actor was already under a look in the last two turns."
        : "Neden: Bu aktör son iki turda zaten inceleme altındaydı."
      : undefined;
  return {
    ...copy,
    label: name ? `${copy.verb ?? copy.label} · ${name}` : copy.verb ?? copy.label,
    resultExplanation: [watched && raw.resultWatch ? raw.resultWatch : raw.resultOk, why].filter(Boolean).join(" "),
  };
}

export function nodeInteractive(state: GameState, id: string, locale: Locale) {
  const n = NODES.find((x) => x.id === id);
  if (!n) return null;
  const tags = state.actorMemory[id] ?? [];
  const seeKey = tags.includes("spent")
    ? "spent"
    : tags.includes("abandoned")
      ? "abandoned"
      : tags.includes("protected") && tags.includes("promise-kept")
        ? "kept"
        : tags.includes("protected")
          ? "protected"
          : tags.includes("used")
            ? "used"
            : tags.includes("leaked")
              ? "leaked"
              : tags.includes("backed-rival")
                ? "rival"
                : tags.length
                  ? "vague"
                  : "none";
  return {
    who: n.name,
    why: n.role,
    youKnow: affiliationLine(state, id, locale),
    theySee: t(locale, `see.${seeKey}`),
  };
}

export function edgeInteractive(state: GameState, id: string, locale: Locale) {
  const e = EDGES.find((x) => x.id === id);
  if (!e) return null;
  const live = state.edgeLive[id];
  const trust = live?.trust ?? 0;
  const secrecy = live?.secrecy ?? 50;
  return {
    what: e.label,
    why: e.source,
    trust:
      locale === "en"
        ? `Trust ${trust}. Secrecy ${secrecy}. Evidence ${e.evidence}.`
        : `Güven ${trust}. Giz ${secrecy}. Kanıt ${e.evidence}.`,
    gain: actionCopy(locale, "bag_guclendir").expectedEffect,
    risk: actionCopy(locale, "bag_guclendir").shortExplanation,
  };
}
