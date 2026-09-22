import { useGame } from "@/game/store";
import { actLabel, mechanicUnlocked } from "@/game/sim/acts";
import { investigationView } from "@/game/sim/investigation";
import { visibleObjectives } from "@/game/sim/objectives";
import { factionSignals } from "@/game/sim/intel";
import { t, useLocale, logEntryLine, logLine } from "@/game/i18n";
import { ClaimDrawer } from "./ClaimDrawer";

export function EventLog() {
  const state = useGame((s) => s.state);
  const locale = useLocale((s) => s.locale);
  if (!state) return null;
  const logs = [...state.logs].slice(-8).reverse();

  return (
    <footer className="hidden h-[96px] shrink-0 border-t border-border bg-bg/90 lg:block">
      <div className="flex h-full flex-col px-4 py-1.5">
        <p className="text-[11px] font-medium text-olive">
          {t(locale, "report.log")} · {actLabel(state, locale)}
        </p>
        <ol className="mt-1 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {logs.map((l, i) => (
            <li key={`${l.turn}-${i}-${l.text.slice(0, 12)}`} className="flex gap-3 text-xs leading-snug">
              <span className="w-16 shrink-0 font-mono text-[10px] text-subtle">{l.year}</span>
              <span
                className={
                  l.kind === "olay"
                    ? "text-paper"
                    : l.kind === "npc"
                      ? "text-warn"
                      : l.kind === "aksiyon"
                        ? "text-olive"
                        : "text-muted"
                }
              >
                {logEntryLine(locale, l)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </footer>
  );
}

export function ReportPane() {
  const state = useGame((s) => s.state);
  const locale = useLocale((s) => s.locale);
  const claimId = useGame((s) => s.claimId);
  const setClaimId = useGame((s) => s.setClaimId);
  if (!state) return null;
  const logs = [...state.logs].slice(-12).reverse();
  const hand = Object.values(state.hand).filter((h) => h.status !== "UNKNOWN");
  const objs = visibleObjectives(state);
  const showFac = mechanicUnlocked(state, "knowledge") || state.turn >= 3;
  const inv = investigationView(state);
  const signals = factionSignals(state);

  return (
    <div className="space-y-4">
      <div>
        <p className="scan font-mono text-[10px] text-olive">{actLabel(state, locale)}</p>
        <h2 className="text-lg font-medium text-paper">{t(locale, "report.title")}</h2>
        <p className="mt-1 text-xs text-subtle">{t(locale, "report.blurb")}</p>
      </div>
      {inv.stage !== "dormant" || mechanicUnlocked(state, "investigation") ? (
        <div className="rounded-sm border border-border bg-bg/30 p-2">
          <p className="text-[11px] font-medium text-olive">
            {t(locale, "inv.title")} · {t(locale, `inv.${inv.stage}`)} · {t(locale, "inv.heat")} {inv.heat}
          </p>
          <p className="mt-1 text-xs leading-snug text-muted">{t(locale, `inv.why.${inv.stage}`)}</p>
        </div>
      ) : null}
      {objs.length ? (
        <ul className="space-y-1">
          {objs.map((o) => (
            <li key={o.id} className="text-xs text-muted">
              {o.status === "done" ? "✓" : o.status === "failed" ? "×" : "·"} {t(locale, `obj.${o.id}`)}
            </li>
          ))}
        </ul>
      ) : null}
      <div>
        <p className="text-[11px] font-medium text-olive">{t(locale, "report.hand")}</p>
        <ul className="mt-1 space-y-1">
          {hand.map((h) => (
            <li key={h.claimId}>
              <button
                type="button"
                className="text-left text-xs text-muted underline-offset-2 hover:text-paper"
                onClick={() => setClaimId(h.claimId)}
              >
                {h.claimId.replace("clm_", "")}: {t(locale, `know.${h.status}`)} ({h.confidence}%)
              </button>
            </li>
          ))}
        </ul>
        {claimId ? <div className="mt-2"><ClaimDrawer claimId={claimId} onClose={() => setClaimId(null)} /></div> : null}
      </div>
      {showFac ? (
        <div>
          <p className="text-[11px] font-medium text-olive">{t(locale, "report.intel")}</p>
          <ul className="mt-1 space-y-2">
            {signals.map((s) => (
              <li key={s.faction} className="text-xs leading-snug text-muted">
                <span className="font-mono text-[10px] text-olive">{t(locale, `fog.${s.grade}`)}</span>{" "}
                {s.headline.startsWith("intel.") ? t(locale, s.headline) : s.headline}
                {s.why === "press" ? (
                  <>
                    <span className="mt-0.5 block text-paper">{t(locale, "intel.pressGrow")}</span>
                    <span className="block text-subtle">{t(locale, "intel.pressGrowWhy")}</span>
                    <span className="block text-stamp">{t(locale, "intel.pressGrowRisk")}</span>
                  </>
                ) : s.why ? (
                  <>
                    <span className="mt-0.5 block text-subtle">{t(locale, `intel.why.${s.why}`)}</span>
                    {s.risk ? <span className="block text-stamp">{t(locale, `intel.risk.${s.risk}`)}</span> : null}
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[11px] text-subtle">{t(locale, "hat.arastirmaci.body")}</p>
      )}
      <div>
        <p className="text-[11px] font-medium text-olive">{t(locale, "report.log")}</p>
        <ol className="mt-1 space-y-1">
          {logs.map((l, i) => (
            <li key={i} className="text-xs leading-snug text-muted">
              {l.key ? logEntryLine(locale, l) : logLine(locale, l.text)}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
