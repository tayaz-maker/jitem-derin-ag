import { ALL_CLAIMS, ALL_RELATIONS, ALL_RESEARCH, HISTORY } from "./catalog.ts";
import { SOURCES } from "./sources.ts";

export interface ValidationIssue {
  level: "error" | "warning";
  id: string;
  message: string;
}

export function validateResearch(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sourceIds = new Set(SOURCES.map((s) => s.id));
  const playIds = new Set(ALL_RESEARCH.filter((r) => r.playId).map((r) => r.playId as string));

  for (const rec of ALL_RESEARCH) {
    if (!rec.sourceIds.length) {
      issues.push({ level: "error", id: rec.id, message: "sourceIds boş" });
    }
    for (const sid of rec.sourceIds) {
      if (!sourceIds.has(sid)) {
        issues.push({ level: "error", id: rec.id, message: `kaynak yok: ${sid}` });
      }
    }
    if (!rec.evidence) issues.push({ level: "error", id: rec.id, message: "evidence yok" });
    if (!rec.provenance?.historicalFact || !rec.provenance?.sourceClaim) {
      issues.push({ level: "error", id: rec.id, message: "provenance eksik" });
    }
    if (rec.fiction !== false) issues.push({ level: "error", id: rec.id, message: "fiction bayrağı false olmalı" });
    if (!rec.sourceLocation) {
      issues.push({ level: "warning", id: rec.id, message: "sourceLocation yok" });
    }
    if (!rec.evidenceLevel) issues.push({ level: "error", id: rec.id, message: "evidenceLevel yok" });
    if (!rec.source) issues.push({ level: "warning", id: rec.id, message: "source etiketi yok" });
    if (!rec.provenance.gameReconstruction) {
      issues.push({ level: "error", id: rec.id, message: "gameReconstruction yok" });
    }
    if (!Array.isArray(rec.provenance.contradictions)) {
      issues.push({ level: "error", id: rec.id, message: "contradictions yok" });
    }
    if (rec.realPerson && rec.motivation.kind === "gameAssumption" && !rec.motivation.text.includes("Oyun")) {
      issues.push({ level: "warning", id: rec.id, message: "oyunsal varsayım ‘Oyun’ etiketi taşımalı" });
    }
    if (rec.realPerson && rec.motivation.kind !== "sourced" && rec.motivation.kind !== "unknown" && rec.motivation.kind !== "gameAssumption") {
      issues.push({ level: "error", id: rec.id, message: "motivasyon sınıflaması geçersiz" });
    }
  }

  for (const c of ALL_CLAIMS) {
    if (!c.sourceIds.length) issues.push({ level: "error", id: c.id, message: "claim kaynaksız" });
    if (c.contradiction === undefined) {
      issues.push({ level: "error", id: c.id, message: "contradiction alanı yok" });
    }
    if (!c.contradictions) issues.push({ level: "error", id: c.id, message: "contradictions dizisi yok" });
    if (!c.layer) issues.push({ level: "error", id: c.id, message: "claim sınıflaması (layer) yok" });
    for (const sid of c.sourceIds) {
      if (!sourceIds.has(sid)) issues.push({ level: "error", id: c.id, message: `kaynak yok: ${sid}` });
    }
  }

  for (const r of ALL_RELATIONS) {
    if (!playIds.has(r.fromPlayId) || !playIds.has(r.toPlayId)) {
      issues.push({
        level: "error",
        id: r.id,
        message: `uç playId yok: ${r.fromPlayId}–${r.toPlayId}`,
      });
    }
    if (!r.sourceIds.length) issues.push({ level: "error", id: r.id, message: "bağ kaynaksız" });
  }

  for (const h of HISTORY) {
    if (!h.sourceIds.length) issues.push({ level: "error", id: h.id, message: "olay kaynaksız" });
    if (!h.layer) issues.push({ level: "error", id: h.id, message: "olay sınıflaması yok" });
  }

  const idSet = new Set<string>();
  for (const rec of [...ALL_RESEARCH, ...ALL_CLAIMS, ...ALL_RELATIONS, ...SOURCES, ...HISTORY]) {
    if (idSet.has(rec.id)) issues.push({ level: "error", id: rec.id, message: "id çakışması" });
    idSet.add(rec.id);
  }

  return issues;
}

export function assertResearch() {
  const errors = validateResearch().filter((i) => i.level === "error");
  if (errors.length) {
    throw new Error(errors.map((e) => `${e.id}: ${e.message}`).join("\n"));
  }
}

export function classifyClaim(id: string) {
  const c = ALL_CLAIMS.find((x) => x.id === id);
  if (!c) return null;
  return {
    layer: c.layer,
    evidence: c.evidence,
    worldStatus: c.worldStatus ?? "UNKNOWN",
    contradiction: c.contradiction,
  };
}
