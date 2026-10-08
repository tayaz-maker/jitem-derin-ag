import { useState } from "react";
import { ACTIONS } from "@/game/data";
import { canPlay } from "@/game/engine";
import { hatBlocks } from "@/game/sim/hats";
import { previewMove } from "@/game/sim/preview";
import { useGame } from "@/game/store";
import { copyForAction, t, useLocale } from "@/game/i18n";
import type { ActionId } from "@/game/types";
import { Button } from "@/components/ui/button";
import { RiskRewardGrid } from "./OperationDesk";

// Existing, untargeted support actions. Evidence work stays bound to its record
// on the decision desk; network moves stay on their selected map target.
const SUPPORT: ActionId[] = [
  "kara_topla",
  "tim_kur",
  "itirafci_al",
  "saha_op",
  "dosya_oku",
  "rapor_yaz",
  "sizinti_bastir",
  "inkar_yaz",
  "ankara_koru",
  "medya_kes",
  "soru_ac",
  "soru_sinir",
  "soru_yonlendir",
];
export function ResourceActions() {
  const state = useGame((s) => s.state)!;
  const play = useGame((s) => s.play);
  const locale = useLocale((s) => s.locale);
  const [selected, setSelected] = useState<ActionId | null>(null);
  const plan = selected ? { id: selected } : null;
  const preview = plan ? previewMove(state, plan) : null;
  return (
    <details className="file-fold rounded-sm border border-border bg-bg/40 p-2" open>
      <summary className="text-sm font-medium text-paper">{t(locale, "resources.title")}</summary>
      <p className="mb-2 text-xs leading-relaxed text-muted">{t(locale, "resources.hint")}</p>
      <label className="text-xs text-paper">
        {t(locale, "resources.select")}
        <select
          className="plan-record"
          value={selected ?? ""}
          onChange={(e) => setSelected((e.target.value as ActionId) || null)}
        >
          <option value="">{t(locale, "resources.select")}</option>
          {SUPPORT.filter((id) => !hatBlocks(state.hat, id)).map((id) => (
            <option key={id} value={id} disabled={!canPlay(state, id)}>
              {copyForAction(id, locale, state).label} · {ACTIONS.find((a) => a.id === id)?.ap}{" "}
              {t(locale, "resources.ap")}
              {!canPlay(state, id) ? ` · ${t(locale, "resources.unavailable")}` : ""}
            </option>
          ))}
        </select>
      </label>
      {selected && plan ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs leading-relaxed text-muted">
            {copyForAction(selected, locale, state).shortExplanation}
          </p>
          {preview?.ok ? (
            <RiskRewardGrid preview={preview} locale={locale} />
          ) : (
            <p className="text-xs text-warn">{t(locale, "move.previewBlocked")}</p>
          )}
          <Button
            className="w-full"
            disabled={!preview?.ok}
            onClick={() => {
              play(plan);
              setSelected(null);
            }}
          >
            {t(locale, "decision.commit")}
          </Button>
        </div>
      ) : null}
    </details>
  );
}
