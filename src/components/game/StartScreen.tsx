import { FileText, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/game/store";
import { briefingFrom } from "@/game/sim/briefing";
import { applyShellMode } from "@/game/embed";
import { useEffect } from "react";
import type { Hat } from "@/game/types";
import { bindParentLocale, t, useLocale } from "@/game/i18n";
import { LangSwitch } from "./LangSwitch";

export function StartScreen() {
  const start = useGame((s) => s.start);
  const load = useGame((s) => s.load);
  const clearSave = useGame((s) => s.clearSave);
  const setScreen = useGame((s) => s.setScreen);
  const saved = useGame((s) => s.state);
  const hydrated = useGame((s) => s.hydrated);
  const locale = useLocale((s) => s.locale);
  const hydrateLocale = useLocale((s) => s.hydrate);

  useEffect(() => {
    applyShellMode();
    hydrateLocale();
    return bindParentLocale();
  }, [hydrateLocale]);

  const brief = hydrated && saved && saved.phase !== "ended" ? briefingFrom(saved, locale) : null;

  return (
    <div className="game-shell relative flex min-h-0 flex-col overflow-hidden bg-bg text-fg">
      <img
        src="/images/office.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-linear-to-b from-bg/70 via-bg/80 to-bg" />

      <div className="relative z-10 mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto overscroll-contain px-5 py-10 sm:py-12">
        <div className="my-auto flex flex-col gap-5">
          <header className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="scan font-mono text-[11px] text-olive">{t(locale, "meta.kicker")}</p>
              <LangSwitch />
            </div>
            <h1 className="font-sans text-4xl font-medium tracking-tight text-paper sm:text-6xl">
              {t(locale, "meta.title")}
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              {t(locale, "meta.pitch")}
            </p>
          </header>

          <p className="rounded-md border border-border bg-bg/70 px-3 py-2 text-xs leading-relaxed text-muted">
            {t(locale, "start.contentNote")}
          </p>

          {brief ? (
            <section className="rounded-md border border-olive/40 bg-surface/90 p-4">
              <p className="scan font-mono text-[10px] text-olive">{t(locale, "start.stayed")}</p>
              <h2 className="mt-1 text-lg font-medium text-paper">
                {brief.act} · {brief.year}
              </h2>
              <p className="mt-1 text-sm text-fg">{brief.lastEvent}</p>
              <dl className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2">
                <div>
                  <dt className="text-paper">{t(locale, "start.investigation")}</dt>
                  <dd>{brief.investigation}</dd>
                </div>
                <div>
                  <dt className="text-paper">{t(locale, "start.ties")}</dt>
                  <dd>{brief.criticalTies.join(" · ")}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-paper">{t(locale, "start.next")}</dt>
                  <dd>{brief.nextProblem}</dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => load()} className="min-h-11">
                  <Play /> {t(locale, "start.continue")} · {t(locale, `hat.${brief.hat}.title`)} T
                  {brief.turn}
                </Button>
                <Button variant="ghost" onClick={clearSave} className="min-h-11">
                  <RotateCcw /> {t(locale, "start.reset")}
                </Button>
              </div>
            </section>
          ) : null}

          <ol className="grid gap-2 rounded-md border border-border bg-surface/85 p-4 text-sm text-muted sm:grid-cols-3">
            <li>
              <span className="block font-medium text-paper">{t(locale, "start.step1t")}</span>
              {t(locale, "start.step1")}
            </li>
            <li>
              <span className="block font-medium text-paper">{t(locale, "start.step2t")}</span>
              {t(locale, "start.step2")}
            </li>
            <li>
              <span className="block font-medium text-paper">{t(locale, "start.step3t")}</span>
              {t(locale, "start.step3")}
            </li>
          </ol>

          <div className="grid gap-3 sm:grid-cols-2">
            {(["saha", "idari", "arastirmaci", "hukuk"] as Hat[]).map((hat) => (
              <HatCard
                key={hat}
                kicker={t(locale, `hat.${hat}.kicker`)}
                title={t(locale, `hat.${hat}.title`)}
                body={t(locale, `hat.${hat}.body`)}
                badge={
                  hat === "arastirmaci" || hat === "hukuk"
                    ? t(locale, "start.experimental")
                    : undefined
                }
                onClick={() => start(hat)}
                openLabel={t(locale, "start.open")}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setScreen("dosya")} className="min-h-11">
              <FileText /> {t(locale, "start.how")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HatCard({
  kicker,
  title,
  body,
  badge,
  onClick,
  openLabel,
}: {
  kicker: string;
  title: string;
  body: string;
  badge?: string;
  onClick: () => void;
  openLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-md border border-border bg-surface/80 p-4 text-left transition-colors duration-(--motion-fast) hover:border-olive/60 hover:bg-elevated"
    >
      <p className="text-[11px] font-medium text-olive">{kicker}</p>
      {badge ? (
        <p className="mt-1 text-[10px] font-medium tracking-wide text-warn">{badge}</p>
      ) : null}
      <p className="mt-1 text-lg font-medium text-fg">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      <p className="mt-4 text-xs text-paper group-hover:text-olive">{openLabel}</p>
    </button>
  );
}
