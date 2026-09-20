import { useGame } from "@/game/store";
import { actLabel, mechanicUnlocked } from "@/game/sim/acts";
import { STAGE_LABEL } from "@/game/sim/investigation";
import { knowledgeLabel } from "@/game/sim/knowledge";
import { visibleObjectives } from "@/game/sim/objectives";
import { FACTION_DEFS } from "@/game/sim/factions";

export function EventLog() {
  const state = useGame((s) => s.state);
  if (!state) return null;
  const logs = [...state.logs].slice(-8).reverse();

  return (
    <footer className="hidden h-[120px] shrink-0 border-t border-border bg-bg/90 md:block">
      <div className="flex h-full flex-col px-4 py-2">
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
  const showFac = mechanicUnlocked(state, "knowledge");

  return (
    <div className="space-y-4">
      <div>
        <p className="scan font-mono text-[10px] text-olive">{actLabel(state)}</p>
        <h2 className="text-lg font-medium text-paper">Rapor</h2>
        <p className="mt-1 text-xs text-subtle">Elindeki bilgi. Oyun gerçeği ayrı durur.</p>
      </div>
      {mechanicUnlocked(state, "investigation") ? (
        <p className="text-xs text-muted">
          Soruşturma: {STAGE_LABEL[state.investigation.stage]} · ısı {state.investigation.heat} · belgeler{" "}
          {state.investigation.documents.length} · bastırılan {state.investigation.suppressed.length}
        </p>
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
          <p className="text-[11px] font-medium text-olive">Karşı hatlar (bildikleri tam değil)</p>
          <ul className="mt-1 space-y-1">
            {FACTION_DEFS.filter((f) => state.revealed[f.id] || f.id === "jitem" || (f.id === "mit" && state.turn >= 3) || (f.id === "emniyet" && state.turn >= 8)).map((f) => (
              <li key={f.id} className="text-xs text-muted">
                {f.name}: {state.factions[f.id]?.currentObjective} · {state.factions[f.id]?.lastAct || "sessiz"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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
