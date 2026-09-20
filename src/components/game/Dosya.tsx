import { useState } from "react";
import { X } from "lucide-react";
import { EVENTS, NPC_LINES, STAT_META } from "@/game/data";
import { useGame } from "@/game/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = ["Pitch", "Kaynak", "Ağ", "Olaylar", "NPC", "Arayüz"] as const;

export function Dosya() {
  const setScreen = useGame((s) => s.setScreen);
  const state = useGame((s) => s.state);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Pitch");

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="scan font-mono text-[10px] text-olive">Arşiv notu</p>
          <h1 className="text-lg font-medium">Derin Ağ — dosya</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Kapat"
          onClick={() => setScreen(state ? "play" : "start")}
        >
          <X />
        </Button>
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-sm px-3 py-2 text-xs font-medium",
              tab === t ? "bg-elevated text-paper" : "text-muted hover:text-fg",
            )}
          >
            {t}
          </button>
        ))}
      </nav>
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-6 text-sm leading-relaxed text-muted">
        {tab === "Pitch" ? <Pitch /> : null}
        {tab === "Kaynak" ? <Kaynak /> : null}
        {tab === "Ağ" ? <Ag /> : null}
        {tab === "Olaylar" ? <Olaylar /> : null}
        {tab === "NPC" ? <Npc /> : null}
        {tab === "Arayüz" ? <Arayuz /> : null}
      </div>
    </div>
  );
}

function Pitch() {
  return (
    <div className="space-y-3 text-fg/90">
      <p>
        <strong className="text-paper">Derin Ağ</strong> tek oyunculu, tur tabanlı
        bir yönetim ve ilişki grafı oyunudur. Oyuncu bir şahıs değildir; gayri resmi
        bir özel harp / istihbarat–mafya kesişim masasıdır. 1986–1996 kampanyası,
        saha hattı (Ersever tipi) veya idari hat (Doğan tipi) ile açılır.
      </p>
      <p>
        Her tur üç soru: bu bağı güçlendireyim mi; bu kişiyi koruyayım mı harcayayım mı;
        gerçeği açayım mı düzeni tutayım mı. Cevaplar puan değil — taraf bilgisi, sadakat,
        soruşturma ve alternatif son üretir. Saha 5 kapasite, idari 4. Ağır iş 2–3, bakış 1.
      </p>
      <p>
        Emredebilirsin: saha kapasitesi, inkâr, var olan bağ, kendi ağındaki kişi.
        Etkilersin: MİT/Emniyet soğutma, Ankara, basın. Asla: çıpa ölümler, 3 Kasım,
        uydurma bağ, suikast emri, diğer kurumun kafasındaki bilgi.
      </p>
      <p>
        Kaybetme: GİZ çöker, komuta kayması felakete döner, konuşan içerideki
        (Ersever eşiği) kırılır, veya Susurluk tipi görünürlük patlar. Tek doğru
        komplo çözümü yoktur. Parçalı, rekabetçi, çoğu zaman birbirinden habersiz
        çıkar ağları. Resmi inkâr ile fiilî yapı gerilimi korunur. Uydurma tarihsel
        bağ üretilmez.
      </p>
    </div>
  );
}

function Kaynak() {
  return (
    <div className="space-y-4">
      <p>Beş stat, 0–100. Tur sonu tick + aksiyon + NPC.</p>
      <ul className="space-y-2">
        {Object.values(STAT_META).map((s) => (
          <li key={s.label}>
            <span className="font-mono text-olive">{s.label}</span>
            <span className="text-fg"> — {s.hint}</span>
          </li>
        ))}
      </ul>
      <div className="space-y-1 font-mono text-xs text-subtle">
        <p>GİZ tick = 1 + bağ sıkılığı / 8</p>
        <p>{"KARA < 20 → SAHA −4"}</p>
        <p>SAHA ≥ 50 → KARA +3</p>
        <p>{"GİZ < 40 → BİLGİ −2 (asimetri erir)"}</p>
        <p>TARTIŞMALI bağ güçlendirme: GİZ −10</p>
        <p>Rapor: BİLGİ +14, GİZ −9, sis açılır</p>
        <p>Saha hattı 3 AP / idari 2 AP</p>
        <p>
          {"GİZ < 12 anında ifşa. Tur 10: GİZ≥28 ve SAHA≥18 ve ETKİ≥16 → kontrol"}
        </p>
      </div>
    </div>
  );
}

function Ag() {
  return (
    <div className="space-y-3">
      <p>16 düğüm, yalnızca kaynakta geçen bağlar. Yeni efsane hat yok.</p>
      <p>
        Kurum: JİTEM, MİT, Emniyet. Kişi: Doğan, Ersever, Küçük, Abas, Eymür, Eken,
        Yeşil, Aygan, Çatlı, Kocadağ, Bucak, Gonca Us. Koridor: Güneydoğu saha.
      </p>
      <p>
        BELGELİ kilit (Çatlı–Kocadağ–Bucak–Gonca) 3 Kasım’da atılır. TARTIŞMALI
        bağlar güçlendirilebilir; ifşa maliyeti yüksektir. Sis: BİLGİ eşiği veya
        dönem olayı açar.
      </p>
    </div>
  );
}

function Olaylar() {
  return (
    <ol className="space-y-3">
      {EVENTS.map((e) => (
        <li key={e.id}>
          <p className="font-mono text-[11px] text-olive">
            {e.fileNo} · {e.year} · {e.evidence}
          </p>
          <p className="text-fg">{e.title}</p>
          <p className="text-xs">{e.body.slice(0, 140)}…</p>
        </li>
      ))}
    </ol>
  );
}

function Npc() {
  return (
    <ul className="space-y-3">
      {NPC_LINES.map((n) => (
        <li key={n.id}>
          <p className="text-fg">{n.name}</p>
          <p>{n.wants}</p>
        </li>
      ))}
      <li>
        <p className="text-fg">Yeşil</p>
        <p>Emir kulu operatif. Kendi başına karar verici değil. Saha şişirir, GİZ yer.</p>
      </li>
    </ul>
  );
}

function Arayuz() {
  return (
    <ul className="list-disc space-y-2 pl-4">
      <li>Üst bar: dönem + 5 stat (dokununca açıklama)</li>
      <li>Sol: ilişki haritası</li>
      <li>Sağ: İşler / seçili kişi</li>
      <li>Olay kartı: her dönemde 3 duruş</li>
      <li>Alt: kayıt</li>
    </ul>
  );
}
