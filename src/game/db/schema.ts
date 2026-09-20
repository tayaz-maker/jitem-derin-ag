import type { ContentLayer, Evidence, Faction, KnowledgeStatus, NodeKind } from "../types.ts";

export type RecordKind =
  | "person"
  | "org"
  | "event"
  | "claim"
  | "relation"
  | "place"
  | "media"
  | "source";

export interface SourceRecord {
  id: string;
  title: string;
  author: string;
  year?: string;
  kind: "book" | "testimony" | "archive" | "commission" | "press" | "self";
  note: string;
  location?: string;
}

export interface Provenance {
  historicalFact: string;
  sourceClaim: string;
  gameReconstruction: string;
  alternativeOutcome?: string;
  contradictions: string[];
}

export interface Motivation {
  kind: "sourced" | "gameAssumption" | "unknown";
  text: string;
}

export interface ResearchRecord {
  id: string;
  playId?: string;
  kind: RecordKind;
  nodeKind?: NodeKind;
  displayName: string;
  realPerson: boolean;
  factionId?: Faction;
  evidence: Evidence;
  evidenceLevel?: Evidence;
  sourceIds: string[];
  source?: string;
  sourceLocation?: string;
  date?: string;
  role: string;
  summary: string;
  provenance: Provenance;
  motivation: Motivation;
  relatedIds: string[];
  relatedEvents?: string[];
  relatedActors?: string[];
  knownBy?: Faction[];
  discoverability?: "early" | "mid" | "late" | "hidden";
  gameUnlock?: { appearTurn: number; bilgi: number };
  developerNotes?: string;
  appearTurn?: number;
  fiction: false;
}

export interface ClaimRecord {
  id: string;
  title: string;
  evidence: Evidence;
  evidenceLevel?: Evidence;
  sourceIds: string[];
  source?: string;
  sourceLocation?: string;
  aboutIds: string[];
  layer: ContentLayer;
  statement: string;
  contradiction: string | null;
  contradictions?: string[];
  knownBy?: Faction[];
  discoverability?: "early" | "mid" | "late" | "hidden";
  worldStatus?: KnowledgeStatus;
  relatedActors?: string[];
  relatedEvents?: string[];
  gameUnlock?: { appearTurn: number; bilgi: number };
  developerNotes?: string;
  fiction: false;
}

export interface RelationRecord {
  id: string;
  playId: string;
  fromPlayId: string;
  toPlayId: string;
  label: string;
  evidence: Evidence;
  evidenceLevel?: Evidence;
  sourceIds: string[];
  source?: string;
  sourceLocation?: string;
  layer: ContentLayer;
  breakIf?: string;
  appearTurn: number;
  belgelıLockTurn?: number;
  contradictions?: string[];
  relatedActors?: string[];
  relatedEvents?: string[];
  knownBy?: Faction[];
  discoverability?: "early" | "mid" | "late" | "hidden";
  developerNotes?: string;
}

export interface HistoryRecord {
  id: string;
  title: string;
  date: string;
  evidence: Evidence;
  evidenceLevel?: Evidence;
  sourceIds: string[];
  source?: string;
  sourceLocation?: string;
  layer: ContentLayer;
  statement: string;
  contradiction: string | null;
  contradictions?: string[];
  relatedIds: string[];
  relatedActors?: string[];
  relatedEvents?: string[];
  knownBy?: Faction[];
  discoverability?: "early" | "mid" | "late" | "hidden";
  developerNotes?: string;
  fiction: false;
}
