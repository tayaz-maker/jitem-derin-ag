import type { Faction } from "../types.ts";
import type { ClaimRecord, HistoryRecord, RelationRecord, ResearchRecord } from "./schema.ts";
import { SOURCE_BY_ID } from "./sources.ts";

function sourceLabel(ids: string[]) {
  return ids
    .map((id) => SOURCE_BY_ID[id]?.title)
    .filter(Boolean)
    .join("; ");
}

function sourceLoc(ids: string[], explicit?: string) {
  if (explicit) return explicit;
  const s = SOURCE_BY_ID[ids[0] ?? ""];
  return s?.location ?? s?.note ?? s?.title ?? "kaynak notu";
}

function discover(appearTurn?: number): ResearchRecord["discoverability"] {
  if (appearTurn == null) return "hidden";
  if (appearTurn <= 2) return "early";
  if (appearTurn <= 7) return "mid";
  return "late";
}

export function hydrateResearch(r: ResearchRecord): ResearchRecord {
  const relatedActors = r.relatedActors ?? r.relatedIds.filter((id) => id.startsWith("per_"));
  const relatedEvents = r.relatedEvents ?? r.relatedIds.filter((id) => id.startsWith("hist_"));
  return {
    ...r,
    evidenceLevel: r.evidenceLevel ?? r.evidence,
    source: r.source ?? sourceLabel(r.sourceIds),
    sourceLocation: sourceLoc(r.sourceIds, r.sourceLocation),
    relatedActors,
    relatedEvents,
    knownBy: r.knownBy ?? (r.factionId ? [r.factionId] : []),
    discoverability: r.discoverability ?? discover(r.appearTurn),
    gameUnlock: r.gameUnlock ?? (r.appearTurn != null ? { appearTurn: r.appearTurn, bilgi: 0 } : undefined),
    developerNotes: r.developerNotes ?? "",
    provenance: {
      ...r.provenance,
      alternativeOutcome:
        r.provenance.alternativeOutcome ??
        "Tarihsel çıpa takvimi durmaz. Kim dahil olur, ne kadar bilgi açılır, kim konuşur — campaign’e göre değişir.",
    },
  };
}

export function hydrateClaim(c: ClaimRecord): ClaimRecord {
  return {
    ...c,
    evidenceLevel: c.evidenceLevel ?? c.evidence,
    source: c.source ?? sourceLabel(c.sourceIds),
    sourceLocation: sourceLoc(c.sourceIds, c.sourceLocation),
    contradictions: c.contradictions ?? (c.contradiction ? [c.contradiction] : []),
    relatedActors: c.relatedActors ?? c.aboutIds.filter((id) => id.startsWith("per_")),
    relatedEvents: c.relatedEvents ?? [],
    knownBy: c.knownBy ?? [],
    discoverability: c.discoverability ?? "mid",
    developerNotes: c.developerNotes ?? "",
  };
}

export function hydrateRelation(r: RelationRecord): RelationRecord {
  return {
    ...r,
    evidenceLevel: r.evidenceLevel ?? r.evidence,
    source: r.source ?? sourceLabel(r.sourceIds),
    sourceLocation: sourceLoc(r.sourceIds, r.sourceLocation),
    relatedActors: r.relatedActors ?? [r.fromPlayId, r.toPlayId],
    discoverability: r.discoverability ?? discover(r.appearTurn),
    developerNotes: r.developerNotes ?? "",
  };
}

export function hydrateHistory(h: HistoryRecord): HistoryRecord {
  return {
    ...h,
    evidenceLevel: h.evidenceLevel ?? h.evidence,
    source: h.source ?? sourceLabel(h.sourceIds),
    sourceLocation: sourceLoc(h.sourceIds, h.sourceLocation),
    contradictions: h.contradictions ?? (h.contradiction ? [h.contradiction] : []),
    relatedActors: h.relatedActors ?? h.relatedIds.filter((id) => id.startsWith("per_")),
    relatedEvents: h.relatedEvents ?? [h.id],
    knownBy: h.knownBy ?? [],
    discoverability: h.discoverability ?? "mid",
    developerNotes: h.developerNotes ?? "",
  };
}

export function dbCounts(input: {
  people: number;
  orgs: number;
  claims: number;
  relationships: number;
  events: number;
  sources: number;
}) {
  return input;
}

export type { Faction };
