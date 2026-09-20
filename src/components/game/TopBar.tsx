import { FileText, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { eventFor, apFor } from "@/game/engine";
import { actLabel } from "@/game/sim/acts";
import { applyShellMode, detectShellMode, type ShellMode } from "@/game/embed";
import { useGame } from "@/game/store";
import type { StatKey } from "@/game/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t, useLocale } from "@/game/i18n";
import { LangSwitch } from "./LangSwitch";

const HUD_STATS: StatKey[] = ["giz", "saha", "etki", "hukuk"];

function phaseShort(locale: "tr" | "en", phase: string, left: number, max: number, turn: number) {
  if (phase === "event") return `T${turn} · ${t(locale, "hud.phaseEvent")}`;
  if (phase === "actions") return `T${turn} · ${left}/${max} ${t(locale, "hud.phaseAct")}`;
  if (phase === "resolution") return `T${turn} · ${t(locale, "hud.phaseRes")}`;
  return `T${turn}`;
}

export function TopBar() {
  const state = useGame((s) => s.state);
  const setScreen = useGame((s) => s.setScreen);
  const clearSave = useGame((s) => s.clearSave);
  const explainStat = useGame((s) => s.explainStat);
  const setExplainStat = useGame((s) => s.setExplainStat);
  const locale = useLocale((s) => s.locale);
  const [shell, setShell] = useState<ShellMode>("standalone");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setShell(applyShellMode());
  }, []);

  if (!state) return null;
  const ev = eventFor(state.turn);
  const max = apFor(state.hat);
  const embedded = shell === "embedded" || detectShellMode() === "embedded";

  return (
    <header className="hud-pad shrink-0 border-b border-border bg-surface/95">
      <div className="flex h-11 min-w-0 items-center gap-2 px-2 sm:h-12 sm:px-3">
        {embedded ? null : (
          <p className="hidden shrink-0 font-mono text-[10px] tracking-widest text-olive sm:block">{t(locale, "hud.wordmark")}</p>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-fg sm:text-sm">
            {ev ? `${ev.year}` : "1986"}
            <span className="text-subtle"> · {phaseShort(locale, state.phase, state.actionsLeft, max, state.turn)}</span>
          </p>
          <p className="hidden truncate text-[10px] text-olive sm:block">
            {t(locale, `hat.${state.hat}.title`)} · {actLabel(state, locale)}
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-1">
          {HUD_STATS.map((k) => (
            <StatChip
              key={k}
              k={k}
              v={state.stats[k]}
              open={explainStat === k}
              onToggle={() => {
                setExplainStat(explainStat === k ? null : k);
                setOpen(false);
              }}
            />
          ))}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "min-h-9 rounded-sm border px-1.5 font-mono text-[10px] tabular",
              open ? "border-olive/60 bg-elevated text-paper" : "border-border bg-bg/60 text-muted",
            )}
            aria-label={t(locale, "hud.capacity")}
          >
            {state.phase === "actions" ? `${state.actionsLeft}` : "·"}
          </button>
        </div>
        <div className="flex items-center">
          {embedded ? null : <LangSwitch />}
          <Button variant="ghost" size="icon" className="size-9" onClick={() => setScreen("dosya")} aria-label={t(locale, "hud.file")}>
            <FileText />
          </Button>
          {embedded ? null : (
            <Button variant="ghost" size="icon" className="size-9" onClick={clearSave} aria-label={t(locale, "hud.reset")}>
              <RotateCcw />
            </Button>
          )}
        </div>
      </div>
      {explainStat ? (
        <p className="border-t border-border px-3 py-1.5 text-[11px] leading-relaxed text-muted">
          <span className="text-paper">{t(locale, `stat.${explainStat}.label`)}.</span> {t(locale, `stat.${explainStat}.hint`)}
        </p>
      ) : null}
      {open ? (
        <div className="grid grid-cols-4 gap-1 border-t border-border px-2 py-2">
          {(["kara", "bilgi", "sadakat", "kamuoyu"] as StatKey[]).map((k) => (
            <StatChip
              key={k}
              k={k}
              v={state.stats[k]}
              open={explainStat === k}
              onToggle={() => setExplainStat(explainStat === k ? null : k)}
            />
          ))}
          <p className="col-span-4 text-[10px] text-subtle">{t(locale, "hud.capHint", { left: state.actionsLeft, max })}</p>
        </div>
      ) : null}
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
  const locale = useLocale((s) => s.locale);
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
      className={cn(
        "min-h-9 min-w-[2.6rem] rounded-sm border px-1 py-0.5 text-left",
        open ? "border-olive/60 bg-elevated" : "border-border bg-bg/60",
      )}
    >
      <div className="flex items-baseline justify-between gap-0.5">
        <span className="truncate text-[9px] font-medium text-muted">{t(locale, `stat.${k}.short`)}</span>
        <span className={`tabular font-mono text-[11px] font-medium ${danger ? "text-stamp" : "text-paper"}`}>{v}</span>
      </div>
      <div className="mt-0.5 h-0.5 overflow-hidden rounded-full bg-elevated">
        <div
          className={`h-full ${danger ? "bg-stamp" : k === "giz" ? "bg-olive" : "bg-paper/70"}`}
          style={{ width: `${bar}%` }}
        />
      </div>
    </button>
  );
}
