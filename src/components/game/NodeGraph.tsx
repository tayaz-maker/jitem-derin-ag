import { useMemo, useState } from "react";
import { buildAtlas, atlasPlan, type AtlasModel } from "@/game/sim/atlas";
import { planMethods } from "@/game/sim/planning";
import { useGame } from "@/game/store";
import { useLocale } from "@/game/i18n";
import { copyForAction } from "@/game/i18n/interactive";
import { AtlasSurface } from "./AtlasSurface";
import { ChangeList } from "./MoveGuide";
import { RiskRewardGrid, DueLine } from "./OperationDesk";
import { dueSummary, METHOD_COPY, rewardLine } from "./operation-copy";

/** A neighbourhood crop never changes the underlying visibility or simulation. */
function focusModel(model: AtlasModel, focus: boolean): AtlasModel {
  if (!focus) return model;
  const selected = model.nodes.find((n) => n.selected);
  const edge = model.edges.find((e) => e.selected);
  const ids = new Set(edge ? [edge.from, edge.to] : selected ? [selected.id] : []);
  if (!ids.size) return model;
  const edges = model.edges.filter(
    (e) => ids.has(e.from) || ids.has(e.to) || e.affected || e.due.length,
  );
  for (const e of edges) {
    ids.add(e.from);
    ids.add(e.to);
  }
  const nodes = model.nodes.filter((n) => ids.has(n.id));
  const x = Math.min(...nodes.map((n) => n.x)) - 100,
    y = Math.min(...nodes.map((n) => n.y)) - 70;
  const width = Math.max(300, Math.max(...nodes.map((n) => n.x)) - x + 100);
  const height = Math.max(220, Math.max(...nodes.map((n) => n.y)) - y + 70);
  return { ...model, nodes, edges, bounds: { x, y, width, height } };
}

