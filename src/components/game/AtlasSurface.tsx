import { useEffect, useRef, useState } from "react";
import type { AtlasModel } from "@/game/sim/atlas";
import { ATLAS_COLORS } from "@/game/sim/atlas";
import type { mountAtlasPixi } from "./atlas-pixi";

type Props = {
  model: AtlasModel;
  svgOnly: boolean;
  locale: "tr" | "en";
  onNode: (id: string) => void;
  onEdge: (id: string) => void;
};
export function AtlasSurface({ model, svgOnly, locale, onNode, onEdge }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(model);
  latest.current = model;
  const renderer = useRef<Awaited<ReturnType<typeof mountAtlasPixi>> | null>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element || svgOnly) {
      setActive(false);
      return;
    }
    let disposed = false,
      started = false,
      failed = false;
    const fallback = () => {
      failed = true;
      renderer.current?.destroy();
      renderer.current = null;
      if (!disposed) setActive(false);
    };
    const resize = () => {
      if (disposed || failed || !element.clientWidth || !element.clientHeight) return;
      if (renderer.current) {
        try {
          renderer.current.update(latest.current);
        } catch {
          fallback();
        }
      } else if (!started) {
        started = true;
        void import("./atlas-pixi")
          .then((m) => m.mountAtlasPixi(element, latest.current, fallback))
          .then((r) => {
            if (disposed || failed) {
              r.destroy();
              return;
            }
            renderer.current = r;
            r.update(latest.current);
            setActive(true);
          })
          .catch(fallback);
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    return () => {
      disposed = true;
      observer.disconnect();
      renderer.current?.destroy();
      renderer.current = null;
      setActive(false);
    };
  }, [svgOnly]);
  useEffect(() => {
    try {
      renderer.current?.update(model);
    } catch {
      renderer.current?.destroy();
      renderer.current = null;
      setActive(false);
    }
  }, [model]);
  const b = model.bounds;
  return (
    <div className="atlas-surface" data-renderer={active ? "pixi" : "svg"}>
      <div ref={host} className="atlas-canvas" />
      <svg
        viewBox={`${b.x} ${b.y} ${b.width} ${b.height}`}
        className="atlas-svg"
        aria-label={locale === "tr" ? "Karar ve dönüş atlası" : "Decision and return atlas"}
      >
        <g opacity={active ? 0 : 1} aria-hidden="true">
          {model.edges.map((e) => (
            <line
              key={e.id}
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke={e.affected ? ATLAS_COLORS.warn : e.risk >= 58 ? ATLAS_COLORS.risk : e.color}
              strokeWidth={e.selected ? 4 : e.affected ? 3 : 1.5}
              opacity={e.selected || e.affected ? 1 : 0.55}
              strokeDasharray={e.dashed ? "7 5" : undefined}
            />
          ))}
          {model.nodes.map((n) => (
            <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
              {n.selected && (
                <circle r={29} fill="none" stroke={ATLAS_COLORS.olive} strokeWidth={2} />
              )}
              {n.projectedHeat > 0 && <circle r={23} fill="none" stroke={ATLAS_COLORS.risk} />}
              {n.kind === "kurum" ? (
                <rect
                  x={-21}
                  y={-14}
                  width={42}
                  height={28}
                  rx={3}
                  fill={ATLAS_COLORS.surface}
                  stroke={n.color}
                />
              ) : n.kind === "koridor" ? (
                <path
                  d="M0 -17 L17 0 L0 17 L-17 0 Z"
                  fill={ATLAS_COLORS.surface}
                  stroke={n.color}
                />
              ) : (
                <circle r={14} fill={ATLAS_COLORS.surface} stroke={n.color} />
              )}
            </g>
          ))}
        </g>
        {model.edges.map((e) => (
          <g key={e.id}>
            <line
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke="transparent"
              strokeWidth={28}
              tabIndex={0}
              role="button"
              aria-label={`${e.label} · ${e.evidence}`}
              onClick={() => onEdge(e.id)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  onEdge(e.id);
                }
              }}
            />
            {(e.affected || e.selected || e.due.length > 0) && (
              <g
                transform={`translate(${(e.x1 + e.x2) / 2} ${(e.y1 + e.y2) / 2})`}
                pointerEvents="none"
              >
                <rect
                  x={-49}
                  y={-14}
                  width={98}
                  height={38}
                  rx={4}
                  fill="#0d1412"
                  stroke={e.affected ? ATLAS_COLORS.warn : ATLAS_COLORS.muted}
                />
                <text textAnchor="middle" y={0} fill={ATLAS_COLORS.paper} fontSize={11}>
                  {e.due.length ? `T${Math.min(...e.due)} · ` : ""}
                  {e.risk}→{e.afterRisk}
                </text>
                <text textAnchor="middle" y={15} fill={ATLAS_COLORS.muted} fontSize={10}>
                  T{model.turn + 1}: {e.nextRisk}
                </text>
              </g>
            )}
          </g>
        ))}
        {model.nodes.map((n) => (
          <g
            key={n.id}
            transform={`translate(${n.x} ${n.y})`}
            tabIndex={0}
            role="button"
            aria-label={n.name}
            onClick={() => onNode(n.id)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                onNode(n.id);
              }
            }}
          >
            <circle r={24} fill="transparent" />
            <text
              y={42}
              textAnchor="middle"
              fill={ATLAS_COLORS.paper}
              fontSize={12}
              paintOrder="stroke"
              stroke="#0d1412"
              strokeWidth={4}
            >
              {n.name}
              {n.dead ? (locale === "tr" ? " · kapalı" : " · closed") : ""}
            </text>
            {n.projectedHeat !== n.heat && (
              <text textAnchor="middle" y={5} fill={ATLAS_COLORS.risk} fontSize={10}>
                {n.heat}→{n.projectedHeat}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
