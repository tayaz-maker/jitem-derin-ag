import { EDGES, NODES } from "../data.ts";
import { ALL_CLAIMS } from "../db/catalog.ts";
import type { ActionId, GameState, PlannedAction } from "../types.ts";
import { nextEvidenceSource } from "./investigation.ts";
import { touchEdge } from "./edges.ts";
import { encodeNote } from "../i18n/format.ts";

export type DecisionTarget = { kind: "node" | "edge"; id: string; label: string };
export type PlanMethod = "quiet" | "institutional" | "operational";
export function targetClaims(state: GameState, target: DecisionTarget) {
  const edge = target.kind === "edge" ? EDGES.find((e) => e.id === target.id) : null;
  const ids = edge ? [edge.from, edge.to] : [target.id];
  const research = ids.flatMap((id) => {
    const n = NODES.find((n) => n.id === id);
    return n ? [id, n.researchId] : [id];
  });
  return ALL_CLAIMS.filter(
    (c) =>
      state.hand[c.id] &&
      state.hand[c.id].status !== "UNKNOWN" &&
      c.aboutIds.some((id) => research.includes(id)),
  );
}
export function decisionOptions(
  state: GameState,
  target: DecisionTarget,
  claimId?: string,
): ActionId[] {
  if (state.hat === "arastirmaci") {
    const claim = targetClaims(state, target).find((c) => c.id === claimId);
    if (!claim) return [];
    const out: ActionId[] = [];
    if (
      claim.contradiction &&
      !state.investigation.comparisons?.some((c) => c.claimId === claim.id)
    )
      out.push("kaynak_karsilastir");
    if (
      ["RUMOR", "PARTIAL"].includes(state.hand[claim.id].status) &&
      state.hand[claim.id].confidence < 72
    )
      out.push("dogrula");
    if (state.investigation.comparisons?.some((c) => c.claimId === claim.id))
      out.push("src_tut", "src_paylas", "src_yayin");
    return out.filter((id) => !state.tags.includes(`plan-used:${state.turn}:${id}:${claim.id}`));
  }
  if (state.hat === "hukuk") {
    if (
      !claimId ||
      !targetClaims(state, target).some((c) => c.id === claimId) ||
      !["PARTIAL", "TRUE"].includes(state.hand[claimId]?.status)
    )
      return [];
    const chained = state.investigation.chain?.some((c) => c.claimId === claimId);
    const out: ActionId[] = chained
      ? [...(nextEvidenceSource(state, claimId) ? ["delil_zincir" as const] : []), "kanit_esigi", "soru_yonlendir", "soru_sinir"]
      : ["delil_zincir"];
    return out.filter((id) => !state.tags.includes(`plan-used:${state.turn}:${id}:${claimId}`));
  }
  const live = target.kind === "edge" ? state.edgeLive[target.id] : null;
  let out: ActionId[];
  if (live) {
    out = ["bag_gozet"];
    if (live.trust < 70) out.push("bag_guclendir");
    if (live.secrecy < 70) out.push("bag_koru");
    if (live.tension >= 35) out.push("bag_arabul");
    if (live.dependency >= 30) out.push("bag_gevset");
    if (state.investigation.heat > 12) out.push("bag_yalitim");
  } else {
    if (state.dead[target.id] || NODES.find((n) => n.id === target.id)?.kind !== "kisi") return [];
    out = ["kisi_koru", "kisi_kullan"];
    if ((state.nodeHeat[target.id] ?? 0) > 0 || state.actorMemory[target.id]?.length)
      out.push("kisi_mesafe");
    if (state.actorMemory[target.id]?.includes("used") || (state.nodeHeat[target.id] ?? 0) >= 2)
      out.push("kisi_harca");
  }
  return out.filter((id) => !state.tags.includes(`plan-used:${state.turn}:${id}:${target.id}`));
}
export function planMethods(state: GameState, id: ActionId): PlanMethod[] {
  if (!id.startsWith("bag_") && !id.startsWith("kisi_")) return [];
  const out: PlanMethod[] = ["quiet"];
  if (state.stats.etki >= 4) out.push("institutional");
  if (state.hat === "saha" && state.stats.kara >= 4 && state.actionsLeft >= 2)
    out.push("operational");
  return out;
}
/**
 * What each approach does now. One table, read by the engine and the desk:
 * - quiet: cheap and slow. Secrecy now; the trust only arrives if the contact
 *   is still cold when it returns (see `planDue`).
 * - institutional: spends influence for legal cover and calmer ties, at the
 *   price of institutional dependency and an investigation trace.
 * - operational: spends an extra action and covert resources for immediate
 *   intelligence, at the price of exposure on every actor involved.
 */
export const METHOD_NOW: Record<
  PlanMethod,
  {
    edge: Partial<Record<"trust" | "dependency" | "secrecy" | "tension", number>>;
    stats: Partial<Record<"etki" | "kara" | "bilgi" | "hukuk", number>>;
    heat: number;
    extraAction: number;
    actorHeat: number;
    dueIn: number;
  }