export function NodeGraph() {
  const state = useGame((s) => s.state);
  const draft = useGame((s) => s.move);
  const pickNode = useGame((s) => s.pickNode),
    pickEdge = useGame((s) => s.pickEdge);
  const setMove = useGame((s) => s.setMove),
    play = useGame((s) => s.play);
  const setGraphMode = useGame((s) => s.setGraphMode),
    setMobilePane = useGame((s) => s.setMobilePane);
  const locale = useLocale((s) => s.locale),
    tr = locale === "tr";
  const [svgOnly, setSvgOnly] = useState(false);
  const model = useMemo(
    () => (state ? buildAtlas(state, atlasPlan(state, draft)) : null),
    [state, draft],
  );
  const surface = useMemo(
    () => (model ? focusModel(model, state?.graphMode === "people") : null),
    [model, state?.graphMode],
  );
  if (!state || !model || !surface) return null;
  const selectedEdge = model.edges.find((e) => e.selected);
  const selectedNode = model.nodes.find((n) => n.selected);
  const title = selectedEdge?.label ?? selectedNode?.name;
  const choose = (value: string) => {
    if (value.startsWith("edge:")) pickEdge(value.slice(5));
    else if (value.startsWith("node:")) pickNode(value.slice(5));
  };
  return (
    <section
      className="network-board atlas-board"
      aria-label={tr ? "İlişki ve karar atlası" : "Relationship and decision atlas"}
    >
      <div className="atlas-toolbar">
        <label className="atlas-target">
          <span>{tr ? "Karar hedefi" : "Decision target"}</span>
          <select
            aria-label={tr ? "Karar hedefi" : "Decision target"}
            value={
              selectedEdge
                ? `edge:${selectedEdge.id}`
                : selectedNode
                  ? `node:${selectedNode.id}`
                  : ""
            }
            onChange={(e) => choose(e.target.value)}
          >
            <option value="" disabled>
              {tr ? "Hedef seç" : "Choose target"}
            </option>
            <optgroup label={tr ? "Aktör / koridor" : "Actor / corridor"}>
              {model.nodes.map((n) => (
                <option key={n.id} value={`node:${n.id}`}>
                  {n.name}
                </option>
              ))}
            </optgroup>
            <optgroup label={tr ? "Bağlar" : "Connections"}>
              {model.edges.map((e) => (
                <option key={e.id} value={`edge:${e.id}`}>
                  {e.label} · {e.evidence}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <div className="atlas-tools">
          <button
            aria-pressed={state.graphMode === "people"}
            onClick={() => setGraphMode(state.graphMode === "people" ? "factions" : "people")}
          >
            {state.graphMode === "people"
              ? tr
                ? "Tüm ağı göster"
                : "Show full network"
              : tr
                ? "Hedefe odaklan"
                : "Focus target"}
          </button>
          <button aria-pressed={svgOnly} onClick={() => setSvgOnly(!svgOnly)}>
            {svgOnly
              ? tr
                ? "Otomatik çizim"
                : "Automatic rendering"
              : tr
                ? "Basit çizim"
                : "Simple rendering"}
          </button>
        </div>
      </div>
      <AtlasSurface
        model={surface}
        svgOnly={svgOnly}
        locale={locale}
        onNode={pickNode}
        onEdge={pickEdge}
      />
      <div className="atlas-legend">
        {tr
          ? "Sarı: hamle etkisi · Kırmızı: yüksek iz riski · T: dönüş turu · Sayılar: risk puanı, olasılık değil"
          : "Amber: move effect · Red: high exposure · T: return turn · Numbers: risk score, not probability"}
      </div>
      <div className="atlas-readout" aria-live="polite">
        <div className="atlas-heading">
          <strong>{title ?? (tr ? "Ağdan bir hedef seç" : "Choose a network target")}</strong>
          <button className="lg:hidden" onClick={() => setMobilePane("kisi")}>
            {tr ? "Hamle seç" : "Choose move"}
          </button>
        </div>
        {selectedEdge && (
          <p>
            {selectedEdge.evidence} · {tr ? "Sızıntı riski" : "Leak risk"} {selectedEdge.risk} →{" "}
            {selectedEdge.afterRisk}
            {selectedEdge.live &&
              ` · ${tr ? "Güven" : "Trust"} ${selectedEdge.live.trust} · ${tr ? "Gerilim" : "Tension"} ${selectedEdge.live.tension}`}
          </p>
        )}
        {model.plan && model.preview ? (
          <div className="atlas-decision" data-testid="atlas-decision">
            <p>
              {tr ? "Hazırlanan hamle" : "Prepared move"}:{" "}
              <strong>{copyForAction(model.plan.id, locale, state).label}</strong>
            </p>
            {draft && (
              <div className="atlas-methods">
                {planMethods(state, draft.id).map((method) => (
                  <button
                    key={method}
                    aria-pressed={draft.method === method}
                    onClick={() => setMove({ ...draft, method })}
                  >
                    {METHOD_COPY[method][locale][0]}
                  </button>
                ))}
              </div>
            )}
            {model.preview.ok ? (
              <>
                <RiskRewardGrid preview={model.preview} locale={locale} />
                <DueLine preview={model.preview} state={state} locale={locale} />
                {model.rewards.map((id) => (
                  <p key={id}>
                    {tr ? "Hedef ödülü" : "Objective reward"}: {rewardLine(id, locale)}
                  </p>
                ))}
                <button className="atlas-commit" onClick={() => play(model.plan!)}>
                  {tr ? "Bu hamleyi uygula" : "Commit this move"}
                </button>
              </>
            ) : (
              <p>
                {tr
                  ? "Bu hamle şu an uygulanamıyor. Hedefi veya yöntemi değiştir."
                  : "This move is unavailable. Change target or approach."}
              </p>
            )}
          </div>
        ) : (
          <p>
            {tr
              ? "Bir hamle seç: bedeli, iz bıraktığı bağlar ve gecikmiş karşılığı burada birlikte görünsün."
              : "Choose a move to see its cost, exposed ties and delayed return together."}
          </p>
        )}
        {model.edges.some((e) => e.affected) && (
          <details open>
            <summary>{tr ? "Etkilenen bağlar" : "Affected connections"}</summary>
            <ul className="atlas-links">
              {model.edges
                .filter((e) => e.affected)
                .map((e) => (
                  <li key={e.id}>
                    <span>
                      {e.label} ·{" "}
                      {e.direct
                        ? tr
                          ? "doğrudan"
                          : "direct"
                        : tr
                          ? "ortak aktör izi"
                          : "shared actor trail"}
                    </span>
                    <b>
                      {e.risk} → {e.afterRisk}
                    </b>
                  </li>
                ))}
            </ul>
          </details>
        )}
        {model.pending.length > 0 && (
          <details open>
            <summary>
              {tr
                ? "Dönüş sırası — bugünkü koşullarla"
                : "Return schedule — under current conditions"}
            </summary>
            <ol className="atlas-returns">
              {model.pending.map((p) => {
                const copy = dueSummary(p.effect, locale);
                return (
                  <li key={p.tag}>
                    <button
                      onClick={() =>
                        p.edgeId ? pickEdge(p.edgeId) : p.nodeId && pickNode(p.nodeId)
                      }
                    >
                      <b>T{p.due}</b> · {p.label} ·{" "}
                      {p.proposed ? (tr ? "öneri" : "proposed") : tr ? "bekliyor" : "pending"}
                    </button>
                    <p>
                      {copy.head} · {copy.parts.join(" · ")}
                    </p>
                  </li>
                );
              })}
            </ol>
          </details>
        )}
        <details>
          <summary>
            {tr ? `Sonraki dönüş · T${state.turn + 1}` : `Next return · T${state.turn + 1}`}
          </summary>
          <p>
            {tr
              ? "Yalnız sıradaki plan dönüşleri; olaylar ve diğer hamleler sonucu değiştirebilir."
              : "Scheduled returns only; events and other moves can change the outcome."}
          </p>
          <ChangeList
            changes={model.nextChanges}
            empty={
              tr
                ? "Bu turda planlanmış bir dönüş etkisi yok."
                : "No scheduled return effect in this turn."
            }
          />
        </details>
      </div>
    </section>
  );
}
