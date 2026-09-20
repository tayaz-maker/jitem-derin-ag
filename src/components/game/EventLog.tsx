import { useGame } from "@/game/store";
import { actLabel, mechanicUnlocked } from "@/game/sim/acts";
import { investigationView } from "@/game/sim/investigation";
import { knowledgeLabel } from "@/game/sim/knowledge";
import { visibleObjectives } from "@/game/sim/objectives";
import { factionSignals, intelGradeLabel } from "@/game/sim/intel";

export function EventLog() {
  const state = useGame((s) => s.state);
  if (!state) return null;
  const logs = [...state.logs].slice(-8).reverse();

  return (
    <footer className="hidden h-[96px] shrink-0 border-t border-border bg-bg/90 lg:block">
      <div className="flex h-full flex-col px-4 py-1.5">
        <p className="text-[11px] font-medium text-olive">Kayıt · {actLabel(state)}</p>
        <ol className="mt-1 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {logs.map((l, i) => (
            <li key={`${l.turn}-${i}-${l.text.slice(0, 12)}`} className="flex gap-3 text-xs leading-snug">
              <span className="w-16 shrink-0 font-mono text-[10px] text-subtle">{l.year}</span>
              <span
                className={
                  l.kind === "olay"
                    ? "text-paper"
                    : l.kind === "npc"
                      ? "text-warn"
                      : l.kind === "aksiyon"
                        ? "text-olive"
                        : "text-muted"
                }
              >
                {l.text}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </footer>
  );
}

export function ReportPane() {
  const state = useGame((s) => s.state);
  if (!state) return null;
  const logs = [...state.logs].slice(-12).reverse();
  const hand = Object.values(state.hand).filter((h) => h.status !== "UNKNOWN");
  const objs = visibleObjectives(state);
  const showFac = mechanicUnlocked(state, "knowledge") || state.turn >= 3;
  const inv = investigationView(state);
  const signals = factionSignals(state);

  return (
    <div className="space-y-4">
      <div>
        <p className="scan font-mono text-[10px] text-olive">{actLabel(state)}</p>
        <h2 className="text-lg font-medium text-paper">Rapor</h2>
        <p className="mt-1 text-xs text-subtle">Elindeki bilgi. Karşı hatların iç planı görünmez.</p>
      </div>
      {inv.stage !== "dormant" || mechanicUnlocked(state, "investigation") ? (
        <div className="rounded-sm border border-border bg-bg/30 p-2">
          <p className="text-[11px] font-medium text-olive">
            Soruşturma · {inv.label} · ısı {inv.heat}
          </p>
          <p className="mt-1 text-xs leading-snug text-muted">{inv.why}</p>
          {inv.raising.length ? <p className="mt-1 text-[10px] text-stamp">Yükselten: {inv.raising.join(" · ")}</p> : null}
          {inv.lowering.length ? <p className="text-[10px] text-olive">Azaltan: {inv.lowering.join(" · ")}</p> : null}
        </div>
      ) : null}
      {objs.length ? (
        <ul className="space-y-1">
          {objs.map((o) => (
            <li key={o.id} className="text-xs text-muted">
              {o.status === "done" ? "✓" : o.status === "failed" ? "×" : "·"} {o.secret ? "(gizli) " : ""}
              {o.title}
            </li>
          ))}
        </ul>
      ) : null}
      <div>
        <p className="text-[11px] font-medium text-olive">Elindeki bilgi</p>
        <ul className="mt-1 space-y-1">
          {hand.map((h) => (
            <li key={h.claimId} className="text-xs text-muted">
              {h.claimId.replace("clm_", "")}: {knowledgeLabel(h.status)} ({h.confidence}%)
            </li>
          ))}
        </ul>
      </div>
      {showFac ? (
        <div>
          <p className="text-[11px] font-medium text-olive">Karşı hatlar (bildiğin kadar)</p>
          <ul className="mt-1 space-y-1.5">
            {signals.map((s) => (
              <li key={s.faction} className="text-xs leading-snug text-muted">
                <span className="font-mono text-[10px] text-olive">{intelGradeLabel(s.grade)}</span> {s.headline}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[11px] text-subtle">Karşı hat raporu tur 3’te açılır.</p>
      )}
      <div>
        <p className="text-[11px] font-medium text-olive">Kayıt</p>
        <ol className="mt-1 space-y-1">
          {logs.map((l, i) => (
            <li key={i} className="text-xs leading-snug text-muted">
              {l.text}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
