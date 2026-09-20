import { detectShellMode } from "@/game/embed";
import { t, useLocale } from "@/game/i18n";
import { cn } from "@/lib/utils";

export function LangSwitch({ compact = true }: { compact?: boolean }) {
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  if (typeof window !== "undefined" && detectShellMode() === "embedded") return null;

  return (
    <div className={cn("inline-flex rounded-sm border border-border bg-bg/50 p-0.5", compact && "text-[10px]")} role="group" aria-label={t(locale, "lang.label")}>
      {(["tr", "en"] as const).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => setLocale(id)}
          className={cn(
            "min-h-8 min-w-8 rounded-sm px-1.5 font-mono font-medium",
            locale === id ? "bg-elevated text-paper" : "text-muted hover:text-fg",
          )}
          aria-pressed={locale === id}
        >
          {t(locale, `lang.${id}`)}
        </button>
      ))}
    </div>
  );
}
