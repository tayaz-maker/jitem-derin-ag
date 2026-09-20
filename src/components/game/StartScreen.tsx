import { FileText, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/game/store";
import { briefingFrom } from "@/game/sim/briefing";
import { applyShellMode } from "@/game/embed";
import { useEffect } from "react";

export function StartScreen() {
  const start = useGame((s) => s.start);
  const load = useGame((s) => s.load);
  const clearSave = useGame((s) => s.clearSave);
  const setScreen = useGame((s) => s.setScreen);
  const saved = useGame((s) => s.state);
  const hydrated = useGame((s) => s.hydrated);

  useEffect(() => {
    applyShellMode();
  }, []);

  const brief = hydrated && saved && saved.phase !== "ended" ? briefingFrom(saved) : null;

  return (
    <div className="game-shell relative flex min-h-0 flex-col overflow-hidden bg-bg text-fg">
      <img src="/images/office.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-linear-to-b from-bg/70 via-bg/80 to-bg" />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-end gap-5 overflow-y-auto px-5 pb-10 pt-12 sm:justify-center sm:pb-16">
        <header className="space-y-2">
          <p className="scan font-mono text-[11px] text-olive">1986–1996 · belgesel strateji</p>
          <h1 className="font-sans text-4xl font-medium tracking-tight text-paper sm:text-6xl">Derin Ağ</h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Bir kişi değilsin. Gayri resmi bir masasın. Ağı çalışır tut, resmen “yok” de. Gizlilik bitince kaybetmezsin
            hemen — soruşturma açılır. Tek el komplo yok.
          </p>
        </header>

        {brief ? (
          <section className="rounded-md border border-olive/40 bg-surface/90 p-4">
            <p className="scan font-mono text-[10px] text-olive">Kaldığın yer</p>
            <h2 className="mt-1 text-lg font-medium text-paper">
              {brief.act} · {brief.year}
            </h2>
            <p className="mt-1 text-sm text-fg">{brief.lastEvent}</p>
            <dl className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2">
              <div>
                <dt className="text-paper">Soruşturma</dt>
                <dd>{brief.investigation}</dd>
              </div>
              <div>
                <dt className="text-paper">Kritik bağlar</dt>
                <dd>{brief.criticalTies.join(" · ")}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-paper">Sıradaki problem</dt>
                <dd>{brief.nextProblem}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => load()} className="min-h-11">
                <Play /> Devam · {brief.hat === "saha" ? "saha" : "idari"} T{brief.turn}
              </Button>
              <Button variant="ghost" onClick={clearSave} className="min-h-11">
                <RotateCcw /> Baştan
              </Button>
            </div>
          </section>
        ) : null}

        <ol className="grid gap-2 rounded-md border border-border bg-surface/85 p-4 text-sm text-muted sm:grid-cols-3">
          <li>
            <span className="block font-medium text-paper">1. Duruş</span>
            Dönem olayını oku, üç seçenekten birini seç.
          </li>
          <li>
            <span className="block font-medium text-paper">2. Kapasite</span>
            Ağır iş 2–3, bakış 1. Saha 5, idari 4. İki buton değil; risk seç.
          </li>
          <li>
            <span className="block font-medium text-paper">3. Tur</span>
            Kapat. Diğer hatlar kendi bildikleriyle hareket eder.
          </li>
        </ol>

        <div className="grid gap-3 sm:grid-cols-2">
          <HatCard
            kicker="5 kapasite · ısı"
            title="Saha hattı"
            body="Tim ve itirafçı. Yüksek operasyon, ince gizlilik. İlk oyunda bunu seç."
            onClick={() => start("saha")}
          />
          <HatCard
            kicker="4 kapasite · kalkan"
            title="İdari hat"
            body="Dosya ve inkâr dili. Daha az doğrudan iş, daha verimli koruma."
            onClick={() => start("idari")}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setScreen("dosya")} className="min-h-11">
            <FileText /> Nasıl oynanır
          </Button>
        </div>
      </div>
    </div>
  );
}

function HatCard({
  kicker,
  title,
  body,
  onClick,
}: {
  kicker: string;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-md border border-border bg-surface/80 p-4 text-left transition-colors duration-(--motion-fast) hover:border-olive/60 hover:bg-elevated"
    >
      <p className="text-[11px] font-medium text-olive">{kicker}</p>
      <p className="mt-1 text-lg font-medium text-fg">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      <p className="mt-4 text-xs text-paper group-hover:text-olive">Kampanyayı aç →</p>
    </button>
  );
}
