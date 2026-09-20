import { FileText, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/game/store";
import { SAVE_KEY } from "@/game/types";
import { useMemo } from "react";

export function StartScreen() {
  const start = useGame((s) => s.start);
  const load = useGame((s) => s.load);
  const clearSave = useGame((s) => s.clearSave);
  const setScreen = useGame((s) => s.setScreen);
  const saved = useGame((s) => s.state);

  const hasSave = useMemo(() => {
    if (saved && saved.phase !== "ended") return true;
    try {
      return Boolean(localStorage.getItem(SAVE_KEY));
    } catch {
      return false;
    }
  }, [saved]);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-bg text-fg">
      <img
        src="/images/office.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-linear-to-b from-bg/70 via-bg/80 to-bg" />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-end gap-6 px-5 pb-10 pt-14 sm:justify-center sm:pb-16">
        <header className="space-y-3">
          <p className="scan font-mono text-[11px] text-olive">
            1986–1996 · belgesel strateji
          </p>
          <h1 className="font-sans text-5xl font-medium tracking-tight text-paper sm:text-6xl">
            Derin Ağ
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Bir kişi değilsin. Gayri resmi bir masasın. Ağı çalışır tut, resmen
            “yok” de. Gizlilik bitince kaybetmezsin hemen — soruşturma açılır.
            Tek el komplo yok.
          </p>
          <p className="max-w-xl text-xs leading-relaxed text-subtle">
            Bu oyun, farklı kaynaklarda yer alan belge, tanıklık, iddia ve
            tartışmaları tarihsel-politik bir strateji deneyimine dönüştürür.
            Kanıt seviyeleri ayrı tutulur. Tartışmalı anlatılar kesin hüküm değildir.
          </p>
        </header>

        <ol className="grid gap-2 rounded-md border border-border bg-surface/85 p-4 text-sm text-muted sm:grid-cols-3">
          <li>
            <span className="block font-medium text-paper">1. Duruş</span>
            Dönem olayını oku, üç seçenekten birini seç.
          </li>
          <li>
            <span className="block font-medium text-paper">2. İşler</span>
            Bağı, kişiyi, gerçeği seç. 2–3 iş. Emredemediğin şeyler Dosya’da.
          </li>
          <li>
            <span className="block font-medium text-paper">3. Tur</span>
            Kapat. Diğer hatlar (MİT, Emniyet, JİTEM) kendi çıkarlarıyla hareket eder.
          </li>
        </ol>

        <div className="grid gap-3 sm:grid-cols-2">
          <HatCard
            kicker="Kolay anlaşılır · 3 iş"
            title="Saha hattı"
            body="Tim ve itirafçı. Güçlü saha, ince gizlilik. İlk oyunda bunu seç."
            onClick={() => start("saha")}
          />
          <HatCard
            kicker="2 iş · kalın kalkan"
            title="İdari hat"
            body="Dosya ve inkâr dili. Daha az iş hakkı, daha çok koruma."
            onClick={() => start("idari")}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasSave ? (
            <>
              <Button onClick={() => load()} className="min-h-11">
                <Play /> Kaldığım yerden
              </Button>
              <Button variant="ghost" onClick={clearSave} className="min-h-11">
                <RotateCcw /> Baştan
              </Button>
            </>
          ) : null}
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
