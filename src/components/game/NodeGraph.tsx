import { useMemo, type KeyboardEvent } from "react";
import { EDGES, NODES } from "@/game/data";
import { isEdgeVisible, isNodeVisible, nodeById } from "@/game/engine";
import { evidenceColor } from "@/game/evidence";
import { edgeWhy, nodeWhy } from "@/game/sim/inspect";
import { useGame } from "@/game/store";
import { t, useLocale } from "@/game/i18n";

const CLUSTERS = [
  { id: "jitem", x: 250, y: 280, faction: "jitem" as const },
  { id: "mit", x: 680, y: 140, faction: "mit" as const },
  { id: "emniyet", x: 800, y: 420, faction: "emniyet" as const },
];

function activate(e: KeyboardEvent, fn: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
}

export function NodeGraph() {
  const state = useGame((s) => s.state);
  const pickNode = useGame((s) => s.pickNode);
  const pickEdge = useGame((s) => s.pickEdge);
  const setGraphMode = useGame((s) => s.setGraphMode);
  const locale = useLocale((s) => s.locale);
  const visibleNodes = useMemo(
    () => (state ? NODES.filter((n) => isNodeVisible(state, n.id)) : []),
    [state],
  );
  const visibleEdges = useMemo(
    () => (state ? EDGES.filter((e) => isEdgeVisible(state, e.id)) : []),
    [state],
  );
  if (!state) return null;

  const arming =
    ["bag_guclendir", "bag_gevset", "bag_gozet", "bag_yalitim", "bag_ifsa", "bag_arabul", "bag_koru"].includes(
      state.pendingAction ?? "",
    ) || ["kisi_koru", "kisi_kullan", "kisi_harca", "kisi_mesafe"].includes(state.pendingAction ?? "");

  const clustered = state.graphMode === "factions";
  const selected = state.selectedNodeId;
  const neighborIds = new Set<string>();
  if (selected) {
    for (const e of visibleEdges) {
      if (e.from === selected) neighborIds.add(e.to);
      if (e.to === selected) neighborIds.add(e.from);
    }
  }

  const why = state.selectedEdgeId
    ? edgeWhy(state, state.selectedEdgeId, locale)
    : state.selectedNodeId
      ? nodeWhy(state, state.selectedNodeId, locale)
      : null;

  return (
    <div className="relative h-full min-h-[220px] w-full overflow-hidden bg-bg">
      <img src="/images/map.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-20" />
      <div className="absolute inset-0 bg-bg/55" />
      <div className="absolute right-2 top-2 z-20 flex gap-1">
        <button
          type="button"
          onClick={() => setGraphMode("factions")}
          className={`min-h-10 rounded-sm px-2 text-[11px] ${clustered ? "bg-olive text-olive-fg" : "bg-surface text-muted"}`}
        >
          {t(locale, "map.zoomFar")}
        </button>
        <button
          type="button"
          onClick={() => setGraphMode("people")}
          className={`min-h-10 rounded-sm px-2 text-[11px] ${!clustered ? "bg-olive text-olive-fg" : "bg-surface text-muted"}`}
        >
          {t(locale, "map.zoomNear")}
        </button>
      </div>
      <svg
        viewBox="-48 -16 1120 660"
        className="relative z-10 h-full w-full"
        role="img"
        aria-label={t(locale, "map.aria")}
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{t(locale, "map.aria")}</title>
        {clustered
          ? CLUSTERS.filter((c) => visibleNodes.some((n) => n.faction === c.faction || n.id === c.id)).map((c) => {
              const count = visibleNodes.filter((n) => n.faction === c.faction || n.id === c.id).length;
              const heat = visibleNodes
                .filter((n) => n.faction === c.faction)
                .reduce((s, n) => s + (state.nodeHeat[n.id] ?? 0), 0);
              const clusterName = t(locale, `map.clusters.${c.id}`);
              return (
                <g
                  key={c.id}
                  transform={`translate(${c.x} ${c.y})`}
                  className="cursor-pointer"
                  tabIndex={0}
                  role="button"
                  aria-label={clusterName}
                  onClick={() => {
                    pickNode(c.id);
                    setGraphMode("people");
                  }}
                  onKeyDown={(e) =>
                    activate(e, () => {
                      pickNode(c.id);
                      setGraphMode("people");
                    })
                  }
                >
                  <rect
                    x={-74}
                    y={-30}
                    width={148}
                    height={60}
                    rx={4}
                    fill="var(--color-elevated)"
                    stroke={heat > 2 ? "var(--color-stamp)" : "var(--color-paper)"}
                  />
                  <text textAnchor="middle" y={-4} fill="var(--color-fg)" fontSize={13} fontFamily="IBM Plex Sans, sans-serif">
                    {clusterName}
                  </text>
                  <text textAnchor="middle" y={16} fill="var(--color-muted)" fontSize={10} fontFamily="IBM Plex Mono, monospace">
                    {t(locale, "map.nodes", { n: count, heat })}
                  </text>
                </g>
              );
            })
          : null}

        {!clustered &&
          visibleEdges.map((e) => {
            const a = nodeById(e.from);
            const b = nodeById(e.to);
            if (!a || !b) return null;
            const str = state.edgeStr[e.id] ?? 1;
            const selectedE = state.selectedEdgeId === e.id;
            const near = selected && (e.from === selected || e.to === selected);
            const color = evidenceColor(e.evidence);
            const live = state.edgeLive[e.id];
            return (
              <g key={e.id}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={color}
                  strokeWidth={selectedE ? 4 : near ? 2.6 : Math.max(1, 1 + str)}
                  strokeOpacity={str <= 0 ? 0.2 : selectedE || near ? 0.95 : 0.4 + str * 0.12}
                  strokeDasharray={e.evidence === "TARTIŞMALI" ? "6 4" : e.evidence === "BOŞLUK" ? "2 5" : undefined}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    pickEdge(e.id);
                  }}
                />
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="transparent"
                  strokeWidth={28}
                  className="cursor-pointer"
                  tabIndex={0}
                  role="button"
                  aria-label={e.label}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    pickEdge(e.id);
                  }}
                  onKeyDown={(ev) => activate(ev, () => pickEdge(e.id))}
                />
                {selectedE && live ? (
                  <text
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2 - 8}
                    textAnchor="middle"
                    fill="var(--color-paper)"
                    fontSize={10}
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    g{live.trust} s{live.secrecy} t{live.tension}
                  </text>
                ) : null}
              </g>
            );
          })}

        {!clustered &&
          visibleNodes.map((n) => {
            const isSel = state.selectedNodeId === n.id;
            const dead = Boolean(state.dead[n.id]);
            const heated = (state.nodeHeat[n.id] ?? 0) > 0 || Boolean(state.actorMemory[n.id]?.length);
            const near = neighborIds.has(n.id);
            const focus =
              isSel ||
              near ||
              heated ||
              n.kind === "kurum" ||
              n.appearTurn <= Math.max(1, state.turn - 1) ||
              visibleNodes.length <= 10;
            const fade = !focus;
            const color =
              n.kind === "kurum" ? "var(--color-paper)" : n.kind === "koridor" ? "var(--color-olive)" : "var(--color-fg)";
            const r = n.kind === "kurum" ? 18 : 14;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x} ${n.y})`}
                className="cursor-pointer"
                opacity={fade ? 0.22 : dead ? 0.7 : 1}
                tabIndex={0}
                role="button"
                aria-label={n.name}
                onClick={(ev) => {
                  ev.stopPropagation();
                  pickNode(n.id);
                }}
                onKeyDown={(ev) => activate(ev, () => pickNode(n.id))}
              >
                {isSel ? <circle r={r + 12} fill="none" stroke="var(--color-olive)" strokeWidth={1.5} opacity={0.9} /> : null}
                {heated && !dead ? (
                  <circle r={r + 7} fill="none" stroke="var(--color-stamp)" strokeWidth={1} opacity={0.55} />
                ) : null}
                {n.kind === "kurum" ? (
                  <rect
                    x={-22}
                    y={-14}
                    width={44}
                    height={28}
                    rx={3}
                    fill="var(--color-elevated)"
                    stroke={color}
                    strokeWidth={isSel ? 2 : 1.2}
                    opacity={dead ? 0.45 : 1}
                  />
                ) : n.kind === "koridor" ? (
                  <rect
                    x={-13}
                    y={-13}
                    width={26}
                    height={26}
                    rx={1}
                    transform="rotate(45)"
                    fill="var(--color-surface)"
                    stroke={color}
                    strokeWidth={isSel ? 2 : 1.2}
                    opacity={dead ? 0.45 : 1}
                  />
                ) : (
                  <circle
                    r={r}
                    fill="var(--color-surface)"
                    stroke={color}
                    strokeWidth={isSel ? 2 : 1.2}
                    opacity={dead ? 0.45 : 1}
                    strokeDasharray={dead ? "3 3" : undefined}
                  />
                )}
                <text
                  y={n.kind === "kurum" ? 32 : 28}
                  textAnchor="middle"
                  fill={dead ? "var(--color-subtle)" : "var(--color-fg)"}
                  fontSize={11}
                  fontFamily="IBM Plex Sans, sans-serif"
                >
                  {n.name}
                </text>
                {dead ? (
                  <text y={4} textAnchor="middle" fill="var(--color-stamp)" fontSize={7} fontFamily="IBM Plex Mono, monospace">
                    {t(locale, "map.closed")}
                  </text>
                ) : null}
              </g>
            );
          })}
      </svg>
      <div className="absolute bottom-2 left-2 right-2 z-20 rounded-sm border border-border bg-surface/90 px-2 py-1.5">
        <p className="text-[11px] leading-snug text-muted">
          {arming
            ? t(locale, "map.arm")
            : why
              ? why
              : clustered
                ? t(locale, "map.cluster")
                : visibleNodes.length > 12
                  ? t(locale, "map.focus")
                  : t(locale, "map.legend")}
        </p>
      </div>
    </div>
  );
}
