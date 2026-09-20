import { endingOf } from "@/game/engine";
import { formatReplay } from "@/game/sim/recap";
import { useGame } from "@/game/store";
import { Button } from "@/components/ui/button";

function downloadReplay(text: string, seed: number) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `derin-ag-${seed}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function EndScreen() {
  const state = useGame((s) => s.state);
  const start = useGame((s) => s.start);
  const clearSave = useGame((s) => s.clearSave);
  const setScreen = useGame((s) => s.setScreen);
  if (!state?.ending) return null;
  const end = endingOf(state.ending);
  const d = state.dossier;
  const road = state.ending === "susurluk_patlama" || state.flags.susurluk;
  const replay = formatReplay(state);

  const blocks: { title: string; body: string }[] = d
    ? [
        { title: "Korudukların", body: d.protectedActors.join(", ") || "—" },
        { title: "Harcadıkların", body: d.sacrificedActors.join(", ") || "—" },
        { title: "Açığa çıkanlar", body: d.exposedDocuments.join(", ") || "—" },
        { title: "Karanlıkta kalanlar", body: d.suppressedDocuments.join(", ") || "—" },
        { title: "Güçlenen kurumlar", body: d.risenFactions.join(", ") || "—" },
        { title: "Dağılan ilişkiler", body: d.brokenTies.join(", ") || "—" },
        { title: "Kamuoyunun bildiği", body: d.publicKnowledge.join(", ") || "söylenti / sis" },
        { title: "Kaynakların çeliştiği noktalar", body: d.contradictions.slice(0, 3).join(" / ") || "—" },
        { title: "Tarihsel çıpalardan sapmalar", body: d.anchorDrift.join(" ") || "Çıpa takvimi aynı kaldı; kim dahil oldu değişti." },
        { title: "Senin bıraktığın düzen", body: d.orderLeft },
      ]
    : [];

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-bg text-fg">
      <img src={road ? "/images/road.jpg" : "/images/office.jpg"} alt="" className="absolute inset-0 size-full object-cover opacity-35" />
      <div className="absolute inset-0 bg-linear-to-t from-bg via-bg/80 to-bg/50" />
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col justify-end gap-4 px-5 pb-14 pt-16">
        <p className="scan font-mono text-[11px] text-olive">SENİN 1986–1996 HİKÂYEN</p>
        <p className="font-mono text-xs text-stamp">{end.verdict}</p>
        <h1 className="text-4xl font-medium tracking-tight text-paper">{end.title}</h1>
        <p className="text-sm leading-relaxed text-muted">{end.body}</p>
        <p className="font-mono text-[11px] text-subtle">tohum {state.worldSeed} · {state.hat} hattı</p>
        {blocks.length ? (
          <dl className="max-h-[40dvh] space-y-2 overflow-y-auto rounded-md border border-border bg-surface/80 p-3 text-xs leading-relaxed">
            {blocks.map((b) => (
              <div key={b.title}>
                <dt className="text-paper">{b.title}</dt>
                <dd className="text-muted">{b.body}</dd>
              </div>
            ))}
          </dl>
        ) : state.recap.length ? (
          <ul className="space-y-1.5 rounded-md border border-border bg-surface/80 p-3 text-xs leading-relaxed text-muted">
            {state.recap.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : null}
        <dl className="grid grid-cols-4 gap-2 border border-border bg-surface/80 p-3 sm:grid-cols-8">
          {Object.entries(state.stats).map(([k, v]) => (
            <div key={k}>
              <dt className="scan font-mono text-[9px] text-subtle">{k}</dt>
              <dd className="tabular font-mono text-sm text-paper">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="font-mono text-[11px] leading-relaxed text-subtle">
          Kazanmak / kaybetmek yoktu. Parçalı çıkar ağları kendi bildikleriyle yürüdü.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => start(state.hat)}>Aynı hat, yeni tohum</Button>
          <Button variant="secondary" onClick={() => start(state.hat, state.worldSeed)}>
            Aynı tohum
          </Button>
          <Button variant="outline" onClick={() => downloadReplay(replay, state.worldSeed)}>
            Replay indir
          </Button>
          <Button variant="ghost" onClick={clearSave}>
            Masa kapat
          </Button>
          <Button variant="ghost" onClick={() => setScreen("dosya")}>
            Dosya
          </Button>
        </div>
      </div>
    </div>
  );
}
