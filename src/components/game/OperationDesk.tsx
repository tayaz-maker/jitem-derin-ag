import { QUIET_BURN_ACTOR_HEAT, QUIET_BURN_HEAT, type PlanMethod } from "@/game/sim/planning";
import { changeGroup, previewMove, type Change, type MovePreview } from "@/game/sim/preview";
import type { GameState, PlannedAction } from "@/game/types";
import { cn } from "@/lib/utils";
import { ChangeList } from "./MoveGuide";
import { METHOD_COPY, changeLabel, dueSummary } from "./operation-copy";

type Locale = "tr" | "en";

const GROUPS = [
  { id: "gain", tr: "Kazanım", en: "Gain" },
  { id: "cost", tr: "Bedel", en: "Cost" },
  { id: "trace", tr: "İz ve sızıntı", en: "Trail and leak" },
] as const;

/** Gain / cost / trail, straight from the engine's own preview. */
export function RiskRewardGrid({
  preview,
  locale,
}: {
  preview: MovePreview;
  locale: Locale;
}) {
  const tr = locale === "tr";
  const by = (g: string) => preview.changes.filter((c) => changeGroup(c) === g);
  return (
    <div className="op-grid grid gap-1.5">
      {GROUPS.map((g) => {
        const rows: Change[] = by(g.id);
        return (
          <section
            key={g.id}
            className={cn(
              "op-cell rounded-sm border bg-bg/55 p-2",
              g.id === "gain" && "border-olive/45",
              g.id === "cost" && "border-warn/35",
              g.id === "trace" && "border-border",
            )}
            aria-label={tr ? g.tr : g.en}
          >
            <p
              className={cn(
                "scan mb-1 font-mono text-[10px] uppercase tracking-wide",
                g.id === "gain" ? "text-olive" : g.id === "cost" ? "text-warn" : "text-paper",
              )}
            >
              {tr ? g.tr : g.en}
            </p>
            <ChangeList changes={rows} empty={tr ? "Yok" : "None"} />
          </section>
        );
      })}
    </div>
  );
}

/** When and how the approach comes back, with the condition that decides it. */
export function DueLine({
  preview,
  state,
  locale,
}: {
  preview: MovePreview;
  state: GameState;
  locale: Locale;
}) {
  const tr = locale === "tr";
  if (!preview.due) return null;
  const { head, parts } = dueSummary(preview.due.effect, locale);
  const quiet = preview.due.effect.method === "quiet";
  return (
    <div
      className={cn(
        "op-due rounded-sm border-l-2 bg-bg/50 px-2 py-1.5 text-[11px] leading-snug",
        preview.due.effect.outcome === "burned" || preview.due.effect.outcome === "blowback"
          ? "border-warn"
          : "border-olive",
      )}
    >
      <p className="text-paper">
        <span className="font-mono text-[10px] text-olive">
          {tr ? `GECİKMİŞ · ${preview.due.turn}. TUR` : `DELAYED · TURN ${preview.due.turn}`}
        </span>{" "}
        {head}: {parts.join(" · ") || (tr ? "etki yok" : "no effect")}
      </p>
      {quiet ? (
        <p className="mt-0.5 text-muted">
          {tr
            ? `Koşul: soruşturma ısısı ${QUIET_BURN_HEAT}’in, hedefteki iz ${QUIET_BURN_ACTOR_HEAT}’nin altında kalmalı. Şu an ısı ${state.investigation.heat}.`
            : `Condition: investigation heat below ${QUIET_BURN_HEAT} and target trail below ${QUIET_BURN_ACTOR_HEAT}. Heat now ${state.investigation.heat}.`}
        </p>
      ) : null}
    </div>
  );
}

const changeKey = (c: Change) =>
  `${c.kind}:${"key" in c ? c.key : ""}:${"id" in c ? c.id : ""}:${"field" in c ? c.field : ""}`;
function sameChange(c: Change, others: Change[]) {
  const o = others.find((x) => changeKey(x) === changeKey(c));
  return Boolean(o && o.to - o.from === c.to - c.from);
}

/**
 * The approaches side by side, each summarised from its own exact preview so
 * the player compares real numbers, not adjectives.
 */
export function MethodCompare({
  state,
  plan,
  methods,
  method,
  onPick,
  locale,
  blocked,
}: {
  state: GameState;
  plan: PlannedAction;
  methods: PlanMethod[];
  method: PlanMethod;
  onPick: (m: PlanMethod) => void;
  locale: Locale;
  blocked: (m: PlanMethod) => boolean;
}) {
  const tr = locale === "tr";
  const previews = Object.fromEntries(
    methods.map((m) => [m, blocked(m) ? null : previewMove(state, { ...plan, method: m })]),
  ) as Record<PlanMethod, MovePreview | null>;
  return (
    <fieldset className="op-methods grid gap-1.5">
      <legend className="mb-1 font-mono text-[10px] uppercase tracking-wide text-olive">
        {tr ? "Uygulama biçimi" : "Approach"}
      </legend>
      {methods.map((m) => {
        const p = previews[m];
        // Only what this approach does differently: the base move is the same
        // under every approach, so repeating it would hide the real choice.
        const own = (p?.changes ?? []).filter((c) =>
          methods.some((o) => o !== m && previews[o]?.ok && !sameChange(c, previews[o]!.changes)),
        );
        const top = (g: string) =>
          own
            .filter((c) => changeGroup(c) === g)
            .sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from))[0];
        const chips = (["gain", "cost", "trace"] as const)
          .map((g) => [g, top(g)] as const)
          .filter((x): x is readonly [typeof x[0], Change] => Boolean(x[1]));
        const due = p?.due ? dueSummary(p.due.effect, locale) : null;
        const [name, body] = METHOD_COPY[m][tr ? "tr" : "en"];
        return (
          <button
            key={m}
            type="button"
            aria-pressed={method === m}
            disabled={!p?.ok}
            onClick={() => onPick(m)}
            className={cn(
              "min-h-11 rounded-sm border px-2 py-1.5 text-left text-[11px] leading-snug",
              method === m ? "border-olive bg-olive/15" : "border-border bg-bg/40 hover:border-olive/50",
              !p?.ok && "opacity-45",
            )}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-fg">{name}</span>
              {p?.ok ? null : (
                <span className="font-mono text-[10px] text-muted">
                  {tr ? "şu an yapılamaz" : "not possible now"}
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-muted">{body}</span>
            {chips.length ? (
              <span className="op-chips mt-1 flex flex-wrap gap-1">
                {chips.map(([g, c]) => {
                  const d = c.to - c.from;
                  return (
                    <span
                      key={g}
                      className={cn(
                        "rounded-sm border px-1.5 py-0.5 font-mono text-[10px]",
                        g === "gain" && "border-olive/40 text-olive",
                        g === "cost" && "border-warn/40 text-warn",
                        g === "trace" && "border-border text-paper",
                      )}
                    >
                      {changeLabel(c, locale)} {d > 0 ? `+${d}` : d}
                    </span>
                  );
                })}
              </span>
            ) : null}
            {due ? (
              <span
                className={cn(
                  "mt-0.5 block",
                  p?.due?.effect.outcome === "burned" || p?.due?.effect.outcome === "blowback"
                    ? "text-warn"
                    : "text-olive",
                )}
              >
                {p!.due!.turn}. {tr ? "tur" : "turn"}: {due.head}
              </span>
            ) : null}
          </button>
        );
      })}
    </fieldset>
  );
}
