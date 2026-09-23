import {
  decisionOptions,
  targetClaims,
  planMethods,
  pendingPlans,
  planDue,
  type PlanMethod,
  type DecisionTarget,
} from "@/game/sim/planning";
import { ACTIONS, EDGES, NODES } from "@/game/data";
import {
  apFor,
  canPlay,
  isEdgeVisible,
  isNodeVisible,
  nodeById,
  onboardingHint,
} from "@/game/engine";
import { evidenceTone } from "@/game/evidence";
import { actLabel, mechanicUnlocked } from "@/game/sim/acts";
import { sourceUxFor } from "@/game/sim/authority";
import { edgeSignal, liveLine } from "@/game/sim/edges";
import { investigationView } from "@/game/sim/investigation";
import { theySeePlayer } from "@/game/sim/knowledge";
import { memoryLine } from "@/game/sim/memory";
import { visibleObjectives } from "@/game/sim/objectives";
import { SOURCE_BY_ID } from "@/game/db";
import { useGame } from "@/game/store";
import type { ActionId, GameState, PlannedAction } from "@/game/types";
import { previewMove } from "@/game/sim/preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  copyForAction,
  t,
  useLocale,
  nodeInteractive,
  edgeInteractive,
  logLine,
} from "@/game/i18n";
import { hatBlocks } from "@/game/sim/hats";
import { ClaimDrawer } from "./ClaimDrawer";
import { DueLine, MethodCompare, RiskRewardGrid } from "./OperationDesk";
import { dueSummary, rewardLine } from "./operation-copy";

