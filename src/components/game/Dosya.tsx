import { useState } from "react";
import { X } from "lucide-react";
import { EVENTS, NPC_LINES, STAT_META } from "@/game/data";
import { useGame } from "@/game/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { eventCopy, t, useLocale } from "@/game/i18n";
import { LangSwitch } from "./LangSwitch";

const TAB_KEYS = ["Pitch", "Kaynak", "Ağ", "Olaylar", "NPC", "Arayüz"] as const;
const TAB_I18N: Record<(typeof TAB_KEYS)[number], string> = {
  Pitch: "dosya.tabPitch",
  Kaynak: "dosya.tabSource",
  Ağ: "dosya.tabNet",
  Olaylar: "dosya.tabEvents",
  NPC: "dosya.tabNpc",
  Arayüz: "dosya.tabUi",
};

export function Dosya() {
  const setScreen = useGame((s) => s.setScreen);
  const state = useGame((s) => s.state);
  const locale = useLocale((s) => s.locale);
  const [tab, setTab] = useState<(typeof TAB_KEYS)[number]>("Pitch");

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="scan font-mono text-[10px] text-olive">{t(locale, "dosya.kicker")}</p>
          <h1 className="text-lg font-medium">{t(locale, "dosya.title")}</h1>
        </div>
        <div className="flex items-center gap-1">
          <LangSwitch />
          <Button
            variant="ghost"
            size="icon"
            aria-label={t(locale, "dosya.close")}
            onClick={() => setScreen(state ? "play" : "start")}
          >
            <X />
          </Button>
        </div>
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
        {TAB_KEYS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "min-h-10 rounded-sm px-3 py-2 text-xs font-medium",
              tab === id ? "bg-elevated text-paper" : "text-muted hover:text-fg",
            )}
          >
            {t(locale, TAB_I18N[id])}
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
  const locale = useLocale((s) => s.locale);
  return (
    <div className="space-y-3 text-fg/90">
      <p>{t(locale, "dosya.p1")}</p>
      <p>{t(locale, "dosya.p2")}</p>
      <p>{t(locale, "dosya.p3")}</p>
      <p>{t(locale, "dosya.p4")}</p>
    </div>
  );
}

function Kaynak() {
  const locale = useLocale((s) => s.locale);
  return (
    <div className="space-y-4">
      <p>{t(locale, "dosya.stats")}</p>
      <ul className="space-y-2">
        {(Object.keys(STAT_META) as Array<keyof typeof STAT_META>).map((k) => (
          <li key={k}>
            <span className="font-mono text-olive">{t(locale, `stat.${k}.label`)}</span>
            <span className="text-fg"> — {t(locale, `stat.${k}.hint`)}</span>
          </li>
        ))}
      </ul>
      <div className="space-y-1 font-mono text-xs text-subtle">
        <p>{t(locale, "dosya.gizTick")}</p>
        <p>{t(locale, "dosya.karaTick")}</p>
        <p>{t(locale, "dosya.sahaTick")}</p>
        <p>{t(locale, "dosya.gizLeak")}</p>
        <p>{t(locale, "dosya.disputed")}</p>
        <p>{t(locale, "dosya.report")}</p>
        <p>{t(locale, "dosya.ap")}</p>
        <p>{t(locale, "dosya.fail")}</p>
      </div>
    </div>
  );
}

function Ag() {
  const locale = useLocale((s) => s.locale);
  return (
    <div className="space-y-3">
      <p>{t(locale, "dosya.net1")}</p>
      <p>{t(locale, "dosya.net2")}</p>
      <p>{t(locale, "dosya.net3")}</p>
    </div>
  );
}

function Olaylar() {
  const locale = useLocale((s) => s.locale);
  return (
    <ol className="space-y-3">
      {EVENTS.map((e) => {
        const loc = eventCopy(locale, e.id);
        return (
          <li key={e.id}>
            <p className="font-mono text-[11px] text-olive">
              {e.fileNo} · {e.year} · {t(locale, `evidence.${e.evidence}.label`)}
            </p>
            <p className="text-fg">{loc?.title ?? e.title}</p>
            <p className="text-xs">{(loc?.body ?? e.body).slice(0, 140)}…</p>
          </li>
        );
      })}
    </ol>
  );
}

function Npc() {
  const locale = useLocale((s) => s.locale);
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
        <p>{t(locale, "dosya.yesil")}</p>
      </li>
    </ul>
  );
}

function Arayuz() {
  const locale = useLocale((s) => s.locale);
  return (
    <ul className="list-disc space-y-2 pl-4">
      <li>{t(locale, "dosya.ui1")}</li>
      <li>{t(locale, "dosya.ui2")}</li>
      <li>{t(locale, "dosya.ui3")}</li>
      <li>{t(locale, "dosya.ui4")}</li>
      <li>{t(locale, "dosya.ui5")}</li>
    </ul>
  );
}
