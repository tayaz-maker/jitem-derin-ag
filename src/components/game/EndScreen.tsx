import { endingCopy, t, useLocale } from "@/game/i18n";
import { formatReplayJson, replayFilename, displayDossier } from "@/game/sim/recap";
import { useGame } from "@/game/store";
import { Button } from "@/components/ui/button";
import { LangSwitch } from "./LangSwitch";

function downloadReplay(stateSeed: number, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = replayFilename(stateSeed);
  a.click();
  URL.revokeObjectURL(url);
}

export function EndScreen() {
  const state = useGame((s) => s.state);
  const start = useGame((s) => s.start);
  const clearSave = useGame((s) => s.clearSave);
  const setScreen = useGame((s) => s.setScreen);
  const locale = useLocale((s) => s.locale);
  if (!state?.ending) return null;
  const end = endingCopy(locale, state.ending);
  const d = displayDossier(state, locale);
  const road = state.ending === "susurluk_patlama" || state.flags.susurluk;
  const replay = formatReplayJson(state);
  const causal = d.causal;

  const blocks: { title: string; body: string }[] = d
    ? [
        { title: t(locale, "end.protected"), body: d.protectedActors.join(", ") || t(locale, "end.none") },
        { title: t(locale, "end.spent"), body: d.sacrificedActors.join(", ") || t(locale, "end.none") },
        { title: t(locale, "end.exposed"), body: d.exposedDocuments.join(", ") || t(locale, "end.none") },
        { title: t(locale, "end.dark"), body: d.suppressedDocuments.join(", ") || t(locale, "end.none") },
        { title: t(locale, "end.risen"), body: d.risenFactions.join(", ") || t(locale, "end.none") },
        { title: t(locale, "end.broken"), body: d.brokenTies.join(", ") || t(locale, "end.none") },
        { title: t(locale, "end.public"), body: d.publicKnowledge.join(", ") || t(locale, "end.rumorFog") },
        { title: t(locale, "end.contra"), body: d.contradictions.slice(0, 3).join(" / ") || t(locale, "end.none") },
        { title: t(locale, "end.drift"), body: d.anchorDrift.join(" ") || t(locale, "end.driftNone") },
        { title: t(locale, "end.order"), body: d.orderLeft },
      ]
    : [];

  return (
    <div className="game-shell relative flex min-h-0 flex-col overflow-hidden bg-bg text-fg">
      <img src={road ? "/images/road.jpg" : "/images/office.jpg"} alt="" className="absolute inset-0 size-full object-cover opacity-35" />
      <div className="absolute inset-0 bg-linear-to-t from-bg via-bg/80 to-bg/50" />
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col justify-end gap-4 overflow-y-auto px-5 pb-14 pt-12">
        <div className="flex items-center justify-between">
          <p className="scan font-mono text-[11px] text-olive">{t(locale, "end.title")}</p>
          <LangSwitch />
        </div>
        <p className="font-mono text-xs text-stamp">{end?.verdict}</p>
        <h1 className="text-4xl font-medium tracking-tight text-paper">{end?.title}</h1>
        <p className="text-sm leading-relaxed text-muted">{end?.body}</p>
        <div className="rounded-md border border-olive/40 bg-surface/80 p-3">
          <p className="text-[11px] font-medium text-olive">{t(locale, "end.why")}</p>
          {causal.map((line) => (
            <p key={line} className="mt-1 text-xs leading-relaxed text-fg">
              {line}
            </p>
          ))}
        </div>
        <p className="font-mono text-[11px] text-subtle">{t(locale, "end.seed", { seed: state.worldSeed, hat: t(locale, `hat.${state.hat}.title`) })}</p>
        {blocks.length ? (
          <dl className="max-h-[36dvh] space-y-2 overflow-y-auto rounded-md border border-border bg-surface/80 p-3 text-xs leading-relaxed">
            {blocks.map((b) => (
              <div key={b.title}>
                <dt className="text-paper">{b.title}</dt>
                <dd className="text-muted">{b.body}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <p className="font-mono text-[11px] leading-relaxed text-subtle">{t(locale, "end.noWin")}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => start(state.hat)}>{t(locale, "end.sameHat")}</Button>
          <Button variant="secondary" onClick={() => start(state.hat, state.worldSeed)}>
            {t(locale, "end.sameSeed")}
          </Button>
          <Button variant="outline" onClick={() => downloadReplay(state.worldSeed, replay)}>
            {t(locale, "end.replay")}
          </Button>
          <Button variant="ghost" onClick={clearSave}>
            {t(locale, "end.close")}
          </Button>
          <Button variant="ghost" onClick={() => setScreen("dosya")}>
            {t(locale, "end.file")}
          </Button>
        </div>
      </div>
    </div>
  );
}
