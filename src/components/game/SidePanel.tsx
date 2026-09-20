import { ACTION_GROUPS, ACTIONS, EDGES, EVIDENCE_META, NODES } from "@/game/data";
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
import { LAYER_LABEL, sourceUxFor } from "@/game/sim/authority";
import { edgePreview, liveLine } from "@/game/sim/edges";
import { investigationView } from "@/game/sim/investigation";
import { playerViewOf, theySeePlayer } from "@/game/sim/knowledge";
import { memoryLine } from "@/game/sim/memory";
import { visibleObjectives } from "@/game/sim/objectives";
import { nodeWhy, edgeWhy } from "@/game/sim/inspect";
import { SOURCE_BY_ID } from "@/game/db";
import { useGame } from "@/game/store";
import type { ActionGroup, ActionId, Faction } from "@/game/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function SidePanel({ forceTab }: { forceTab?: "is" | "dosya" }) {
  const state = useGame((s) => s.state);
  const [tab, setTab] = useState<"is" | "dosya">("is");
  if (!state) return null;
  const activeTab = forceTab ?? (state.phase === "actions" ? tab : "dosya");
  const inv = investigationView(state);

  return (
    <aside className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto border-t border-border bg-surface p-3 sm:border-l sm:border-t-0 sm:p-4">
      <p className="font-mono text-[10px] text-olive">{actLabel(state)}</p>
      {state.phase === "actions" && !forceTab ? (
        <div className="flex gap-1 rounded-sm border border-border bg-bg/40 p-0.5">
          {(
            [
              ["is", "İşler"],
              ["dosya", "Seçili"],
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
            Soruşturma · {inv.label} · ısı {inv.heat}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted">{inv.why}</p>
          {inv.raising.length ? (
            <p className="mt-1 text-[10px] text-stamp">Yükselten: {inv.raising.join(" · ")}</p>
          ) : null}
          {inv.lowering.length ? (
            <p className="text-[10px] text-olive">Azaltan: {inv.lowering.join(" · ")}</p>
          ) : null}
          {inv.options.length ? (
            <ul className="mt-1 space-y-0.5">
              {inv.options.slice(0, 3).map((o) => (
                <li key={o} className="text-[10px] text-subtle">
                  {o}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="text-[11px] text-subtle">Soruşturma henüz aktif değil — giz incelirse uyanır.</p>
      )}

      <div className="mt-auto space-y-1 border-t border-border pt-3">
        <p className="text-xs text-subtle">
          Kanıt: kâğıt = belgelı, zeytin = güçlü, amber = tartışmalı. Görünen{" "}
          {NODES.filter((n) => isNodeVisible(state, n.id)).length}/{NODES.length} ·{" "}
          {EDGES.filter((e) => isEdgeVisible(state, e.id)).length} bağ
        </p>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(EVIDENCE_META) as Array<keyof typeof EVIDENCE_META>).map((k) => (
            <Badge key={k} tone={evidenceTone(k)} title={EVIDENCE_META[k].hint}>
              {k}
            </Badge>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function PersonPane() {
  const state = useGame((s) => s.state);
  const play = useGame((s) => s.play);
  const armAction = useGame((s) => s.armAction);
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

  if (edge && live && (!node || state.selectedEdgeId)) {
    return (
      <div className="p-3 lg:p-0">
        <p className="scan font-mono text-[10px] text-olive">Bağ</p>
        <h2 className="mt-1 text-lg font-medium text-fg">{edge.label}</h2>
        <div className="mt-1 flex flex-wrap gap-1">
          <Badge tone={evidenceTone(edge.evidence)}>{edge.evidence}</Badge>
          <Badge>{LAYER_LABEL[edge.layer] ?? edge.layer}</Badge>
        </div>
        <p className="mt-2 text-xs font-medium text-paper">{edgeWhy(state, edge.id)}</p>
        <p className="mt-2 text-xs text-muted">{liveLine(live)}</p>
        <p className="mt-2 text-xs text-subtle">Kaynak: {edge.source}</p>
        {state.phase === "actions" ? (
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {(
              [
                ["bag_guclendir", "strengthen", "Sıkılaştır"],
                ["bag_gevset", "weaken", "Gevşet"],
                ["bag_gozet", "observe", "Gözet"],
                ["bag_arabul", "mediate", "Arabul"],
                ["bag_yalitim", "isolate", "Yalıt"],
                ["bag_ifsa", "expose", "İfşa"],
                ["bag_koru", "protect", "Koru"],
              ] as const
            ).map(([id, kind, label]) => (
              <button
                key={id}
                type="button"
                disabled={!canPlay(state, id)}
                onClick={() => play({ id, edgeId: edge.id })}
                className="min-h-11 rounded-sm border border-border bg-bg/40 px-2 py-2 text-left text-xs disabled:opacity-40"
              >
                <span className="block font-medium text-fg">{label}</span>
                <span className="text-[10px] text-muted">{edgePreview(kind)}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="p-3 lg:p-0">
      <p className="scan font-mono text-[10px] text-olive">Haritadan seçilen</p>
      {visible && node ? (
        <>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-medium text-fg">{node.name}</h2>
            <Badge tone={evidenceTone(node.evidence)}>{node.evidence}</Badge>
            <Badge>{node.kind === "kisi" ? "kişi" : node.kind === "kurum" ? "kurum" : "koridor"}</Badge>
            {state.dead[node.id] ? <Badge tone="stamp">KAPALI</Badge> : null}
          </div>
          <p className="mt-2 text-xs leading-snug text-paper">{nodeWhy(state, node.id)}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {ux.slice(0, 3).map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">{node.role}</p>
          <dl className="mt-3 space-y-1.5 text-xs leading-relaxed text-muted">
            <div>
              <dt className="text-paper">Kanıt</dt>
              <dd>
                {node.evidence} · {src ? `${src.title}${src.location ? ` · ${src.location}` : ""}` : node.source}
              </dd>
            </div>
            <div>
              <dt className="text-paper">Elindeki bilgi</dt>
              <dd>{playerViewOf(state, node.id)}</dd>
            </div>
            <div>
              <dt className="text-paper">Seni nasıl görüyor</dt>
              <dd>{theySeePlayer(state, node.id)}</dd>
            </div>
            <div>
              <dt className="text-paper">Bellek</dt>
              <dd>{memoryLine(state, node.id)}</dd>
            </div>
            <div>
              <dt className="text-paper">Faction / risk</dt>
              <dd>
                {node.faction ?? "—"} · ısı {state.nodeHeat[node.id] ?? 0}
              </dd>
            </div>
          </dl>
          <details className="mt-3 rounded-sm border border-border bg-bg/40 p-2">
            <summary className="cursor-pointer text-xs text-olive">Kanıt katmanları</summary>
            <dl className="mt-2 space-y-2 text-xs leading-relaxed text-muted">
              <div>
                <dt className="text-paper">Tarihsel çıpa</dt>
                <dd>{node.historicalFact}</dd>
              </div>
              <div>
                <dt className="text-paper">Kaynak iddiası</dt>
                <dd>{node.sourceClaim}</dd>
              </div>
              <div>
                <dt className="text-paper">Oyunsal rekonstrüksiyon</dt>
                <dd>{node.gameReconstruction}</dd>
              </div>
              <div>
                <dt className="text-paper">
                  Motivasyon ·{" "}
                  {node.motivationKind === "unknown" ? "UNKNOWN" : node.motivationKind === "sourced" ? "kaynaklı" : "GAMEPLAY_ASSUMPTION"}
                </dt>
                <dd>{node.motivation}</dd>
              </div>
            </dl>
          </details>
          {state.phase === "actions" && node.kind === "kisi" ? (
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {(
                [
                  ["kisi_koru", "Koru", "2 kap · sadakat artar"],
                  ["kisi_kullan", "Kullan", "2 kap · fayda, sadakat incelir"],
                  ["kisi_harca", "Harca", "3 kap · bilgi için yak"],
                  ["kisi_mesafe", "Mesafe", "1 kap · iz küçülür"],
                ] as const
              ).map(([id, label, hint]) => (
                <button
                  key={id}
                  type="button"
                  disabled={!canPlay(state, id)}
                  onClick={() => (canPlay(state, id) ? play({ id, nodeId: node.id }) : armAction(id))}
                  className="min-h-11 rounded-sm border border-border bg-bg/40 px-2 py-2 text-left text-xs disabled:opacity-40"
                >
                  <span className="block font-medium text-fg">{label}</span>
                  <span className="text-[10px] text-muted">{hint}</span>
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Haritada bir isme veya çizgiye dokun. Sisli isimler dönem ve bilgiyle açılır. “Neden dokunayım” seçilince görünür.
        </p>
      )}
    </div>
  );
}

function ActionBlock() {
  const state = useGame((s) => s.state)!;
  const armAction = useGame((s) => s.armAction);
  const play = useGame((s) => s.play);
  const resolve = useGame((s) => s.resolve);
  const defaultGroup: ActionGroup =
    state.turn === 1 ? "ag" : state.turn === 2 ? "kisi" : state.turn === 3 ? "bilgi" : state.hat === "idari" ? "koruma" : "saha";
  const [group, setGroup] = useState<ActionGroup>(defaultGroup);
  const max = apFor(state.hat);
  const spent = max - state.actionsLeft;
  const act = actOf(state.turn);

  const onAction = (id: ActionId) => {
    const def = ACTIONS.find((a) => a.id === id);
    if (!def || !canPlay(state, id)) return;
    if (def.needs === "none") {
      play({ id });
      return;
    }
    armAction(state.pendingAction === id ? null : id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-paper">Adım 2 · Kapasite</p>
        <p className="tabular text-xs text-muted">
          {state.actionsLeft}/{max} kaldı
        </p>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-elevated">
        <div className="h-full bg-olive" style={{ width: `${Math.round((state.actionsLeft / max) * 100)}%` }} />
      </div>
      <p className="text-xs leading-relaxed text-subtle">
        {onboardingHint(state) ??
          (state.hat === "saha"
            ? "Saha: yüksek kapasite, daha çok ısı. Ağır iş 3, bakış 1."
            : "İdari: daha az kapasite, koruma ve dosya daha verimli.")}
      </p>
      {visibleObjectives(state).filter((o) => o.status === "open" && !o.secret).length ? (
        <ul className="space-y-1 rounded-sm border border-border bg-bg/30 p-2">
          {visibleObjectives(state)
            .filter((o) => o.status === "open")
            .slice(0, 3)
            .map((o) => (
              <li key={o.id} className="text-[11px] text-muted">
                {o.secret ? "Gizli iş · " : ""}
                {o.title}
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
              {g.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-subtle">
        {ACTION_GROUPS.find((g) => g.id === group)?.hint}
        {group === "kisi" && !mechanicUnlocked(state, "person") ? " · henüz aktif değil (tur 2)" : ""}
        {group === "bilgi" && !mechanicUnlocked(state, "knowledge") && state.turn < 3 ? " · henüz aktif değil (tur 3)" : ""}
      </p>

      <div className="grid grid-cols-2 gap-1.5">
        {ACTIONS.filter((a) => a.group === group).map((a) => {
          const locked = Boolean(a.unlockAct && act < a.unlockAct);
          const armed = state.pendingAction === a.id;
          const ok = canPlay(state, a.id);
          return (
            <button
              key={a.id}
              type="button"
              disabled={(!ok && !armed) || locked}
              onClick={() => onAction(a.id)}
              className={cn(
                "min-h-11 rounded-sm border px-2 py-2 text-left transition-colors duration-(--motion-quick)",
                armed ? "border-olive bg-olive/15" : "border-border bg-bg/40 hover:border-olive/40",
                ((!ok && !armed) || locked) && "opacity-40",
              )}
            >
              <span className="flex items-baseline justify-between gap-1">
                <span className="text-sm font-medium text-fg">{a.name}</span>
                <span className="font-mono text-[10px] text-olive">{a.ap}</span>
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                {locked ? `Henüz aktif değil · ACT ${a.unlockAct}` : a.blurb}
              </span>
              <span className="mt-1 block text-[11px] text-olive">{locked ? "" : a.cost}</span>
            </button>
          );
        })}
      </div>

      {state.pendingAction === "rakip_sogut" ? (
        <div className="rounded-sm border border-olive/40 bg-olive/10 p-2">
          <p className="mb-2 text-xs text-paper">Kimi soğutacaksın?</p>
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
        <p className="rounded-sm border border-olive/40 bg-olive/10 px-2 py-2 text-xs text-paper">
          Haritada iki isim arasındaki çizgiye dokun.
        </p>
      ) : null}
      {state.pendingAction && ["kisi_koru", "kisi_kullan", "kisi_harca", "kisi_mesafe"].includes(state.pendingAction) ? (
        <p className="rounded-sm border border-olive/40 bg-olive/10 px-2 py-2 text-xs text-paper">
          Haritadan bir isme dokun. Suikast yok.
        </p>
      ) : null}

      <Button
        variant={state.actionsLeft === 0 ? "default" : "outline"}
        className="w-full"
        onClick={resolve}
        disabled={spent < 1}
      >
        {spent < 1
          ? "Önce kapasite harca"
          : state.actionsLeft > 0
            ? "Kalan kapasiteyi bırak, turu kapat"
            : "Turu kapat — diğer hatlar hareket eder"}
      </Button>
    </div>
  );
}

function ResolutionBlock() {
  const state = useGame((s) => s.state)!;
  const nextTurn = useGame((s) => s.nextTurn);
  return (
    <div className="space-y-2 rounded-md border border-border bg-bg/50 p-3">
      <p className="text-sm font-medium text-paper">Adım 3 · Ne oldu</p>
      <ul className="space-y-1.5">
        {state.lastResolution.map((n, i) => (
          <li key={i} className="text-xs leading-relaxed text-muted">
            {n}
          </li>
        ))}
      </ul>
      <Button className="w-full" onClick={nextTurn}>
        Sonraki döneme geç
      </Button>
    </div>
  );
}
