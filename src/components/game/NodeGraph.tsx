import { useMemo } from "react";
import { EDGES, NODES } from "@/game/data";
import { edgeById, isEdgeVisible, isNodeVisible, nodeById } from "@/game/engine";
import { evidenceColor } from "@/game/evidence";
import { useGame } from "@/game/store";

const CLUSTERS = [
  { id: "jitem", name: "JİTEM / saha", x: 250, y: 280, faction: "jitem" as const },
  { id: "mit", name: "MİT iç hatlar", x: 680, y: 140, faction: "mit" as const },
  { id: "emniyet", name: "Emniyet / kesişim", x: 800, y: 420, faction: "emniyet" as const },
];

export function NodeGraph() {
  const state = useGame((s) => s.state);
  const pickNode = useGame((s) => s.pickNode);
  const pickEdge = useGame((s) => s.pickEdge);
  const setGraphMode = useGame((s) => s.setGraphMode);
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
    ["bag_guclendir", "bag_gevset", "bag_gozet", "bag_yalitim", "bag_ifsa", "bag_arabul", "bag_koru"].includes(state.pendingAction ?? "") ||
    ["kisi_koru", "kisi_kullan", "kisi_harca", "kisi_mesafe"].includes(state.pendingAction ?? "");

  const clustered = state.graphMode === "factions";

  return (
    <div className="relative h-full min-h-[280px] w-full overflow-hidden bg-bg">
      <img
        src="/images/map.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover opacity-20"
      />
      <div className="absolute inset-0 bg-bg/55" />
      <div className="absolute right-3 top-2 z-20 flex gap-1">
        <button
          type="button"
          onClick={() => setGraphMode("factions")}
          className={`min-h-10 rounded-sm px-2 text-[11px] ${clustered ? "bg-olive text-olive-fg" : "bg-surface text-muted"}`}
        >
          Kurumlar
        </button>
        <button
          type="button"
          onClick={() => setGraphMode("people")}
          className={`min-h-10 rounded-sm px-2 text-[11px] ${!clustered ? "bg-olive text-olive-fg" : "bg-surface text-muted"}`}
        >
          Kişiler
        </button>
      </div>
      <svg
        viewBox="-48 -16 1120 660"
        className="relative z-10 h-full w-full"
        role="img"
        aria-label="İlişki haritası"
        preserveAspectRatio="xMidYMid meet"
      >
        <title>Derin Ağ ilişki haritası</title>
        {clustered
          ? CLUSTERS.filter((c) => visibleNodes.some((n) => n.faction === c.faction || n.id === c.id)).map((c) => {
              const count = visibleNodes.filter((n) => n.faction === c.faction || n.id === c.id).length;
              const known = state.factions[c.faction]?.known.length ?? 0;
              return (
                <g
                  key={c.id}
                  transform={`translate(${c.x} ${c.y})`}
                  className="cursor-pointer"
                  onClick={() => pickNode(c.id)}
                >
                  <rect x={-70} y={-28} width={140} height={56} rx={4} fill="var(--color-elevated)" stroke="var(--color-paper)" />
                  <text textAnchor="middle" y={-4} fill="var(--color-fg)" fontSize={13} fontFamily="IBM Plex Sans, sans-serif">
                    {c.name}
                  </text>
                  <text textAnchor="middle" y={16} fill="var(--color-muted)" fontSize={10} fontFamily="IBM Plex Mono, monospace">
                    {count} düğüm · bildikleri {known}
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
          const selected = state.selectedEdgeId === e.id;
          const color = evidenceColor(e.evidence);
          return (
            <g key={e.id}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={color}
                strokeWidth={selected ? 3.5 : Math.max(1, 1 + str)}
                strokeOpacity={str <= 0 ? 0.2 : selected ? 0.95 : 0.45 + str * 0.12}
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
                strokeWidth={22}
                className="cursor-pointer"
                onClick={(ev) => {
                  ev.stopPropagation();
                  pickEdge(e.id);
                }}
              />
            </g>
          );
        })}

        {!clustered &&
          visibleNodes.map((n) => {
          const selected = state.selectedNodeId === n.id;
          const dead = Boolean(state.dead[n.id]);
          const heated = (state.nodeHeat[n.id] ?? 0) > 0 || Boolean(state.actorMemory[n.id]?.length);
          const focus =
            selected ||
            heated ||
            n.kind === "kurum" ||
            n.appearTurn <= Math.max(1, state.turn - 1) ||
            visibleNodes.length <= 12;
          const fade = !focus;
          const color =
            n.kind === "kurum"
              ? "var(--color-paper)"
              : n.kind === "koridor"
                ? "var(--color-olive)"
                : "var(--color-fg)";
          const r = n.kind === "kurum" ? 18 : 14;
          return (
            <g
              key={n.id}
              transform={`translate(${n.x} ${n.y})`}
              className="cursor-pointer"
              opacity={fade ? 0.28 : dead ? 0.7 : 1}
              onClick={(ev) => {
                ev.stopPropagation();
                pickNode(n.id);
              }}
            >
              {selected ? (
                <circle r={r + 12} fill="none" stroke="var(--color-olive)" strokeWidth={1.5} opacity={0.9} />
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
                  strokeWidth={selected ? 2 : 1.2}
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
                  strokeWidth={selected ? 2 : 1.2}
                  opacity={dead ? 0.45 : 1}
                />
              ) : (
                <circle
                  r={r}
                  fill="var(--color-surface)"
                  stroke={color}
                  strokeWidth={selected ? 2 : 1.2}
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
                <text
                  y={4}
                  textAnchor="middle"
                  fill="var(--color-stamp)"
                  fontSize={7}
                  fontFamily="IBM Plex Mono, monospace"
                >
                  KAPALI
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-2 left-3 right-3 z-20 flex flex-wrap items-end justify-between gap-2">
        <p className="text-[11px] text-muted">
          {arming
            ? "Hedef seç — çizgi veya isim."
            : clustered
              ? "Uzak bakış: kurum kümeleri. Kişiler’e in."
              : visibleNodes.length > 12
                ? "Odak: ısınan ve yakın dönem. Diğerleri soluk — dokun, açılır."
                : state.selectedEdgeId
                ? `${edgeById(state.selectedEdgeId)?.label} · ${edgeById(state.selectedEdgeId)?.evidence}`
                : "Kutu = kurum · daire = kişi · baklava = koridor."}
        </p>
      </div>
    </div>
  );
}
