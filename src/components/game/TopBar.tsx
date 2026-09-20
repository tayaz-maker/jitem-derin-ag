import { FileText, RotateCcw } from "lucide-react";
import { eventFor } from "@/game/engine";
import { STAT_META } from "@/game/data";
import { actLabel } from "@/game/sim/acts";
import { useGame } from "@/game/store";
import type { StatKey } from "@/game/types";
import { Button } from "@/components/ui/button";

const PRIMARY: StatKey[] = ["giz", "saha", "etki", "kara", "bilgi"];
const SECONDARY: StatKey[] = ["sadakat", "kamuoyu", "hukuk"];

function phaseLabel(phase: string, left: number, turn: number) {
  if (phase === "event") return `Adım 1 · ${turn}/10  duruş seç`;
  if (phase === "actions") return `Adım 2 · ${left} iş hakkı`;
  if (phase === "resolution") return "Adım 3 · özet";
  return `Tur ${turn}/10`;
}

export function TopBar() {
  const state = useGame((s) => s.state);
  const setScreen = useGame((s) => s.setScreen);
  const clearSave = useGame((s) => s.clearSave);
  const explainStat = useGame((s) => s.explainStat);
  const setExplainStat = useGame((s) => s.setExplainStat);
  if (!state) return null;
  const ev = eventFor(state.turn);

  return (
    <header className="flex flex-col gap-2 border-b border-border bg-surface/90 px-3 py-2 sm:px-4">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg">
            {ev ? `${ev.year} · ${ev.title}` : "Derin Ağ"}
          </p>
          <p className="text-xs text-olive">
            {phaseLabel(state.phase, state.actionsLeft, state.turn)}
            <span className="text-subtle">
              {" "}
              · {state.hat === "saha" ? "Saha hattı" : "İdari hat"} · {actLabel(state)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setScreen("dosya")}>
            <FileText /> <span className="hidden sm:inline">Dosya</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSave} aria-label="Başa dön">
            <RotateCcw />
          </Button>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-5 gap-1.5">
        {PRIMARY.map((k) => (
          <StatChip
            key={k}
            k={k}
            v={state.stats[k]}
            open={explainStat === k}
            onToggle={() => setExplainStat(explainStat === k ? null : k)}
          />
        ))}
      </div>
      <div className="grid min-w-0 grid-cols-3 gap-1.5">
        {SECONDARY.map((k) => (
          <StatChip
            key={k}
            k={k}
            v={state.stats[k]}
            open={explainStat === k}
            onToggle={() => setExplainStat(explainStat === k ? null : k)}
          />
        ))}
      </div>
      {explainStat && explainStat in STAT_META ? (
        <p className="text-xs leading-relaxed text-muted">
          <span className="text-paper">{STAT_META[explainStat as StatKey].label}.</span>{" "}
          {STAT_META[explainStat as StatKey].hint}
        </p>
      ) : (
        <p className="text-xs text-subtle">Çubuğa dokun. Ahlâk barı yok — sonuç üretilir.</p>
      )}
    </header>
  );
}

function StatChip({
  k,
  v,
  open,
  onToggle,
}: {
  k: StatKey;
  v: number;
  open: boolean;
  onToggle: () => void;
}) {
  const meta = STAT_META[k];
  const danger =
    (k === "giz" && v < 25) ||
    (k === "saha" && v < 20) ||
    (k === "sadakat" && v < 25) ||
    (k === "hukuk" && v > 55);
  const bar = Math.max(0, Math.min(100, v));
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-sm border px-1.5 py-1 text-left sm:px-2 ${
        open ? "border-olive/60 bg-elevated" : "border-border bg-bg/60"
      }`}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className="truncate text-[10px] font-medium text-muted">{meta.label}</span>
        <span
          className={`tabular font-mono text-xs font-medium ${danger ? "text-stamp" : "text-paper"}`}
        >
          {v}
        </span>
      </div>
      <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-elevated">
        <div
          className={`h-full ${danger ? "bg-stamp" : k === "giz" ? "bg-olive" : "bg-paper/70"}`}
          style={{ width: `${bar}%` }}
        />
      </div>
    </button>
  );
}
