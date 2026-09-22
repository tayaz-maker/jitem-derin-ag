import { EDGES, NODES } from "../data.ts";
import { ALL_CLAIMS } from "../db/catalog.ts";
import type { ActionId, GameState, PlannedAction } from "../types.ts";
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
      ? ["kanit_esigi", "soru_yonlendir", "soru_sinir"]
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
  const edges = EDGES.filter((e) =>
    plan.edgeId ? e.id === plan.edgeId : e.from === plan.nodeId || e.to === plan.nodeId,
  ).filter((e) => before.revealed[e.from] && before.revealed[e.to]);
  const actors = plan.nodeId ? [plan.nodeId] : edges.flatMap((e) => [e.from, e.to]);
  for (const e of edges)
    next = touchEdge(
      next,
      e.id,
      plan.method === "quiet"
        ? { secrecy: 6, dependency: -4 }
        : plan.method === "institutional"
          ? { tension: -6, dependency: 6, secrecy: -4 }
          : { dependency: 10, tension: 8, secrecy: -8 },
    );
  if (plan.method === "institutional")
    next = {
      ...next,
      stats: { ...next.stats, etki: Math.max(0, next.stats.etki - 4) },
      investigation: { ...next.investigation, heat: Math.min(100, next.investigation.heat + 3) },
    };
  if (plan.method === "operational")
    next = {
      ...next,
      actionsLeft: next.actionsLeft - 1,
      stats: { ...next.stats, kara: Math.max(0, next.stats.kara - 4) },
      nodeHeat: {
        ...next.nodeHeat,
        ...Object.fromEntries(actors.map((id) => [id, (next.nodeHeat[id] ?? 0) + 1])),
      },
    };
  // Existing schema-5 tags carry a deterministic callback; old saves and old
  // action replays remain valid. No extra random draw or historical assertion.
  const due = state.turn + (plan.method === "quiet" ? 2 : 1);
  next = {
    ...next,
    tags: [
      ...next.tags,
      `plan-due:${due}:${plan.method}:${plan.nodeId ?? ""}:${plan.edgeId ?? ""}:${state.turn}`,
    ],
  };
  return next;
}
export function tickPlans(state: GameState, notes: string[]): GameState {
  let next = state;
  for (const tag of state.tags.filter((t) => t.startsWith("plan-due:"))) {
    const [, due, method, nodeId, edgeId, origin] = tag.split(":");
    if (Number(due) > state.turn) continue;
    const edges = EDGES.filter((e) =>
      edgeId ? e.id === edgeId : e.from === nodeId || e.to === nodeId,
    ).filter((e) => next.revealed[e.from] && next.revealed[e.to]);
    for (const e of edges)
      next = touchEdge(
        next,
        e.id,
        method === "quiet"
          ? { trust: 5, tension: -3 }
          : method === "institutional"
            ? { trust: 4, tension: 3 }
            : { tension: 7, secrecy: -4 },
      );
    if (method !== "quiet") {
      const actor = NODES.find((n) => n.id === (nodeId || edges[0]?.to));
      const faction = actor?.faction;
      if (faction && next.factions[faction])
        next = {
          ...next,
          factions: {
            ...next.factions,
            [faction]: {
              ...next.factions[faction],
              hostility: Math.min(
                100,
                next.factions[faction].hostility + (method === "operational" ? 5 : 2),
              ),
            },
          },
        };
      next = {
        ...next,
        investigation: {
          ...next.investigation,
          heat: Math.min(100, next.investigation.heat + (method === "operational" ? 3 : 1)),
        },
      };
    }
    notes.push(
      encodeNote(`note.plan.${method}`, {
        target:
          NODES.find((n) => n.id === nodeId)?.name ??
          EDGES.find((e) => e.id === edgeId)?.label ??
          edgeId,
        turn: origin,
      }),
    );
    next = { ...next, tags: next.tags.filter((t) => t !== tag) };
  }
  return next;
}