export function SidePanel({ forceTab }: { forceTab?: "is" | "dosya" }) {
  const state = useGame((s) => s.state);
  const locale = useLocale((s) => s.locale);
  const [tab, setTab] = useState<"is" | "dosya">("is");
  const selectionKey = state ? `${state.selectedNodeId ?? ""}:${state.selectedEdgeId ?? ""}` : "";
  // Picking a node or edge on the map is a MAP SUMMARY click; the reader's
  // next question is "what is this / what can I do about it", which lives
  // in the Dosya tab below (PersonPane). Desktop keeps both panels on
  // screen at once but defaulted to the "İş" tab, so a selection here used
  // to go unnoticed unless the player thought to switch tabs by hand --
  // mobile already auto-opens its "kisi" pane on selection (see
  // store.ts's pickNode/pickEdge); this mirrors that for desktop.
  useEffect(() => {
    if (selectionKey) setTab("dosya");
  }, [selectionKey]);
  if (!state) return null;
  const activeTab = forceTab ?? (state.phase === "actions" ? tab : "dosya");
  const inv = investigationView(state);

  return (
    <aside className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto border-t border-border bg-surface p-3 sm:border-l sm:border-t-0 sm:p-4">
      <p className="font-mono text-[10px] text-olive">{actLabel(state, locale)}</p>
      {state.phase === "actions" && !forceTab ? (
        <div className="flex gap-1 rounded-sm border border-border bg-bg/40 p-0.5">
          {(
            [
              ["is", t(locale, "act.tabWork")],
              ["dosya", t(locale, "act.tabSel")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "min-h-10 flex-1 rounded-sm px-2 text-xs font-medium",
                tab === id ? "bg-elevated text-paper" : "text-muted hover:text-fg",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {activeTab === "dosya" ? <PersonPane /> : null}
      {state.phase === "actions" && activeTab === "is" ? <ActionBlock /> : null}
      {state.phase === "resolution" ? <ResolutionBlock /> : null}

      {mechanicUnlocked(state, "investigation") || inv.stage !== "dormant" ? (
        <div className="rounded-sm border border-border bg-bg/30 p-2">
          <p className="text-[11px] font-medium text-olive">
            {t(locale, "inv.title")} · {t(locale, `inv.${inv.stage}`)} · {t(locale, "inv.heat")}{" "}
            {inv.heat}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted">{t(locale, inv.why)}</p>
          {inv.raising.length ? (
            <p className="mt-1 text-[10px] text-stamp">
              {t(locale, "inv.raise")}: {inv.raising.map((k) => t(locale, k)).join(" · ")}
            </p>
          ) : null}
          {inv.lowering.length ? (
            <p className="text-[10px] text-olive">
              {t(locale, "inv.lower")}: {inv.lowering.map((k) => t(locale, k)).join(" · ")}
            </p>
          ) : null}
          {inv.options.length ? (
            <ul className="mt-1 space-y-0.5">
              {inv.options.slice(0, 3).map((o) => (
                <li key={o} className="text-[10px] text-subtle">
                  {t(locale, o)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="text-[11px] text-subtle">{t(locale, "inv.sleeping")}</p>
      )}

      <div className="mt-auto space-y-1 border-t border-border pt-3">
        <p className="text-xs text-subtle">
          {t(locale, "footer.evidence", {
            n: NODES.filter((n) => isNodeVisible(state, n.id)).length,
            total: NODES.length,
            e: EDGES.filter((e) => isEdgeVisible(state, e.id)).filter(
              (e) =>
                !["hukuk", "arastirmaci"].includes(state.hat) ||
                targetClaims(state, { kind: "edge", id: e.id, label: e.label }).some(
                  (c) =>
                    state.hat !== "hukuk" || ["PARTIAL", "TRUE"].includes(state.hand[c.id].status),
                ),
            ).length,
          })}
        </p>
      </div>
    </aside>
  );
}

export function PersonPane() {
  const state = useGame((s) => s.state);
  const feedback = useGame((s) => s.feedback);
  const claimId = useGame((s) => s.claimId);
  const setClaimId = useGame((s) => s.setClaimId);
  const locale = useLocale((s) => s.locale);
  if (!state) return null;
  const node = state.selectedNodeId ? nodeById(state.selectedNodeId) : null;
  const visible = node ? isNodeVisible(state, node.id) : false;
  const edge = state.selectedEdgeId ? EDGES.find((e) => e.id === state.selectedEdgeId) : null;
  const live = edge ? state.edgeLive[edge.id] : null;
  const src = node?.sourceIds[0] ? SOURCE_BY_ID[node.sourceIds[0]] : undefined;
  const ux = node
    ? sourceUxFor({
        layer: "sourceClaim",
        evidence: node.evidence,
        contradiction: node.sourceClaim,
      })
    : [];
  const ni = node ? nodeInteractive(state, node.id, locale) : null;
  const ei = edge ? edgeInteractive(state, edge.id, locale) : null;

  if (edge && live && (!node || state.selectedEdgeId)) {
    return (
      <div className="target-pane p-3 lg:p-0">
        <div className="target-strip sticky top-0 z-10 bg-surface/95 pb-2">
          <p className="scan font-mono text-[10px] text-olive">{t(locale, "map.edge")}</p>
          <h2 className="mt-1 text-lg font-medium text-fg">{edge.label}</h2>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge tone={evidenceTone(edge.evidence)}>
              {t(locale, `evidence.${edge.evidence}.label`)}
            </Badge>
          </div>
          <p className="decision-context">{ei?.why ?? edge.source}</p>
        </div>
        {feedback ? <OutcomeCard copy={feedback} /> : null}
        {state.phase === "actions" ? (
          <ContextualDecisions
            state={state}
            target={{ kind: "edge", id: edge.id, label: edge.label }}
          />
        ) : null}
        <details className="file-fold mt-3 rounded-sm border border-border bg-bg/40 p-2">
          <summary className="cursor-pointer text-xs text-olive">{t(locale, "map.file")}</summary>
          <dl className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
            <div>
              <dt className="text-paper">{t(locale, "map.edgeWhat")}</dt>
              <dd>{ei?.what ?? edge.label}</dd>
            </div>
            <div>
              <dt className="text-paper">{t(locale, "map.edgeWhy")}</dt>
              <dd>{ei?.why ?? edge.source}</dd>
            </div>
            <div>
              <dt className="text-paper">{t(locale, "map.edgeTrust")}</dt>
              <dd>{ei?.trust ?? liveLine(live, locale)}</dd>
            </div>
            <div>
              <dt className="text-paper">{t(locale, "map.edgeGain")}</dt>
              <dd>{ei?.gain}</dd>
            </div>
            <div>
              <dt className="text-paper">{t(locale, "map.edgeRisk")}</dt>
              <dd>{ei?.risk}</dd>
            </div>
          </dl>
        </details>
      </div>
    );
  }

  return (
    <div className="target-pane p-3 lg:p-0">
      <p className="scan font-mono text-[10px] text-olive">{t(locale, "map.selected")}</p>
      {visible && node ? (
        <>
          <div className="target-strip sticky top-0 z-10 bg-surface/95 pb-2">
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-medium text-fg">{node.name}</h2>
              <Badge tone={evidenceTone(node.evidence)}>
                {t(locale, `evidence.${node.evidence}.label`)}
              </Badge>
              <Badge>
                {node.kind === "kisi"
                  ? t(locale, "map.person")
                  : node.kind === "kurum"
                    ? t(locale, "map.org")
                    : t(locale, "map.corridor")}
              </Badge>
              {state.dead[node.id] ? <Badge tone="stamp">{t(locale, "map.closed")}</Badge> : null}
            </div>
            <p className="decision-context">{ni?.why ?? node.role}</p>
            {state.actorMemory[node.id]?.length ? (
              <p className="mt-1 rounded-sm border border-olive/40 bg-olive/10 px-2 py-1.5 text-xs leading-snug text-paper">
                {memoryLine(state, node.id, locale)}
              </p>
            ) : null}
          </div>
          {feedback ? <OutcomeCard copy={feedback} /> : null}
          {state.phase === "actions" ? (
            <ContextualDecisions
              state={state}
              target={{ kind: "node", id: node.id, label: node.name }}
            />
          ) : null}
          <div className="agenda-fronts mt-3">
            {EDGES.filter(
              (e) => (e.from === node.id || e.to === node.id) && isEdgeVisible(state, e.id),
            )
              .slice(0, 3)
              .map((e) => (
                <button key={e.id} type="button" onClick={() => useGame.getState().pickEdge(e.id)}>
                  {e.label}{" "}
                  <small>
                    {locale === "tr" ? "Bağı incele ve karar ver" : "Inspect connection and decide"}
                  </small>
                </button>
              ))}
          </div>
          <details className="file-fold mt-3 rounded-sm border border-border bg-bg/40 p-2">
            <summary className="cursor-pointer text-xs text-olive">{t(locale, "map.file")}</summary>
            <dl className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
              <div>
                <dt className="text-paper">{t(locale, "map.who")}</dt>
                <dd>{ni?.who ?? node.name}</dd>
              </div>
              <div>
                <dt className="text-paper">{t(locale, "map.why")}</dt>
                <dd>{ni?.why ?? node.role}</dd>
              </div>
              <div>
                <dt className="text-paper">{t(locale, "map.youKnow")}</dt>
                <dd>{ni?.youKnow}</dd>
              </div>
              <div>
                <dt className="text-paper">{t(locale, "map.theySee")}</dt>
                <dd>{ni?.theySee ?? theySeePlayer(state, node.id, locale)}</dd>
              </div>
              <div>
                <dt className="text-paper">{t(locale, "map.evidence")}</dt>
                <dd>
                  {t(locale, `evidence.${node.evidence}.label`)} ·{" "}
                  {src ? `${src.title}${src.location ? ` · ${src.location}` : ""}` : node.source}
                </dd>
              </div>
            </dl>
            <div className="mt-2 flex flex-wrap gap-1">
              {ux.slice(0, 3).map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
              {node.sourceIds[0] ? (
                <button
                  type="button"
                  className="rounded-sm border border-border px-1.5 py-0.5 text-[10px] text-olive"
                  onClick={() =>
                    setClaimId(node.researchId.startsWith("clm_") ? node.researchId : null)
                  }
                >
                  {t(locale, "claim.title")}
                </button>
              ) : null}
            </div>
            {node.sourceIds.length ? (
              <button
                type="button"
                className="mt-2 w-full rounded-sm border border-border bg-bg/40 px-2 py-2 text-left text-[11px] text-olive"
                onClick={() => {
                  const related = Object.keys(state.hand).find((id) => id.startsWith("clm_"));
                  setClaimId(related ?? "clm_jitem_exists");
                }}
              >
                {t(locale, "claim.title")}
              </button>
            ) : null}
            {claimId ? (
              <div className="mt-2">
                <ClaimDrawer claimId={claimId} onClose={() => setClaimId(null)} />
              </div>
            ) : null}
            <dl className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
              <div>
                <dt className="text-paper">{t(locale, "map.hist")}</dt>
                <dd>{node.historicalFact}</dd>
              </div>
              <div>
                <dt className="text-paper">{t(locale, "map.claim")}</dt>
                <dd>{node.sourceClaim}</dd>
              </div>
              <div>
                <dt className="text-paper">{t(locale, "map.recon")}</dt>
                <dd>{node.gameReconstruction}</dd>
              </div>
            </dl>
          </details>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted">{t(locale, "map.pick")}</p>
      )}
    </div>
  );
}

function ActionBlock() {
  const state = useGame((s) => s.state)!;
  const resolve = useGame((s) => s.resolve);
  const feedback = useGame((s) => s.feedback);
  const locale = useLocale((s) => s.locale);
  const max = apFor(state.hat);
  const spent = max - state.actionsLeft;
  const hintKey = onboardingHint(state);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-paper">{t(locale, "decision.agenda")}</p>
        <p className="tabular text-xs text-muted">
          {t(locale, "act.left", { n: state.actionsLeft, max })}
        </p>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-elevated">
        <div
          className="h-full bg-olive"
          style={{ width: `${Math.round((state.actionsLeft / max) * 100)}%` }}
        />
      </div>
      <p className="text-xs leading-relaxed text-subtle">
        {hintKey ? t(locale, hintKey) : t(locale, `hat.${state.hat}.body`)}
      </p>
      {feedback ? <OutcomeCard copy={feedback} /> : null}
      {visibleObjectives(state).filter((o) => o.status === "open" && !o.secret).length ? (
        <ul className="space-y-1 rounded-sm border border-border bg-bg/30 p-2">
          {visibleObjectives(state)
            .filter((o) => o.status === "open")
            .slice(0, 3)
            .map((o) => (
              <li key={o.id} className="flex justify-between gap-2 text-[11px] text-muted">
                <span>{t(locale, `obj.${o.id}`)}</span>
                <span className="shrink-0 font-mono text-[10px] text-olive">{rewardLine(o.id, locale)}</span>
              </li>
            ))}
        </ul>
      ) : null}

      <div className="agenda-fronts">
        {EDGES.filter((e) => isEdgeVisible(state, e.id))
          .filter(
            (e) =>
              !["hukuk", "arastirmaci"].includes(state.hat) ||
              targetClaims(state, { kind: "edge", id: e.id, label: e.label }).some(
                (c) =>
                  state.hat !== "hukuk" || ["PARTIAL", "TRUE"].includes(state.hand[c.id].status),
              ),
          )
          .sort(
            (a, b) => (state.edgeLive[b.id]?.tension ?? 0) - (state.edgeLive[a.id]?.tension ?? 0),
          )
          .slice(0, 3)
          .map((e) => (
            <button type="button" key={e.id} onClick={() => useGame.getState().pickEdge(e.id)}>
              <span>{e.label}</span>
              <small>
                {
                  {
                    stable: locale === "tr" ? "Temas fırsatı" : "Contact opportunity",
                    pressure: locale === "tr" ? "Baskı hattı" : "Pressure front",
                    fragile: locale === "tr" ? "Kırılgan bağlantı" : "Fragile connection",
                    hot: locale === "tr" ? "İz bırakıyor" : "Exposed connection",
                    sealed: locale === "tr" ? "Korunan koridor" : "Protected corridor",
                  }[edgeSignal(state.edgeLive[e.id])]
                }
              </small>
            </button>
          ))}
      </div>
      <div className="rounded-sm border border-olive/40 bg-olive/10 p-3 text-xs leading-relaxed text-paper">
        <p className="font-medium">{t(locale, "decision.pickTarget")}</p>
        <p className="mt-1 text-muted">{t(locale, "decision.pickTargetHint")}</p>
      </div>

      <Button
        variant={state.actionsLeft === 0 ? "default" : "outline"}
        className="w-full"
        onClick={resolve}
        disabled={spent < 1}
      >
        {t(locale, "act.resolve")}
      </Button>
    </div>
  );
}

/** What the people on this target remember of you, if anything. */
function memoryFor(state: GameState, target: DecisionTarget, locale: "tr" | "en") {
  const edge = target.kind === "edge" ? EDGES.find((e) => e.id === target.id) : null;
  const ids = edge ? [edge.from, edge.to] : [target.id];
  return ids
    .filter((id) => state.actorMemory[id]?.length)
    .map((id) => `${NODES.find((n) => n.id === id)?.name ?? id} — ${memoryLine(state, id, locale)}`)
    .join(" ")
    .trim();
}

function ContextualDecisions({ state, target }: { state: GameState; target: DecisionTarget }) {
  const play = useGame((s) => s.play);
  const locale = useLocale((s) => s.locale);
  // The chosen move lives in the store so it survives pane and tab switches;
  // it only applies while this is the target it was chosen for.
  const draft = useGame((s) => s.move);
  const setMove = useGame((s) => s.setMove);
  const [claimId, setClaimId] = useState("");
  const selected: ActionId | null = draft && draft.targetId === target.id ? draft.id : null;
  const method: PlanMethod = selected ? draft!.method : "quiet";
  const setSelected = (id: ActionId | null) =>
    setMove(id ? { id, targetKind: target.kind, targetId: target.id, method: "quiet" } : null);
  const setMethod = (m: PlanMethod) => {
    if (draft) setMove({ ...draft, method: m });
  };
  const claims = targetClaims(state, target).filter(
    (c) => state.hat !== "hukuk" || ["PARTIAL", "TRUE"].includes(state.hand[c.id].status),
  );
  const boundClaim = claims.find((c) => c.id === claimId) ?? claims[0];
  const evidenceHat = state.hat === "hukuk" || state.hat === "arastirmaci";
  const tr = locale === "tr";

  const actions = decisionOptions(state, target, boundClaim?.id).filter(
    (id) => !hatBlocks(state.hat, id),
  );
  const chosen = selected ? ACTIONS.find((action) => action.id === selected) : null;
  const copy = selected ? copyForAction(selected, locale, state) : null;
  const methods = selected ? planMethods(state, selected) : [];
  const available = selected
    ? actions.includes(selected) &&
      canPlay(state, selected) &&
      (!methods.length || methods.includes(method)) &&
      (method !== "operational" || state.actionsLeft >= (chosen?.ap ?? 1) + 1)
    : false;

  const plan: PlannedAction | null = selected
    ? {
        id: selected,
        contextual: true,
        method: methods.length ? method : undefined,
        claimId: evidenceHat ? boundClaim?.id : undefined,
        ...(target.kind === "edge" ? { edgeId: target.id } : { nodeId: target.id }),
      }
    : null;
  const preview = plan && available ? previewMove(state, plan) : null;
  const commit = () => {
    if (!plan || !available) return;
    play(plan);
  };
  const openObjective = visibleObjectives(state).find((o) => o.status === "open" && !o.secret);

  return (
    <section
      className="decision-desk mt-3 space-y-2 rounded-sm border border-olive/40 bg-bg/45 p-2.5"
      aria-label={t(locale, "decision.title")}
    >
      <p className="scan font-mono text-[10px] text-olive">{t(locale, "decision.title")}</p>
      {openObjective ? (
        <p className="text-[11px] leading-snug text-muted">
          <span className="text-olive">{t(locale, "decision.openObj")}:</span>{" "}
          {t(locale, `obj.${openObjective.id}`)} · {rewardLine(openObjective.id, locale)}
        </p>
      ) : null}
      {selected && chosen ? (
        <div className="selected-move flex items-center justify-between gap-2 rounded-sm border border-olive bg-olive/15 px-2 py-1.5 text-xs">
          <span className="min-w-0">
            <span className="text-olive">{t(locale, "move.selected")}:</span>{" "}
            <span className="font-medium text-fg">{copy?.verb ?? copy?.label}</span>
          </span>
          <button
            type="button"
            className="min-h-8 shrink-0 rounded-sm border border-border px-2 text-[11px] text-muted"
            onClick={() => setSelected(null)}
          >
            {t(locale, "move.clear")}
          </button>
        </div>
      ) : null}
      <p className="text-xs text-paper">
        <span className="text-olive">{t(locale, "decision.target")}:</span> {target.label}
      </p>
      <p className="decision-context">
        {evidenceHat
          ? tr
            ? "Önce kaydı seç. Sonra bu kaydı nasıl işleyeceğine karar ver."
            : "Choose the record, then decide how to handle it."
          : (state.nodeHeat[target.id] ?? 0) > 0
            ? tr
              ? "Bu hedef iz bırakıyor. Koruma, erişim ve geri çekilme arasında karar ver."
              : "This target is leaving a trail. Weigh protection, access and withdrawal."
            : tr
              ? "Bağın neye ihtiyacı var? Temas kur, koru veya bilgi için riske gir."
              : "What does this connection need? Establish contact, protect it or risk it for information."}
      </p>
      {evidenceHat && claims.length ? (
        <label className="block text-xs text-paper">
          {tr ? "Çalışılacak kayıt" : "Working record"}
          <select
            className="plan-record"
            value={boundClaim?.id}
            onChange={(e) => {
              setClaimId(e.target.value);
              setSelected(null);
            }}
          >
            {claims.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} · {state.hand[c.id].status}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {!actions.length ? (
        <p className="text-xs text-muted">
          {tr
            ? "Bu hedef için yeni bir uygulanabilir hamle yok. Başka bir bağ veya kaynak seç; ya da turu sonuçlandır."
            : "No new actionable move on this target. Select another connection or source, or resolve the turn."}
        </p>
      ) : null}
      <div className="grid gap-1.5">
        {actions.map((id) => {
          const actionCopy = copyForAction(id, locale, state);
          const active = selected === id;
          return (
            <button
              key={id}
              type="button"
              disabled={!canPlay(state, id)}
              aria-pressed={active}
              onClick={() => setSelected(active ? null : id)}
              className={cn(
                "min-h-11 rounded-sm border px-2 py-2 text-left text-xs",
                active
                  ? "border-olive bg-olive/15"
                  : "border-border bg-bg/40 hover:border-olive/50",
                !canPlay(state, id) && "opacity-40",
              )}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-fg">{actionCopy.verb ?? actionCopy.label}</span>
                <span className="font-mono text-[10px] text-olive">
                  {ACTIONS.find((a) => a.id === id)?.ap}
                </span>
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                {actionCopy.shortExplanation}
              </span>
            </button>
          );
        })}
      </div>
      {copy && chosen && plan ? (
        <div className="space-y-2 border-t border-border pt-2 text-[11px] leading-snug">
          <p className="text-paper">
            <span className="text-olive">{t(locale, "decision.intent")}:</span> {copy.whyItMatters}
          </p>
          {memoryFor(state, target, locale) ? (
            <p className="op-memory text-muted">
              <span className="text-olive">{tr ? "Aktör hafızası" : "Actor memory"}:</span>{" "}
              {memoryFor(state, target, locale)}
            </p>
          ) : null}
          {methods.length ? (
            <MethodCompare
              state={state}
              plan={plan}
              methods={methods}
              method={method}
              onPick={setMethod}
              locale={locale}
              blocked={(m) =>
                !canPlay(state, selected!) ||
                (m === "operational" && state.actionsLeft < (chosen?.ap ?? 1) + 1)
              }
            />
          ) : null}
          <div className="move-preview space-y-1.5 rounded-sm border border-olive/40 bg-bg/50 p-2">
            <p className="scan font-mono text-[10px] text-olive">
              {t(locale, "move.previewTitle")}
            </p>
            {preview?.ok ? (
              <>
                <RiskRewardGrid preview={preview} locale={locale} />
                <DueLine preview={preview} state={state} locale={locale} />
                {preview.rewards.map((id) => (
                  <p key={id} className="op-reward rounded-sm bg-olive/10 px-2 py-1 text-paper">
                    <span className="font-mono text-[10px] text-olive">
                      {tr ? "HEDEF TAMAMLANIR" : "OBJECTIVE COMPLETES"}
                    </span>{" "}
                    {t(locale, `obj.${id}`)} · {rewardLine(id, locale)}
                  </p>
                ))}
              </>
            ) : (
              <p className="text-[11px] text-warn">{t(locale, "move.previewBlocked")}</p>
            )}
            {copy.uncertainty ? (
              <p className="text-warn">
                <span className="text-olive">{t(locale, "decision.uncertainty")}:</span>{" "}
                {copy.uncertainty}
              </p>
            ) : null}
            <p className="text-[10px] leading-snug text-subtle">{t(locale, "move.previewNote")}</p>
          </div>
          <Button className="mt-1 w-full" disabled={!available || !preview?.ok} onClick={commit}>
            {t(locale, "decision.commit")}
          </Button>
        </div>
      ) : null}
      {state.actionsLeft < apFor(state.hat) ? (
        <Button variant="outline" className="w-full" onClick={() => useGame.getState().resolve()}>
          {t(locale, "act.resolve")}
        </Button>
      ) : null}
    </section>
  );
}

/** "Label:" unless the label is already a question. */
const label = (text: string) => (/[?:]$/.test(text) ? text : `${text}:`);

function OutcomeCard({ copy }: { copy: ReturnType<typeof copyForAction> }) {
  const state = useGame((s) => s.state);
  const locale = useLocale((s) => s.locale);
  const lastResult = useGame((s) => s.lastResult);
  const tr = locale === "tr";
  const pending = state ? pendingPlans(state) : [];
  return (
    <div className="op-outcome mt-3 space-y-2 rounded-sm border border-olive/40 bg-olive/10 p-2.5 text-xs leading-snug">
      <p className="scan font-mono text-[10px] text-olive">{t(locale, "decision.after")}</p>
      <p className="text-paper">
        <span className="text-olive">{label(t(locale, "decision.happened"))}</span>{" "}
        {copy.resultExplanation}
      </p>
      {lastResult && lastResult.turn === state?.turn ? (
        <div className="space-y-1">
          <p className="text-olive">{t(locale, "move.resultTitle")}</p>
          <RiskRewardGrid
            preview={{ ok: true, changes: lastResult.changes, rewards: [], due: null }}
            locale={locale}
          />
        </div>
      ) : null}
      <p className="text-warn">
        <span className="text-olive">{label(t(locale, "decision.watch"))}</span> {copy.nextSuggestion}
      </p>
      {state && pending.length ? (
        <div className="op-pending border-t border-border pt-2">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-olive">
            {tr ? "Yolda olan sonuçlar" : "Consequences on the way"}
          </p>
          <ul className="grid gap-1">
            {pending.map((p) => {
              const due = dueSummary(planDue(state, p.method, p.nodeId, p.edgeId), locale);
              return (
                <li key={p.tag} className="rounded-sm bg-bg/50 px-2 py-1 text-[11px]">
                  <span className="font-mono text-[10px] text-olive">
                    {p.due}. {tr ? "tur" : "turn"}
                  </span>{" "}
                  <span className="text-paper">{p.label}</span> — {due.head}
                  {due.parts.length ? `: ${due.parts.join(" · ")}` : ""}
                </li>
              );
            })}
          </ul>
          <p className="mt-1 text-[10px] text-subtle">
            {tr
              ? "Bugünkü koşullarla hesaplanır; ısı ve iz değişirse sonuç da değişir."
              : "Projected under today's conditions; if heat or trail changes, so does the outcome."}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ResolutionBlock() {
  const state = useGame((s) => s.state)!;
  const nextTurn = useGame((s) => s.nextTurn);
  const locale = useLocale((s) => s.locale);
  return (
    <div className="space-y-2 rounded-md border border-border bg-bg/50 p-3">
      <p className="text-sm font-medium text-paper">{t(locale, "res.step")}</p>
      <p className="text-[11px] text-olive">{t(locale, "res.what")}</p>
      <ul className="space-y-1.5">
        {state.lastResolution.map((n, i) => (
          <li key={i} className="text-xs leading-relaxed text-muted">
            {logLine(locale, n)}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-subtle">{t(locale, "res.whyYou")}</p>
      <Button className="w-full" onClick={nextTurn}>
        {t(locale, "res.next")}
      </Button>
    </div>
  );
}
