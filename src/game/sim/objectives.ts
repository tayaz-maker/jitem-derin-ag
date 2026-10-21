import { actOf } from "./acts.ts";
import { t } from "../i18n/copy.ts";
import { hasMemory } from "./memory.ts";
import type { GameState, Objective, StatKey } from "../types.ts";

const CATALOG: Omit<Objective, "status">[] = [
  { id: "obj_edge", title: "Bir bağı sıkılaştır veya gevşet", hint: "Haritada çizgi.", secret: false, origin: "act" },
  { id: "obj_person", title: "Bir kişiyi koru veya mesafe koy", hint: "Kişi grubu.", secret: false, origin: "act" },
  { id: "obj_truth", title: "Gerçeği aç veya düzeni tut", hint: "Rapor / inkâr.", secret: false, origin: "act" },
  { id: "obj_hold_ersever", title: "Saha hattını yanında tut", hint: "Ersever’i harcama.", secret: false, origin: "actor" },
  { id: "obj_cool_mit", title: "MİT baskısını bir tur kes", hint: "Rakibi soğut.", secret: false, origin: "faction" },
  { id: "obj_leak", title: "Sızıntı riskini 40 giz’in üstünde tut", hint: "Bastır / inkâr.", secret: false, origin: "act" },
  { id: "obj_inv", title: "Soruşturmayı inquiry’de tut veya yönlendir", hint: "Durdurmak zorunda değilsin.", secret: false, origin: "event" },
  { id: "obj_chain", title: "İki belge notu aç (rapor/dosya)", hint: "Bilgi zinciri.", secret: false, origin: "act" },
  { id: "obj_balance", title: "Emniyet hattını soğut, saha kapasitesini tut", hint: "Kesişim ısınmasın.", secret: false, origin: "faction" },
  { id: "obj_secret_aygan", title: "İtirafçıyı yakma", hint: "Aygan’ı harcama.", secret: true, origin: "actor" },
];

/**
 * What finishing each objective earns. Paid once, the first time the objective
 * reads "done", and recorded as an `obj-reward:<id>` tag so saves, replays and
 * the move preview (which runs the real engine) all agree.
 */
export const OBJECTIVE_REWARDS: Record<string, Partial<Record<StatKey, number>>> = {
  obj_edge: { etki: 3 },
  obj_person: { sadakat: 4 },
  obj_truth: { bilgi: 4 },
  obj_hold_ersever: { saha: 5 },
  obj_cool_mit: { giz: 3 },
  obj_leak: { etki: 3 },
  obj_inv: { hukuk: -4 },
  obj_chain: { bilgi: 6 },
  obj_balance: { saha: 4 },
  obj_secret_aygan: { sadakat: 6 },
};

function payRewards(state: GameState, objectives: Objective[]): GameState {
  let next = state;
  for (const o of objectives) {
    const tag = `obj-reward:${o.id}`;
    const reward = OBJECTIVE_REWARDS[o.id];
    if (o.status !== "done" || !reward || next.tags.includes(tag)) continue;
    const stats = { ...next.stats };
    for (const [k, v] of Object.entries(reward))
      stats[k as StatKey] = Math.max(0, Math.min(100, stats[k as StatKey] + (v ?? 0)));
    next = { ...next, stats, tags: [...next.tags, tag] };
  }
  return next;
}

/** Stable IDs keep old completion/reward receipts; only the role's task changes. */
export function objectiveKey(state: GameState, id: string): string {
  return (state.hat === "arastirmaci" || state.hat === "hukuk") &&
    ["obj_edge", "obj_person", "obj_truth", "obj_inv", "obj_chain"].includes(id)
    ? `obj.${state.hat}_${id}` : `obj.${id}`;
}

