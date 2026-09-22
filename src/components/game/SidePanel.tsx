import { ACTION_GROUPS, ACTIONS, EDGES, NODES } from "@/game/data";
import {
  apFor,
  canPlay,
  isEdgeVisible,
  isNodeVisible,
  nodeById,
  onboardingHint,
} from "@/game/engine";
import { evidenceTone } from "@/game/evidence";
import { actOf, actLabel, mechanicUnlocked } from "@/game/sim/acts";
import { sourceUxFor } from "@/game/sim/authority";
import { liveLine } from "@/game/sim/edges";
import { investigationView } from "@/game/sim/investigation";
import { theySeePlayer } from "@/game/sim/knowledge";
import { memoryLine } from "@/game/sim/memory";
import { visibleObjectives } from "@/game/sim/objectives";
import { SOURCE_BY_ID } from "@/game/db";
import { useGame } from "@/game/store";
import type { ActionGroup, ActionId, Faction } from "@/game/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { copyForAction, t, useLocale, nodeInteractive, edgeInteractive, logLine } from "@/game/i18n";
import { hatBlocks } from "@/game/sim/hats";
import { ExplainCard } from "./ExplainCard";
import { ClaimDrawer } from "./ClaimDrawer";

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
            {t(locale, "inv.title")} · {t(locale, `inv.${inv.stage}`)} · {t(locale, "inv.heat")} {inv.heat}
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
            e: EDGES.filter((e) => isEdgeVisible(state, e.id)).length,
          })}
        </p>
      </div>
    </aside>
  );
}

