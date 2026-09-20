import { useEffect } from "react";
import { useGame } from "@/game/store";
import { onboardingHint } from "@/game/engine";
import type { MobilePane } from "@/game/types";
import { Dosya } from "./Dosya";
import { EndScreen } from "./EndScreen";
import { EventLog, ReportPane } from "./EventLog";
import { EventModal } from "./EventModal";
import { NodeGraph } from "./NodeGraph";
import { PersonPane, SidePanel } from "./SidePanel";
import { StartScreen } from "./StartScreen";
import { TopBar } from "./TopBar";
import { cn } from "@/lib/utils";

const PANES: { id: MobilePane; label: string }[] = [
  { id: "map", label: "Harita" },
  { id: "olay", label: "Olay" },
  { id: "kisi", label: "Kişi" },
  { id: "isler", label: "İşler" },
  { id: "rapor", label: "Rapor" },
];

export function GameApp() {
  const hydrate = useGame((s) => s.hydrate);
  const persist = useGame((s) => s.persist);
  const hydrated = useGame((s) => s.hydrated);
  const screen = useGame((s) => s.screen);
  const state = useGame((s) => s.state);
  const mobilePane = useGame((s) => s.mobilePane);
  const setMobilePane = useGame((s) => s.setMobilePane);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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

  const hint = onboardingHint(state);

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-bg text-fg">
      <TopBar />
      {hint ? (
        <p className="border-b border-border bg-olive/10 px-3 py-2 text-xs text-paper lg:hidden">
          {hint}
        </p>
      ) : null}
      <div className="flex gap-0.5 border-b border-border px-1 py-1 lg:hidden">
        {PANES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setMobilePane(p.id)}
            className={cn(
              "min-h-10 flex-1 rounded-sm px-1 text-[11px]",
              mobilePane === p.id ? "bg-elevated text-paper" : "text-muted",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="relative grid min-h-0 flex-1 grid-rows-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <div className={cn("min-h-0", mobilePane === "map" ? "block" : "hidden lg:block")}>
          <NodeGraph />
        </div>
        <div className={cn("min-h-0 overflow-y-auto", mobilePane === "isler" || mobilePane === "kisi" ? "block" : "hidden lg:block")}>
          <div className="hidden h-full lg:block">
            <SidePanel />
          </div>
          <div className="lg:hidden">
            {mobilePane === "kisi" ? <PersonPane /> : <SidePanel />}
          </div>
        </div>
        {mobilePane === "olay" ? (
          <div className="min-h-0 overflow-y-auto lg:hidden">
            <EventModal embedded />
          </div>
        ) : null}
        {mobilePane === "rapor" ? (
          <div className="min-h-0 overflow-y-auto p-3 lg:hidden">
            <ReportPane />
          </div>
        ) : null}
        <EventModal />
      </div>
      <EventLog />
    </div>
  );
}