> = {
  quiet: { edge: { secrecy: 6, dependency: -4 }, stats: {}, heat: 0, extraAction: 0, actorHeat: 0, dueIn: 2 },
  institutional: {
    edge: { tension: -6, dependency: 6, secrecy: -4 },
    stats: { etki: -4, hukuk: -3 },
    heat: 3,
    extraAction: 0,
    actorHeat: 0,
    dueIn: 1,
  },
  operational: {
    edge: { dependency: 10, tension: 8, secrecy: -8 },
    stats: { kara: -4, bilgi: 6 },
    heat: 0,
    extraAction: 1,
    actorHeat: 1,
    dueIn: 1,
  },
};

/** A quiet contact burns when the investigation is hot or an actor is marked. */
export const QUIET_BURN_HEAT = 35;
export const QUIET_BURN_ACTOR_HEAT = 2;

function planEdges(state: GameState, nodeId?: string, edgeId?: string) {
  return EDGES.filter((e) =>
    edgeId ? e.id === edgeId : e.from === nodeId || e.to === nodeId,
  ).filter((e) => state.revealed[e.from] && state.revealed[e.to]);
}

export type PlanDue = {
  method: PlanMethod;
  outcome: "returned" | "burned" | "response" | "blowback" | "unavailable";
  edge: Partial<Record<"trust" | "dependency" | "secrecy" | "tension", number>>;
  stats: Partial<Record<"giz" | "hukuk", number>>;
  hostility: number;
  faction?: string;
  heat: number;
};

/**
 * The delayed half of an approach, evaluated against the state at the turn it
 * lands. `tickPlans` applies exactly this; the desk projects it.
 */
export function planDue(
  state: GameState,
  method: PlanMethod,
  nodeId?: string,
  edgeId?: string,
): PlanDue {
  const edges = planEdges(state, nodeId, edgeId);
  if (method === "quiet") {
    const targetEdge = edgeId ? EDGES.find(e => e.id === edgeId) : undefined;
    const actors = targetEdge ? [targetEdge.from, targetEdge.to] : nodeId ? [nodeId] : [];
    const unavailable = actors.some(id => NODES.find(n => n.id === id)?.kind === "kisi" &&
      (state.dead[id] || (state.actorMemory[id] ?? []).some(tag => ["spent", "abandoned", "promise-broken"].includes(tag))));
    if (unavailable) return { method, outcome: "unavailable", edge: {}, stats: {}, hostility: 0, heat: 0 };
    const burned =
      state.investigation.heat >= QUIET_BURN_HEAT ||
      actors.some((id) => (state.nodeHeat[id] ?? 0) >= QUIET_BURN_ACTOR_HEAT);
    return burned
      ? { method, outcome: "burned", edge: { trust: -4, secrecy: -6 }, stats: { giz: -3 }, hostility: 0, heat: 0 }
      : { method, outcome: "returned", edge: { trust: 5, tension: -3 }, stats: {}, hostility: 0, heat: 0 };
  }
  const actor = NODES.find((n) => n.id === (nodeId || edges[0]?.to));
  const faction = actor?.faction && state.factions[actor.faction] ? actor.faction : undefined;
  return method === "institutional"
    ? { method, outcome: "response", edge: { trust: 4, tension: 3 }, stats: { hukuk: -2 }, hostility: faction ? 2 : 0, faction, heat: 1 }
    : { method, outcome: "blowback", edge: { tension: 7, secrecy: -4 }, stats: {}, hostility: faction ? 5 : 0, faction, heat: 3 };
}

/** Sum a same-due group first; apply each affected field's bounds only once. */
function applyDue(state: GameState, arrivals: Array<{ plan: PendingPlan; due: PlanDue }>): GameState {
  const edges: Record<string, PlanDue["edge"]> = {};
  const statsDelta: PlanDue["stats"] = {};
  const hostility: Record<string, number> = {};
  let heat = 0;
  for (const { plan, due } of arrivals) {
    for (const e of planEdges(state, plan.nodeId, plan.edgeId)) {
      const delta = edges[e.id] ??= {};
      for (const [field, change] of Object.entries(due.edge)) {
        const key = field as keyof PlanDue["edge"];
        delta[key] = (delta[key] ?? 0) + (change ?? 0);
      }
    }
    for (const [field, change] of Object.entries(due.stats)) {
      const key = field as keyof PlanDue["stats"];
      statsDelta[key] = (statsDelta[key] ?? 0) + (change ?? 0);
    }
    if (due.faction) hostility[due.faction] = (hostility[due.faction] ?? 0) + due.hostility;
    heat += due.heat;
  }
  let next = state;
  for (const [id, delta] of Object.entries(edges)) next = touchEdge(next, id, delta);
  const bound = (n: number) => Math.max(0, Math.min(100, n));
  const stats = { ...next.stats };
  for (const [field, change] of Object.entries(statsDelta)) {
    const key = field as keyof PlanDue["stats"];
    stats[key] = bound(stats[key] + (change ?? 0));
  }
  const factions = { ...next.factions };
  for (const [id, delta] of Object.entries(hostility)) {
    const key = id as keyof typeof factions;
    factions[key] = { ...factions[key], hostility: bound(factions[key].hostility + delta) };
  }
  return { ...next, stats, factions, investigation: { ...next.investigation, heat: bound(next.investigation.heat + heat) } };
}

