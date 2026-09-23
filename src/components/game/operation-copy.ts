import { t } from "@/game/i18n";
import { OBJECTIVE_REWARDS } from "@/game/sim/objectives";
import type { PlanDue, PlanMethod } from "@/game/sim/planning";
import type { Change } from "@/game/sim/preview";
import type { StatKey } from "@/game/types";

type Locale = "tr" | "en";

export const METHOD_COPY: Record<PlanMethod, { tr: [string, string]; en: [string, string] }> = {
  quiet: {
    tr: ["Sessiz temas", "Ucuz ve yavaş. Güven iki tur sonra gelir; soruşturma ısınırsa temas yanar."],
    en: ["Quiet contact", "Cheap and slow. Trust returns in two turns; if the investigation heats up, the contact burns."],
  },
  institutional: {
    tr: ["Kurumsal kanal", "Nüfuz harcar, hukuki kalkan kurar. Kuruma bağımlılık ve kayıt izi bırakır."],
    en: ["Institutional channel", "Spends influence to build legal cover. Leaves institutional dependency and a paper trail."],
  },
  operational: {
    tr: ["Hızlı müdahale", "Ek hamle ve örtülü kaynakla hemen bilgi getirir. Tüm aktörler işaretlenir, geri tepme gelir."],
    en: ["Rapid intervention", "Spends an extra action and covert resources for intelligence now. Every actor is marked; blowback follows."],
  },
};

function signed(v: number) {
  return v > 0 ? `+${v}` : `${v}`;
}

/** The delayed half of an approach, in the player's words. */
export function dueSummary(due: PlanDue, locale: Locale) {
  const tr = locale === "tr";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(due.edge))
    if (v) parts.push(`${t(locale, `move.change.${k}`)} ${signed(v)}`);
  for (const [k, v] of Object.entries(due.stats))
    if (v) parts.push(`${t(locale, `stat.${k}.label`)} ${signed(v)}`);
  if (due.heat) parts.push(`${t(locale, "move.change.heat")} ${signed(due.heat)}`);
  if (due.hostility && due.faction)
    parts.push(`${t(locale, `move.faction.${due.faction}`)} ${tr ? "düşmanlığı" : "hostility"} ${signed(due.hostility)}`);
  const head =
    due.outcome === "burned"
      ? tr
        ? "Temas yanık döner"
        : "The contact comes back burned"
      : due.outcome === "returned"
        ? tr
          ? "Temas güvenle döner"
          : "The contact returns with trust"
        : due.outcome === "response"
          ? tr
            ? "Kurum yanıt verir"
            : "The institution responds"
          : tr
            ? "Müdahale geri teper"
            : "The intervention blows back";
  return { head, parts };
}

export function rewardLine(id: string, locale: Locale) {
  const reward = OBJECTIVE_REWARDS[id] ?? {};
  const bits = Object.entries(reward).map(
    ([k, v]) => `${t(locale, `stat.${k as StatKey}.label`)} ${signed(v ?? 0)}`,
  );
  return bits.join(" · ");
}


export function changeLabel(c: Change, locale: "tr" | "en") {
  switch (c.kind) {
    case "stat":
      return t(locale, `stat.${c.key}.label`);
    case "actions":
      return t(locale, "move.change.actions");
    case "heat":
      return t(locale, "move.change.heat");
    case "records":
      return t(locale, "move.change.records");
    case "edge":
      return `${c.label} · ${t(locale, `move.change.${c.field}`)}`;
    case "node":
      return `${c.label} · ${t(locale, "move.change.node")}`;
    case "faction":
      return `${t(locale, `move.faction.${c.id}`)} · ${t(locale, "move.change.faction")}`;
  }
}

