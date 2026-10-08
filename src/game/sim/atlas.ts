import { ACTIONS, EDGES, NODES } from "../data.ts";
import { executeAction, isEdgeVisible, isNodeVisible } from "../engine.ts";
import type { GameState, PlannedAction } from "../types.ts";
import type { MoveDraft } from "../store.ts";
import { edgeSignal, propagationRisk } from "./edges.ts";
import { pendingPlans, planDue, planMethods, targetClaims, tickPlans } from "./planning.ts";
import { diffState, moveInput, previewMove, type Change } from "./preview.ts";

export const ATLAS_COLORS = {
  paper: "#d4c6a2",
  olive: "#a5b475",
  warn: "#e4ab70",
  muted: "#858a8e",
  risk: "#e18478",
  surface: "#17201c",
};

/** Match the desk's exact target and held-record choice. Drafts remain UI-only. */
export function atlasPlan(state: GameState, draft: MoveDraft | null): PlannedAction | null {
  if (!draft || draft.targetId !== (state.selectedEdgeId ?? state.selectedNodeId)) return null;
  const target = { kind: draft.targetKind, id: draft.targetId, label: "" };
  const claims = targetClaims(state, target).filter(
    (c) => state.hat !== "hukuk" || ["PARTIAL", "TRUE"].includes(state.hand[c.id].status),
  );
  const claim = claims.find((c) => c.id === draft.claimId) ?? claims[0];
  return {
    id: draft.id,
    contextual: true,
    method: planMethods(state, draft.id).length ? draft.method : undefined,
    claimId: ["hukuk", "arastirmaci"].includes(state.hat) ? claim?.id : undefined,
    ...(target.kind === "edge" ? { edgeId: target.id } : { nodeId: target.id }),
  };
}

/** Derived only: no RNG draws, persistence, historical edges or simulation rules. */
export function buildAtlas(state: GameState, plan: PlannedAction | null = null) {
  const nodeDefs = NODES.filter((n) => isNodeVisible(state, n.id));
  const nodeIds = new Set(nodeDefs.map((n) => n.id));
  const edgeDefs = EDGES.filter(
    (e) => isEdgeVisible(state, e.id) && nodeIds.has(e.from) && nodeIds.has(e.to),
  );
  const edgeIds = new Set(edgeDefs.map((e) => e.id));
  const visibleChange = (c: Change) =>
    c.kind === "edge" ? edgeIds.has(c.id) : c.kind === "node" ? nodeIds.has(c.id) : true;
  const safePlan =
    plan && (!plan.nodeId || nodeIds.has(plan.nodeId)) && (!plan.edgeId || edgeIds.has(plan.edgeId))
      ? plan
      : null;
  const preview = safePlan ? previewMove(state, safePlan) : null;
  const projected =
    safePlan && preview?.ok
      ? executeAction(structuredClone(moveInput(state, safePlan)), safePlan)
      : state;
  // Resolve only already-scheduled callbacks, under today's conditions. This is
  // explicitly not a forecast of random events / AI / the whole next turn.
  const nextReturn = tickPlans({ ...structuredClone(projected), turn: state.turn + 1 }, []);
  const nextChanges = diffState(projected, nextReturn).filter(visibleChange);
  const changes = preview?.changes.filter(visibleChange) ?? [];
  const pending = pendingPlans(projected)
    .filter(
      (p) =>
        Number.isFinite(p.due) &&
        ["quiet", "institutional", "operational"].includes(p.method) &&
        (p.edgeId ? edgeIds.has(p.edgeId) : Boolean(p.nodeId && nodeIds.has(p.nodeId))),
    )
    .map((p) => ({
      ...p,
      effect: planDue(projected, p.method, p.nodeId, p.edgeId),
      proposed: !state.tags.includes(p.tag),
    }));
  const nodes = nodeDefs.map((n) => ({
    ...n,
    selected: n.id === state.selectedNodeId,
    heat: state.nodeHeat[n.id] ?? 0,
    projectedHeat: projected.nodeHeat[n.id] ?? 0,
    dead: Boolean(state.dead[n.id]),
    color: n.kind === "koridor" ? ATLAS_COLORS.olive : ATLAS_COLORS.paper,
  }));
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edges = edgeDefs.map((e) => {
    const a = nodeMap.get(e.from)!;
    const b = nodeMap.get(e.to)!;
    const risk = propagationRisk(state, e.id);
    const afterRisk = propagationRisk(projected, e.id);
    const live = state.edgeLive[e.id];
    return {
      ...e,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      risk,
      afterRisk,
      nextRisk: propagationRisk(nextReturn, e.id),
      signal: live ? edgeSignal(live) : "stable",
      selected: e.id === state.selectedEdgeId,
      affected: changes.some((c) => c.kind === "edge" && c.id === e.id) || afterRisk !== risk,
      direct:
        safePlan?.edgeId === e.id ||
        Boolean(safePlan?.nodeId && (e.from === safePlan.nodeId || e.to === safePlan.nodeId)),
      dashed: e.evidence === "TARTIŞMALI" || e.evidence === "BOŞLUK",
      color:
        e.evidence === "BELGELİ"
          ? ATLAS_COLORS.paper
          : e.evidence === "GÜÇLÜ"
            ? ATLAS_COLORS.olive
            : e.evidence === "TARTIŞMALI"
              ? ATLAS_COLORS.warn
              : ATLAS_COLORS.muted,
      due: pending
        .filter(
          (p) =>
            p.edgeId === e.id || Boolean(p.nodeId && (p.nodeId === e.from || p.nodeId === e.to)),
        )
        .map((p) => p.due),
      live: live ? { ...live } : null,
    };
  });
  const minX = Math.min(0, ...nodes.map((n) => n.x - 90));
  const minY = Math.min(0, ...nodes.map((n) => n.y - 60));
  const width = Math.max(300, ...nodes.map((n) => n.x + 90)) - minX;
  const height = Math.max(270, ...nodes.map((n) => n.y + 65)) - minY;
  return {
    turn: state.turn,
    nodes,
    edges,
    bounds: { x: minX, y: minY, width, height },
    plan: safePlan,
    action: safePlan ? ACTIONS.find((a) => a.id === safePlan.id) : null,
    preview: preview ? { ...preview, changes } : null,
    pending,
    nextChanges,
    rewards: preview?.ok ? preview.rewards : [],
    changes,
  };
}
export type AtlasModel = ReturnType<typeof buildAtlas>;
