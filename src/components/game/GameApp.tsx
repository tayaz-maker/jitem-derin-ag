import { useEffect } from "react";
import { useGame } from "@/game/store";
import { onboardingHint } from "@/game/engine";
import { applyShellMode } from "@/game/embed";
import type { MobilePane } from "@/game/types";
import { bindParentLocale, t, useLocale } from "@/game/i18n";
import { Dosya } from "./Dosya";
import { EndScreen } from "./EndScreen";
import { EventLog, ReportPane } from "./EventLog";
import { EventModal } from "./EventModal";
import { NodeGraph } from "./NodeGraph";
import { PersonPane, SidePanel } from "./SidePanel";
import { StartScreen } from "./StartScreen";
import { TopBar } from "./TopBar";
import { cn } from "@/lib/utils";

export function GameApp() {
  const hydrate = useGame((s) => s.hydrate);
  const persist = useGame((s) => s.persist);
  const hydrated = useGame((s) => s.hydrated);
  const screen = useGame((s) => s.screen);
  const state = useGame((s) => s.state);
  const mobilePane = useGame((s) => s.mobilePane);
  const setMobilePane = useGame((s) => s.setMobilePane);
  const locale = useLocale((s) => s.locale);
  const hydrateLocale = useLocale((s) => s.hydrate);

  useEffect(() => {
    applyShellMode();
    hydrateLocale();
    hydrate();
    return bindParentLocale();
  }, [hydrate, hydrateLocale]);

  useEffect(() => {
    const onHide = () => persist();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [persist]);

  if (screen === "dosya") return <Dosya />;
  if (screen === "start" || !state || !hydrated) return <StartScreen />;
  if (state.phase === "ended") return <EndScreen />;

  const hintKey = onboardingHint(state);
  const hint = hintKey ? t(locale, hintKey) : null;
  const eventOpen = state.phase === "event";
  const PANES: { id: MobilePane; label: string }[] = [
    { id: "map", label: t(locale, "pane.map") },
    { id: "olay", label: t(locale, "pane.olay") },
    { id: "kisi", label: t(locale, "pane.kisi") },
    { id: "isler", label: t(locale, "pane.isler") },
    { id: "rapor", label: t(locale, "pane.rapor") },
  ];

  return (
    <div className="game-shell flex min-h-0 flex-col bg-bg text-fg">
      <TopBar />
      {hint ? (
        <p className="border-b border-border bg-olive/10 px-3 py-1.5 text-[11px] leading-snug text-paper lg:hidden">
          {hint}
        </p>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <div
          className={cn(
            "grid h-full min-h-0 grid-rows-1",
            eventOpen
              ? "lg:grid-cols-[minmax(320px,1fr)_minmax(380px,520px)_minmax(260px,320px)]"
              : "lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]",
          )}
        >
          <div
            className={cn(
              "min-h-0",
              mobilePane === "map" || eventOpen ? "block" : "hidden lg:block",
            )}
          >
            <NodeGraph />
          </div>
          {eventOpen ? (
            <section
              aria-label={t(locale, "pane.olay")}
              className="hidden min-h-0 overflow-y-auto overscroll-contain border-l border-border bg-surface lg:block"
            >
              <EventModal />
            </section>
          ) : null}
          <div
            className={cn(
              "min-h-0 overflow-y-auto",
              mobilePane === "isler" || mobilePane === "kisi" ? "block" : "hidden lg:block",
            )}
          >
            <div className="hidden h-full lg:block">
              <SidePanel />
            </div>
            <div className="lg:hidden">
              {mobilePane === "kisi" ? <PersonPane /> : <SidePanel />}
            </div>
          </div>
          {mobilePane === "olay" && !eventOpen ? (
            <div className="min-h-0 overflow-y-auto lg:hidden">
              <EventModal />
            </div>
          ) : null}
          {mobilePane === "rapor" ? (
            <div className="min-h-0 overflow-y-auto p-3 lg:hidden">
              <ReportPane />
            </div>
          ) : null}
        </div>

        {eventOpen ? (
          <div className="absolute inset-x-0 bottom-0 top-[16%] z-30 overflow-y-auto overscroll-contain rounded-t-lg border-t border-border bg-surface shadow-[0_-8px_24px_rgba(0,0,0,0.35)] lg:hidden">
            <div className="mx-auto min-h-full w-full max-w-xl">
              <div className="w-full bg-surface p-4">
                <EventModal />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <EventLog />

      <nav className="safe-bottom z-40 grid grid-cols-5 border-t border-border bg-surface lg:hidden">
        {PANES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setMobilePane(p.id)}
            className={cn(
              "min-h-12 px-1 text-[11px] font-medium",
              mobilePane === p.id || (eventOpen && p.id === "olay")
                ? "bg-elevated text-paper"
                : "text-muted",
            )}
          >
            {p.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