export function applyPlanConsequences(
  before: GameState,
  state: GameState,
  plan: PlannedAction,
): GameState {
  if (!plan.contextual || state.actionsLeft >= before.actionsLeft) return state;
  const target = plan.claimId ?? plan.edgeId ?? plan.nodeId;
  if (!target) return state;
  let next = { ...state, tags: [...state.tags, `plan-used:${state.turn}:${plan.id}:${target}`] };
  if (!plan.method) return next;
  const m = METHOD_NOW[plan.method];
  const edges = planEdges(before, plan.nodeId, plan.edgeId);
  const actors = plan.nodeId ? [plan.nodeId] : edges.flatMap((e) => [e.from, e.to]);
  for (const e of edges) next = touchEdge(next, e.id, m.edge);
  const stats = { ...next.stats };
  for (const [k, v] of Object.entries(m.stats))
    stats[k as "etki"] = Math.max(0, Math.min(100, stats[k as "etki"] + (v ?? 0)));
  next = {
    ...next,
    stats,
    actionsLeft: next.actionsLeft - m.extraAction,
    investigation: { ...next.investigation, heat: Math.min(100, next.investigation.heat + m.heat) },
  };
  if (m.actorHeat)
    next = {
      ...next,
      nodeHeat: {
        ...next.nodeHeat,
        ...Object.fromEntries(actors.map((id) => [id, (next.nodeHeat[id] ?? 0) + m.actorHeat])),
      },
    };
  // Existing schema-5 tags carry a deterministic callback; old saves and old
  // action replays remain valid. No extra random draw or historical assertion.
  const due = state.turn + m.dueIn;
  next = {
    ...next,
    tags: [
      ...next.tags,
      `plan-due:${due}:${plan.method}:${plan.nodeId ?? ""}:${plan.edgeId ?? ""}:${state.turn}`,
    ],
  };
  return next;
}

export type PendingPlan = {
  tag: string;
  due: number;
  method: PlanMethod;
  nodeId?: string;
  edgeId?: string;
  origin: number;
  label: string;
};

/** Schema-5 callback grammar, shared by save admission and runtime inspection. */
export function parsePlanTag(tag: unknown): PendingPlan | null {
  if (typeof tag !== "string" || !tag.startsWith("plan-due:")) return null;
  const parts = tag.split(":");
  if (parts.length !== 6) return null;
  const [, dueRaw, method, nodeId, edgeId, originRaw] = parts;
  if (!["quiet", "institutional", "operational"].includes(method)) return null;
  if (!/^\d+$/.test(dueRaw) || !/^\d+$/.test(originRaw)) return null;
  const due = Number(dueRaw), origin = Number(originRaw);
  if (!Number.isInteger(origin) || origin < 1 || origin > 10 || !Number.isInteger(due) || due <= origin || due > 12) return null;
  const node = nodeId ? NODES.find(n => n.id === nodeId) : undefined;
  const edge = edgeId ? EDGES.find(e => e.id === edgeId) : undefined;
  if ((!nodeId && !edgeId) || (nodeId && !node) || (edgeId && !edge)) return null;
  return { tag, due, method: method as PlanMethod, nodeId: nodeId || undefined,
    edgeId: edgeId || undefined, origin, label: node?.name ?? edge!.label };
}

export function pendingPlans(state: GameState): PendingPlan[] {
  return (Array.isArray(state.tags) ? state.tags : [])
    .map(parsePlanTag)
    .filter((p): p is PendingPlan => p !== null)
    .sort((a, b) => a.due - b.due);
}

export function tickPlans(state: GameState, notes: string[]): GameState {
  let next = state;
  const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  const duePlans = pendingPlans(state).filter(p => p.due <= state.turn).sort((a, b) =>
    a.due - b.due || a.origin - b.origin || lexical(a.method, b.method) || lexical(a.nodeId ?? "", b.nodeId ?? "") || lexical(a.edgeId ?? "", b.edgeId ?? ""));
  for (let i = 0; i < duePlans.length;) {
    const group: PendingPlan[] = [];
    const turn = duePlans[i].due;
    while (i < duePlans.length && duePlans[i].due === turn) group.push(duePlans[i++]);
    const arrivals = group.map(plan => ({ plan, due: planDue(next, plan.method, plan.nodeId, plan.edgeId) }));
    next = applyDue(next, arrivals);
    for (const { plan, due } of arrivals) notes.push(encodeNote(
      due.outcome === "unavailable" ? "note.plan.unavailable" : due.outcome === "burned" ? "note.plan.burned" : `note.plan.${plan.method}`,
      { target: plan.label, turn: plan.origin },
    ));
    next = { ...next, tags: next.tags.filter(tag => !group.some(plan => plan.tag === tag)) };
  }
  return next;
}
