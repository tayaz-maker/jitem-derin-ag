import type { Faction, GameState } from "../types.ts";
import { FACTION_DEFS } from "./factions.ts";
import { mechanicUnlocked } from "./acts.ts";

export type IntelGrade = "KNOWN" | "SUSPECTED" | "RUMOR" | "UNKNOWN";

export interface IntelSignal {
  faction: Faction;
  name: string;
  grade: IntelGrade;
  headline: string;
  why?: string;
  risk?: string;
}

const ACT_HEADLINE: Record<string, { grade: IntelGrade; key: string }> = {
  "freelance-capacity": { grade: "SUSPECTED", key: "intel.act.freelance" },
  "spent-resentment": { grade: "RUMOR", key: "intel.act.resentment" },
  "scrape-funds": { grade: "RUMOR", key: "intel.act.scrape" },
  "distance-jitem": { grade: "SUSPECTED", key: "intel.act.distance" },
  wait: { grade: "SUSPECTED", key: "intel.act.wait" },
  "protect-self": { grade: "SUSPECTED", key: "intel.act.protect" },
  "abas-shock": { grade: "KNOWN", key: "intel.act.abas" },
  "catli-rise": { grade: "SUSPECTED", key: "intel.act.catli" },
  cool: { grade: "SUSPECTED", key: "intel.act.cool" },
  cooled: { grade: "SUSPECTED", key: "intel.act.cooled" },
  leak: { grade: "RUMOR", key: "intel.act.leak" },
  ride: { grade: "RUMOR", key: "intel.act.ride" },
  shield: { grade: "SUSPECTED", key: "intel.act.shield" },
  distance: { grade: "SUSPECTED", key: "intel.act.politics" },
  "crash-distance": { grade: "KNOWN", key: "intel.act.crash" },
  commission: { grade: "KNOWN", key: "intel.act.commission" },
  "press-rumor": { grade: "RUMOR", key: "intel.act.pressRumor" },
  "press-false": { grade: "RUMOR", key: "intel.act.pressFalse" },
  "press-push": { grade: "SUSPECTED", key: "intel.act.pressPush" },
  "file-open": { grade: "SUSPECTED", key: "intel.act.fileOpen" },
  "file-block": { grade: "SUSPECTED", key: "intel.act.fileBlock" },
  memo: { grade: "SUSPECTED", key: "intel.act.memo" },
  "false-bind": { grade: "RUMOR", key: "intel.act.falseBind" },
};

function factionVisible(state: GameState, id: Faction): boolean {
  if (id === "jitem") return true;
  if (id === "mit") return state.turn >= 3 || Boolean(state.revealed.mit);
  if (id === "emniyet") return mechanicUnlocked(state, "emniyet") || Boolean(state.revealed.emniyet);
  if (id === "media") return mechanicUnlocked(state, "knowledge") || state.turn >= 3;
  if (id === "hukuk") return mechanicUnlocked(state, "investigation") || state.investigation.stage !== "dormant";
  if (id === "askeri") return state.turn >= 4;
  if (id === "siyaset") return state.turn >= 4;
  if (id === "yeralti") return Boolean(state.revealed.catli) || state.turn >= 8;
  return Boolean(state.revealed[id]);
}

function gradeFor(state: GameState, id: Faction, lastAct: string): IntelGrade {
  if (id === "jitem") return "KNOWN";
  const mapped = ACT_HEADLINE[lastAct];
  if (mapped?.grade === "KNOWN" && (id === "mit" || lastAct === "commission" || lastAct === "crash-distance" || lastAct === "abas-shock")) {
    return "KNOWN";
  }
  const hand = Object.values(state.hand);
  if (id === "media") {
    const press = hand.find((h) => h.claimId === "clm_jitem_exists");
    if (press?.status === "TRUE") return mapped?.grade === "RUMOR" ? "RUMOR" : "SUSPECTED";
    return "RUMOR";
  }
  if (!lastAct) return "UNKNOWN";
  return mapped?.grade ?? "SUSPECTED";
}

function headlineFor(id: Faction, lastAct: string, grade: IntelGrade): string {
  if (id === "jitem") return "intel.jitem";
  if (grade === "UNKNOWN" && !lastAct) return "intel.fog";
  const mapped = ACT_HEADLINE[lastAct];
  if (mapped) return mapped.key;
  if (grade === "UNKNOWN") return "intel.unread";
  return "intel.stir";
}

function whyFor(id: Faction, lastAct: string, grade: IntelGrade): string | undefined {
  if (id === "jitem") return "desk";
  if (grade === "RUMOR" || lastAct === "press-push" || lastAct === "press-rumor") return "press";
  if (grade === "KNOWN") return "known";
  if (grade === "SUSPECTED") return "suspected";
  return "fog";
}

function riskFor(state: GameState, id: Faction, grade: IntelGrade): string | undefined {
  if (id === "jitem" || grade === "UNKNOWN") return undefined;
  const stage = state.investigation.stage;
  if (stage === "public" || stage === "response") return "public";
  if ((state.factions[id]?.hostility ?? 0) >= 28) return "rivalry";
  if (state.investigation.heat >= 8 || stage === "inquiry" || stage === "investigation") return "inquiry";
  return "inquiry";
}

export function factionSignals(state: GameState): IntelSignal[] {
  const out: IntelSignal[] = [];
  for (const def of FACTION_DEFS) {
    if (!factionVisible(state, def.id)) continue;
    const mind = state.factions[def.id];
    const lastAct = mind?.lastAct ?? "";
    const grade = gradeFor(state, def.id, lastAct);
    out.push({
      faction: def.id,
      name: def.name,
      grade,
      headline: headlineFor(def.id, lastAct, grade),
      why: whyFor(def.id, lastAct, grade),
      risk: riskFor(state, def.id, grade),
    });
  }
  return out;
}

export function intelGradeLabel(g: IntelGrade) {
  if (g === "KNOWN") return "fog.KNOWN";
  if (g === "SUSPECTED") return "fog.SUSPECTED";
  if (g === "RUMOR") return "fog.RUMOR";
  return "fog.UNKNOWN";
}