function evalStatus(state: GameState, id: string): Objective["status"] {
  if (state.hat === "arastirmaci" || state.hat === "hukuk") {
    const research = state.hat === "arastirmaci";
    const records = research ? state.investigation.comparisons : state.investigation.chain;
    const count = new Set((records ?? []).map(r => r.claimId)).size;
    if (id === "obj_edge") return count >= 1 ? "done" : "open";
    if (id === "obj_person") return count >= 2 ? "done" : "open";
    if (id === "obj_chain") return count >= 3 ? "done" : "open";
    if (id === "obj_truth") return research
      ? state.tags.some(tag => /^(src-held|src-shared|src-published):/.test(tag)) ? "done" : "open"
      : ["investigation", "evidence", "public", "response"].includes(state.investigation.stage) ? "done" : "open";
    if (id === "obj_inv") return ["evidence", "public", "response"].includes(state.investigation.stage) ? "done" : "open";
  }
  const reports = state.decisions.filter((d) => d.id === "rapor_yaz" || d.id === "dosya_oku").length;
  switch (id) {
    case "obj_edge":
      return state.decisions.some((d) => d.id === "bag_guclendir" || d.id === "bag_gevset") ? "done" : "open";
    case "obj_person":
      return Object.keys(state.stance).length ? "done" : "open";
    case "obj_truth":
      return state.decisions.some((d) => d.id === "rapor_yaz" || d.id === "inkar_yaz") ? "done" : "open";
    case "obj_hold_ersever":
      if (hasMemory(state, "ersever", "spent")) return "failed";
      if (hasMemory(state, "ersever", "protected")) return "done";
      return "open";
    case "obj_cool_mit":
      return state.flags.mitCooledUntil >= state.turn ? "done" : "open";
    case "obj_leak":
      return state.stats.giz >= 40 ? "done" : state.stats.giz < 18 ? "failed" : "open";
    case "obj_inv":
      if (state.investigation.stage === "public" && state.stats.giz < 20) return "failed";
      if (
        state.investigation.stage === "inquiry" ||
        state.investigation.stage === "investigation" ||
        state.tags.includes("inv-direct") ||
        state.decisions.some((d) => d.id === "soru_yonlendir" || d.id === "soru_sinir")
      )
        return "done";
      return "open";
    case "obj_chain":
      return reports >= 2 ? "done" : "open";
    case "obj_balance":
      return state.flags.emniyetCooledUntil >= state.turn && state.stats.saha >= 30 ? "done" : "open";
    case "obj_secret_aygan":
      if (hasMemory(state, "aygan", "spent")) return "failed";
      return state.turn >= 7 && !hasMemory(state, "aygan", "spent") ? "done" : "open";
    default:
      return "open";
  }
}

export function syncObjectives(state: GameState): GameState {
  const act = actOf(state.turn);
  const want: string[] = [];
  const evidenceRole = state.hat === "arastirmaci" || state.hat === "hukuk";
  if (evidenceRole) {
    if (act === 1) want.push("obj_edge");
    if (act === 2) want.push("obj_person");
    if (act === 3) want.push("obj_truth");
    if (act >= 4) want.push("obj_inv");
    if (act >= 6) want.push("obj_chain");
  } else {
  if (act === 1) want.push("obj_edge");
  if (act === 2) want.push("obj_person", "obj_secret_aygan");
  if (act === 3) want.push("obj_truth", "obj_cool_mit");
  if (act === 4) want.push("obj_hold_ersever", "obj_leak");
  if (act >= 5) want.push("obj_inv", "obj_balance");
  if (act >= 6) want.push("obj_chain");
  }

  const byId = Object.fromEntries(state.objectives.map((o) => [o.id, o]));
  const next: Objective[] = [];
  for (const id of want) {
    const def = CATALOG.find((c) => c.id === id);
    if (!def) continue;
    if (def.secret && act < 2) continue;
    const prev = byId[id];
    next.push({ ...def, title: t("tr", objectiveKey(state, id)), status: prev?.status === "done" ? "done" : evalStatus(state, id) });
  }
  for (const o of state.objectives) {
    if (!want.includes(o.id) && o.status === "done") next.push(o);
  }
  // A completed legacy objective is already earned, even if its old save has
  // no reward tag. Never grant it again after a predicate/role migration.
  const tags = [...new Set([...state.tags, ...state.objectives
    .filter(o => o.status === "done").map(o => `obj-reward:${o.id}`)])];
  return payRewards({ ...state, tags, objectives: next }, next);
}

export function visibleObjectives(state: GameState) {
  return state.objectives.filter((o) => !o.secret || state.turn >= 4);
}
