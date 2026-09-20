import { eventViewFor } from "@/game/engine";
import { evidenceTone } from "@/game/evidence";
import { LAYER_LABEL, sourceUxFor } from "@/game/sim/authority";
import { EVENTS } from "@/game/data";
import { useGame } from "@/game/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function EventModal({ embedded = false }: { embedded?: boolean }) {
  const state = useGame((s) => s.state);
  const chooseEvent = useGame((s) => s.chooseEvent);
  const nextTurn = useGame((s) => s.nextTurn);
  if (!state) return null;
  if (embedded) {
    if (state.phase === "event") {
      return (
        <p className="p-4 text-sm text-muted">Duruş penceresi açık. Seçimini oradan yap.</p>
      );
    }
    const ev = EVENTS.find((e) => e.turn === state.turn);
    return (
      <article className="p-4">
        <p className="text-[11px] font-medium text-olive">Olay kaydı · {ev?.year}</p>
        <h2 className="mt-1 text-xl font-medium text-paper">{ev?.title ?? "Dönem"}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{ev?.body}</p>
        {state.phase === "resolution" ? (
          <div className="mt-4 space-y-2">
            {state.lastResolution.map((n, i) => (
              <p key={i} className="text-xs leading-relaxed text-muted">
                {n}
              </p>
            ))}
            <Button className="mt-2 w-full" onClick={nextTurn}>
              Sonraki döneme geç
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-xs text-subtle">İşler sekmesinden turu kapat.</p>
        )}
      </article>
    );
  }

  if (state.phase !== "event") return null;
  const ev = eventViewFor(state);
  if (!ev) return null;
  const showHidden = state.stats.bilgi >= ev.hiddenBilgi;
  const layer = LAYER_LABEL[ev.layer] ?? ev.layer;
  const ux = sourceUxFor({
    layer: ev.layer,
    evidence: ev.evidence,
    contradiction: ev.hidden.includes("TARTIŞMALI") ? ev.hidden : null,
  });

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-bg/75 p-3 sm:items-center sm:p-6">
      <article className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-lg border border-border bg-surface p-5 sm:p-6">
        <p className="text-[11px] font-medium text-olive">
          Adım 1 · {ev.year}
          {ev.anchor ? " · durdurulamaz çıpa" : ""}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-medium tracking-tight text-paper">{ev.title}</h2>
          {ux.map((t) => (
            <Badge key={t} tone={t === "TARTIŞMALI" || t === "ÇELİŞKİLİ" ? "tart" : t === "BELGELİ" || t === "TARİHSEL ÇIPA" ? "belgeli" : "guc"}>
              {t}
            </Badge>
          ))}
          <Badge tone={evidenceTone(ev.evidence)}>{ev.evidence}</Badge>
          <Badge>{layer}</Badge>
        </div>
        <p className="mt-1 font-mono text-[11px] text-muted">{ev.fileNo}</p>
        <p className="mt-4 text-sm leading-relaxed text-fg">{ev.body}</p>
        {ev.addendum ? (
          <p className="mt-3 border-l-2 border-warn/70 pl-3 text-sm leading-relaxed text-muted">
            {ev.addendum}
          </p>
        ) : null}
        {showHidden ? (
          <div className="mt-4 border-l-2 border-olive/70 pl-3">
            <p className="text-[11px] font-medium text-olive">Gizli madde · kaynaklara göre</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{ev.hidden}</p>
          </div>
        ) : (
          <p className="mt-4 text-xs text-subtle">
            Gizli madde kapalı. Bilgi {ev.hiddenBilgi}+ gerek — “Rapor yaz” veya “Dosya oku”.
          </p>
        )}

        <p className="mt-6 text-[11px] font-medium text-olive">Duruşunu seç — bağ / kişi / gerçek</p>
        <div className="mt-2 grid gap-2">
          {ev.choices.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => chooseEvent(c.id)}
              className="min-h-11 rounded-md border border-border bg-bg/50 px-3 py-3 text-left transition-colors duration-(--motion-quick) hover:border-olive/60 hover:bg-elevated"
            >
              <span className="block text-sm font-medium text-fg">{c.label}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted">{c.hint}</span>
            </button>
          ))}
        </div>
        <Button variant="ghost" className="mt-3 w-full text-subtle" onClick={() => chooseEvent(ev.choices[0]?.id ?? "")}>
          Kararsızsan ilk duruşu al
        </Button>
      </article>
    </div>
  );
}
