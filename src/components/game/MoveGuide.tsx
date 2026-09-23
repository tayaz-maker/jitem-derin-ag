import { useGame } from "@/game/store";
import { t, useLocale } from "@/game/i18n";
import { changeTone, nextStep, type Change } from "@/game/sim/preview";
import { cn } from "@/lib/utils";
import { changeLabel } from "./operation-copy";

const STEP_ORDER = ["target", "move", "confirm", "resolve"] as const;

/** One line that always says what to do now, on every screen size. */
export function NextStepBar() {
  const state = useGame((s) => s.state);
  const move = useGame((s) => s.move);
  const locale = useLocale((s) => s.locale);
  if (!state) return null;
  const hasTarget = Boolean(state.selectedNodeId || state.selectedEdgeId);
  const targetId = state.selectedEdgeId ?? state.selectedNodeId;
  const step = nextStep(state, { hasTarget, hasMove: Boolean(move && move.targetId === targetId) });
  if (!step) return null;
  const index = STEP_ORDER.indexOf(step as (typeof STEP_ORDER)[number]);
  return (
    <p
      className="next-step flex items-center gap-2 border-b border-border bg-bg/70 px-3 py-1.5 text-[12px] leading-snug text-paper"
      role="status"
      aria-live="polite"
    >
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-olive">
        {t(locale, "move.step")}
        {index >= 0 ? ` ${index + 1}/${STEP_ORDER.length}` : ""}
      </span>
      <span>{t(locale, `move.next.${step}`)}</span>
    </p>
  );
}

/** Exact before → after rows; direction is shown by sign and arrow, not colour alone. */
export function ChangeList({ changes, empty }: { changes: Change[]; empty?: string }) {
  const locale = useLocale((s) => s.locale);
  if (!changes.length) return empty ? <p className="text-[11px] text-muted">{empty}</p> : null;
  return (
    <ul className="change-list grid gap-1">
      {changes.map((c, i) => {
        const d = c.to - c.from;
        const tone = changeTone(c);
        return (
          <li
            key={i}
            className="flex items-baseline justify-between gap-2 rounded-sm bg-bg/50 px-2 py-1 text-[11px]"
          >
            <span className="min-w-0 truncate text-paper">{changeLabel(c, locale)}</span>
            <span
              className={cn(
                "tabular shrink-0 font-mono",
                tone === "good" && "text-olive",
                tone === "bad" && "text-warn",
                tone === "neutral" && "text-muted",
              )}
            >
              {c.from} → {c.to} ({d > 0 ? "▲ +" : "▼ "}
              {d})
            </span>
          </li>
        );
      })}
    </ul>
  );
}
