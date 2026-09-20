export { SOURCES, SOURCE_BY_ID } from "./sources.ts";
export {
  PERSONS,
  ORGS,
  CLAIMS,
  RELATIONS,
  ALL_RESEARCH,
  ALL_CLAIMS,
  ALL_RELATIONS,
  HISTORY,
  RESEARCH_BY_PLAY,
  CLAIM_BY_ID,
} from "./catalog.ts";
export { validateResearch, assertResearch } from "./validate.ts";
export type { ResearchRecord, ClaimRecord, RelationRecord, SourceRecord } from "./schema.ts";

import { ALL_CLAIMS, ALL_RELATIONS, ALL_RESEARCH, HISTORY } from "./catalog.ts";
import { SOURCES } from "./sources.ts";

export const RESEARCH_BY_ID = Object.fromEntries(ALL_RESEARCH.map((r) => [r.id, r]));

export const DB_COUNTS = {
  people: ALL_RESEARCH.filter((r) => r.kind === "person").length,
  orgs: ALL_RESEARCH.filter((r) => r.kind === "org" || r.kind === "place").length,
  claims: ALL_CLAIMS.length,
  relationships: ALL_RELATIONS.length,
  events: HISTORY.length,
  sources: SOURCES.length,
};