export function PersonPane() {
  const state = useGame((s) => s.state);
  const play = useGame((s) => s.play);
  const armAction = useGame((s) => s.armAction);
  const claimId = useGame((s) => s.claimId);
  const setClaimId = useGame((s) => s.setClaimId);
  const locale = useLocale((s) => s.locale);
  if (!state) return null;
  const node = state.selectedNodeId ? nodeById(state.selectedNodeId) : null;
  const visible = node ? isNodeVisible(state, node.id) : false;
  const edge = state.selectedEdgeId ? EDGES.find((e) => e.id === state.selectedEdgeId) : null;
  const live = edge ? state.edgeLive[edge.id] : null;
  const src = node?.sourceIds[0] ? SOURCE_BY_ID[node.sourceIds[0]] : undefined;
  const ux = node ? sourceUxFor({ layer: "sourceClaim", evidence: node.evidence, contradiction: node.sourceClaim }) : [];
  const ni = node ? nodeInteractive(state, node.id, locale) : null;
  const ei = edge ? edgeInteractive(state, edge.id, locale) : null;

  if (edge && live && (!node || state.selectedEdgeId)) {
    return (
      <div className="p-3 lg:p-0">
        <p className="scan font-mono text-[10px] text-olive">{t(locale, "map.edge")}</p>
        <h2 className="mt-1 text-lg font-medium text-fg">{edge.label}</h2>
        <div className="mt-1 flex flex-wrap gap-1">
          <Badge tone={evidenceTone(edge.evidence)}>{t(locale, `evidence.${edge.evidence}.label`)}</Badge>
        </div>
        <dl className="mt-3 space-y-1.5 text-xs leading-relaxed text-muted">
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
        {state.phase === "actions" ? (
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {(
              [
                "bag_guclendir",
                "bag_gevset",
                "bag_gozet",
                "bag_arabul",
                "bag_yalitim",
                "bag_ifsa",
                "bag_koru",
              ] as ActionId[]
            ).map((id) => {
              const copy = copyForAction(id, locale, state);
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!canPlay(state, id)}
                  onClick={() => play({ id, edgeId: edge.id })}
                  className="min-h-11 rounded-sm border border-border bg-bg/40 px-2 py-2 text-left text-xs disabled:opacity-40"
                >
                  <span className="block font-medium text-fg">{copy.verb ?? copy.label}</span>
                  <span className="text-[10px] text-muted">{copy.expectedEffect}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="p-3 lg:p-0">
      <p className="scan font-mono text-[10px] text-olive">{t(locale, "map.selected")}</p>
      {visible && node ? (
        <>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-medium text-fg">{node.name}</h2>
            <Badge tone={evidenceTone(node.evidence)}>{t(locale, `evidence.${node.evidence}.label`)}</Badge>
            <Badge>
              {node.kind === "kisi" ? t(locale, "map.person") : node.kind === "kurum" ? t(locale, "map.org") : t(locale, "map.corridor")}
            </Badge>
            {state.dead[node.id] ? <Badge tone="stamp">{t(locale, "map.closed")}</Badge> : null}
          </div>
          {state.actorMemory[node.id]?.length ? (
            // Promoted out of the dl and given its own callout: this is the
            // concrete "your earlier decision changed what happens here"
            // signal (action -> consequence -> delayed callback). Burying
            // it as one more flat dl row among five made it easy to miss
            // exactly where a player most needs to feel continuity.
            <p className="mt-2 rounded-sm border border-olive/40 bg-olive/10 px-2 py-1.5 text-xs leading-snug text-paper">
              {memoryLine(state, node.id, locale)}
            </p>
          ) : null}
          <dl className="mt-3 space-y-1.5 text-xs leading-relaxed text-muted">
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
                {t(locale, `evidence.${node.evidence}.label`)} · {src ? `${src.title}${src.location ? ` · ${src.location}` : ""}` : node.source}
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
                onClick={() => setClaimId(node.researchId.startsWith("clm_") ? node.researchId : null)}
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
          {claimId ? <div className="mt-2"><ClaimDrawer claimId={claimId} onClose={() => setClaimId(null)} /></div> : null}
          <details className="mt-3 rounded-sm border border-border bg-bg/40 p-2">
            <summary className="cursor-pointer text-xs text-olive">{t(locale, "map.layers")}</summary>
            <dl className="mt-2 space-y-2 text-xs leading-relaxed text-muted">
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
          {state.phase === "actions" && node.kind === "kisi" ? (
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {(["kisi_koru", "kisi_kullan", "kisi_harca", "kisi_mesafe"] as ActionId[]).map((id) => {
                const copy = copyForAction(id, locale, state);
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!canPlay(state, id) || hatBlocks(state.hat, id)}
                    onClick={() => (canPlay(state, id) ? play({ id, nodeId: node.id }) : armAction(id))}
                    className="min-h-11 rounded-sm border border-border bg-bg/40 px-2 py-2 text-left text-xs disabled:opacity-40"
                  >
                    <span className="block font-medium text-fg">{copy.verb ?? copy.label}</span>
                    <span className="text-[10px] text-muted">{copy.expectedEffect}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-sm text-muted">{t(locale, "map.pick")}</p>
      )}
    </div>
  );
}

function ActionBlock() {
  const state = useGame((s) => s.state)!;
  const armAction = useGame((s) => s.armAction);
  const play = useGame((s) => s.play);
  const resolve = useGame((s) => s.resolve);
  const feedback = useGame((s) => s.feedback);
  const locale = useLocale((s) => s.locale);
  const defaultGroup: ActionGroup =
    state.turn === 1
      ? "ag"
      : state.turn === 2
        ? "kisi"
        : state.turn === 3
          ? "bilgi"
          : state.hat === "idari" || state.hat === "hukuk"
            ? "koruma"
            : state.hat === "arastirmaci"
              ? "bilgi"
              : "saha";
  const [group, setGroup] = useState<ActionGroup>(defaultGroup);
  const [focus, setFocus] = useState<ActionId | null>(null);
  const max = apFor(state.hat);
  const spent = max - state.actionsLeft;
  const act = actOf(state.turn);
  const hintKey = onboardingHint(state);

  const onAction = (id: ActionId) => {
    const def = ACTIONS.find((a) => a.id === id);
    if (!def || !canPlay(state, id)) return;
    setFocus(id);
    if (def.needs === "none") {
      play({ id });
      return;
    }
    armAction(state.pendingAction === id ? null : id);
  };

  const focused = focus ?? state.pendingAction;
  const focusedCopy = focused ? copyForAction(focused, locale, state) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-paper">{t(locale, "act.step")}</p>
        <p className="tabular text-xs text-muted">{t(locale, "act.left", { n: state.actionsLeft, max })}</p>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-elevated">
        <div className="h-full bg-olive" style={{ width: `${Math.round((state.actionsLeft / max) * 100)}%` }} />
      </div>
      <p className="text-xs leading-relaxed text-subtle">{hintKey ? t(locale, hintKey) : t(locale, `hat.${state.hat}.body`)}</p>
      {feedback ? <ExplainCard copy={feedback} mode="after" /> : null}
      {focusedCopy && !feedback ? <ExplainCard copy={focusedCopy} mode="before" /> : null}
      {visibleObjectives(state).filter((o) => o.status === "open" && !o.secret).length ? (
        <ul className="space-y-1 rounded-sm border border-border bg-bg/30 p-2">
          {visibleObjectives(state)
            .filter((o) => o.status === "open")
            .slice(0, 3)
            .map((o) => (
              <li key={o.id} className="text-[11px] text-muted">
                {t(locale, `obj.${o.id}`)}
              </li>
            ))}
        </ul>
      ) : null}

      <div className="grid grid-cols-5 gap-1">
        {ACTION_GROUPS.map((g) => {
          const locked =
            (g.id === "kisi" && !mechanicUnlocked(state, "person")) ||
            (g.id === "bilgi" && !mechanicUnlocked(state, "knowledge") && state.turn < 3);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroup(g.id)}
              className={cn(
                "min-h-10 rounded-sm px-1 text-xs font-medium",
                group === g.id ? "bg-olive text-olive-fg" : "bg-bg/50 text-muted hover:text-fg",
                locked && "opacity-50",
              )}
            >
              {t(locale, `group.${g.id}.label`)}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-subtle">{t(locale, `group.${group}.hint`)}</p>

      <div className="grid grid-cols-2 gap-1.5">
        {ACTIONS.filter((a) => a.group === group && !hatBlocks(state.hat, a.id)).map((a) => {
          const locked = Boolean(a.unlockAct && act < a.unlockAct);
          const armed = state.pendingAction === a.id;
          const ok = canPlay(state, a.id);
          const copy = copyForAction(a.id, locale, state);
          return (
            <button
              key={a.id}
              type="button"
              disabled={(!ok && !armed) || locked}
              onClick={() => onAction(a.id)}
              onFocus={() => setFocus(a.id)}
              className={cn(
                "min-h-11 rounded-sm border px-2 py-2 text-left transition-colors duration-(--motion-quick)",
                armed || focus === a.id ? "border-olive bg-olive/15" : "border-border bg-bg/40 hover:border-olive/40",
                ((!ok && !armed) || locked) && "opacity-40",
              )}
            >
              <span className="flex items-baseline justify-between gap-1">
                <span className="text-sm font-medium text-fg">{copy.verb ?? copy.label}</span>
                <span className="font-mono text-[10px] text-olive">{a.ap}</span>
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted">{copy.expectedEffect}</span>
            </button>
          );
        })}
      </div>

      {state.pendingAction === "rakip_sogut" ? (
        <div className="rounded-sm border border-olive/40 bg-olive/10 p-2">
          <p className="mb-2 text-xs text-paper">{t(locale, "act.armed")}</p>
          <div className="flex gap-2">
            {(["mit", "emniyet"] as Faction[]).map((f) => (
              <Button key={f} size="sm" variant="secondary" onClick={() => play({ id: "rakip_sogut", faction: f })}>
                {f === "mit" ? "MİT" : "Emniyet"}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {state.pendingAction &&
      ["bag_guclendir", "bag_gevset", "bag_gozet", "bag_yalitim", "bag_ifsa", "bag_arabul", "bag_koru"].includes(
        state.pendingAction,
      ) ? (
        <p className="rounded-sm border border-olive/40 bg-olive/10 px-2 py-2 text-xs text-paper">{t(locale, "act.armed")}</p>
      ) : null}
      {state.pendingAction && ["kisi_koru", "kisi_kullan", "kisi_harca", "kisi_mesafe"].includes(state.pendingAction) ? (
        <p className="rounded-sm border border-olive/40 bg-olive/10 px-2 py-2 text-xs text-paper">{t(locale, "act.armed")}</p>
      ) : null}

      <Button variant={state.actionsLeft === 0 ? "default" : "outline"} className="w-full" onClick={resolve} disabled={spent < 1}>
        {t(locale, "act.resolve")}
      </Button>
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
