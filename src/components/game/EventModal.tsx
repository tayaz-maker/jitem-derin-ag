import { eventViewFor } from "@/game/engine";
import { evidenceTone } from "@/game/evidence";
import { sourceUxFor } from "@/game/sim/authority";
import { EVENTS } from "@/game/data";
import { useGame } from "@/game/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { choiceCopy, eventCopy, familyVariantCopy, t, useLocale, logLine } from "@/game/i18n";

function EventBody() {
  const state = useGame((s) => s.state)!;
  const chooseEvent = useGame((s) => s.chooseEvent);
  const locale = useLocale((s) => s.locale);
  const ev = eventViewFor(state);
  if (!ev) return null;
  const showHidden = state.stats.bilgi >= ev.hiddenBilgi;
  const loc = eventCopy(locale, ev.id);
  const title = loc?.title ?? ev.title;
  const body = loc?.body ?? ev.body;
  const hidden = loc?.hidden ?? ev.hidden;
  const layer = t(locale, `layer.${ev.layer}`);
  const ux = sourceUxFor({
    layer: ev.layer,
    evidence: ev.evidence,
    contradiction: ev.hidden.includes("TARTIŞMALI") ? ev.hidden : null,
  });

  return (
    <article className="flex max-h-full flex-col">
      <p className="text-[11px] font-medium text-olive">
        {t(locale, "event.step")} · {ev.year}
        {ev.anchor ? ` · ${t(locale, "event.anchor")}` : ""}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <h2 className="text-xl font-medium tracking-tight text-paper sm:text-2xl">{title}</h2>
        {ux.map((tag) => (
          <Badge
            key={tag}
            tone={
              tag === "TARTIŞMALI" || tag === "ÇELİŞKİLİ"
                ? "tart"
                : tag === "BELGELİ" || tag === "TARİHSEL ÇIPA"
                  ? "belgeli"
                  : "guc"
            }
          >
            {tag === "TARİHSEL ÇIPA"
              ? t(locale, "layer.historicalFact")
              : tag === "KAYNAK İDDİASI"
                ? t(locale, "layer.sourceClaim")
                : tag}
          </Badge>
        ))}
        <Badge tone={evidenceTone(ev.evidence)}>{t(locale, `evidence.${ev.evidence}.label`)}</Badge>
        <Badge>{layer}</Badge>
      </div>
      <p className="mt-1 font-mono text-[11px] text-muted">{ev.fileNo}</p>
      <p className="mt-3 text-sm leading-relaxed text-fg">{body}</p>
      {ev.addendum ? (
        <p className="mt-3 border-l-2 border-warn/70 pl-3 text-sm leading-relaxed text-muted">
          {familyVariantCopy(locale, ev.addendum, "addendum")}
        </p>
      ) : null}
      {showHidden ? (
        <div className="mt-3 border-l-2 border-olive/70 pl-3">
          <p className="text-[11px] font-medium text-olive">{t(locale, "event.hidden")}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{hidden}</p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-subtle">
          {t(locale, "event.hiddenClosed", { n: ev.hiddenBilgi })}
        </p>
      )}
      <p className="mt-4 text-[11px] font-medium text-olive">{t(locale, "event.pick")}</p>
      <div className="mt-2 grid gap-2">
        {ev.choices.map((c) => {
          const cc = choiceCopy(locale, c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => chooseEvent(c.id)}
              className="min-h-11 rounded-md border border-border bg-bg/50 px-3 py-3 text-left transition-colors duration-(--motion-quick) hover:border-olive/60 hover:bg-elevated"
            >
              <span className="block text-sm font-medium text-fg">{cc?.label ?? c.label}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted">
                {cc?.hint ?? c.hint}
              </span>
            </button>
          );
        })}
      </div>
      <Button
        variant="ghost"
        className="mt-2 w-full text-subtle"
        onClick={() => chooseEvent(ev.choices[0]?.id ?? "")}
      >
        {t(locale, "event.unsure")}
      </Button>
    </article>
  );
}

export function EventModal() {
  const state = useGame((s) => s.state);
  const nextTurn = useGame((s) => s.nextTurn);
  const locale = useLocale((s) => s.locale);
  if (!state) return null;

  if (state.phase === "event") {
    return (
      <div className="p-4 pb-6">
        <EventBody />
      </div>
    );
  }

  const ev = EVENTS.find((e) => e.turn === state.turn);
  const loc = ev ? eventCopy(locale, ev.id) : null;
  return (
    <article className="p-4">
      <p className="text-[11px] font-medium text-olive">
        {t(locale, "pane.olay")} · {ev?.year}
      </p>
      <h2 className="mt-1 text-xl font-medium text-paper">{loc?.title ?? ev?.title ?? "—"}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">{loc?.body ?? ev?.body}</p>
      {state.phase === "resolution" ? (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-medium text-olive">{t(locale, "res.what")}</p>
          {state.lastResolution.map((n, i) => (
            <p key={i} className="text-xs leading-relaxed text-muted">
              {logLine(locale, n)}
            </p>
          ))}
          <Button className="mt-2 w-full" onClick={nextTurn}>
            {t(locale, "res.next")}
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-subtle">{t(locale, "act.step")}</p>
      )}
    </article>
  );
}
