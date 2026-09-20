import type { InteractiveCopy } from "@/game/i18n";
import { cn } from "@/lib/utils";

export function ExplainCard({
  copy,
  mode = "before",
  className,
}: {
  copy: InteractiveCopy;
  mode?: "before" | "after";
  className?: string;
}) {
  const after = mode === "after";
  return (
    <div className={cn("space-y-1.5 rounded-sm border border-border bg-bg/40 p-2.5 text-xs leading-snug", className)}>
      {copy.label ? <p className="font-medium text-paper">{copy.label}</p> : null}
      {!after && copy.shortExplanation ? <p className="text-muted">{copy.shortExplanation}</p> : null}
      {!after && copy.whyItMatters ? <p className="text-subtle">{copy.whyItMatters}</p> : null}
      {!after && copy.expectedEffect ? <p className="text-olive">{copy.expectedEffect}</p> : null}
      {!after && copy.knownCost ? <p className="text-[11px] text-subtle">{copy.knownCost}</p> : null}
      {!after && copy.uncertainty ? <p className="text-[11px] text-warn">{copy.uncertainty}</p> : null}
      {after && copy.resultExplanation ? <p className="text-fg">{copy.resultExplanation}</p> : null}
      {copy.nextSuggestion ? <p className="text-[11px] text-olive">{copy.nextSuggestion}</p> : null}
    </div>
  );
}
