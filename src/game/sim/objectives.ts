import { actOf } from "./acts.ts";
import { hasMemory } from "./memory.ts";
import type { GameState, Objective } from "../types.ts";

const CATALOG: Omit<Objective, "status">[] = [
  { id: "obj_edge", title: "Bir bağı sıkılaştır veya gevşet", hint: "Haritada çizgi.", secret: false, origin: "act" },
  { id: "obj_person", title: "Bir kişiyi koru veya mesafe koy", hint: "Kişi grubu.", secret: false, origin: "act" },
  { id: "obj_truth", title: "Gerçeği aç veya düzeni tut", hint: "Rapor / inkâr.", secret: false, origin: "act" },
  { id: "obj_hold_ersever", title: "Saha hattını yanında tut", hint: "Ersever’i harcama.", secret: false, origin: "actor" },
  { id: "obj_cool_mit", title: "MİT baskısını bir tur kes", hint: "Rakibi soğut.", secret: false, origin: "faction" },
  { id: "obj_leak", title: "Sızıntı riskini 40 giz’in üstünde tut", hint: "Bastır / inkâr.", secret: false, origin: "act" },
  { id: "obj_inv", title: "Soruşturmayı inquiry’de tut veya yönlendir", hint: "Durdurmak zorunda değilsin.", secret: false, origin: "event" },
  { id: "obj_chain", title: "İki belge notu aç (rapor/dosya)", hint: "Bilgi zinciri.", secret: false, origin: "act" },
  { id: "obj_balance", title: "Emniyet hattını soğut, saha kapasitesini tut", hint: "Kesişim ısınmasın.", secret: false, origin: "faction" },
  { id: "obj_secret_aygan", title: "İtirafçıyı yakma", hint: "Aygan’ı harcama.", secret: true, origin: "actor" },
];

function evalStatus(state: GameState, id: string): Objective["status"] {
  const reports = state.decisions.filter((d) => d.id === "rapor_yaz" || d.id === "dosya_oku").length;
  switch (id) {
    case "obj_edge":
      return state.decisions.some((d) => d.id === "bag_guclendir" || d.id === "bag_gevset") ? "done" : "open";
    case "obj_person":
      return Object.keys(state.stance).length ? "done" : "open";
    case "obj_truth":
      return state.decisions.some((d) => d.id === "rapor_yaz" || d.id === "inkar_yaz") ? "done" : "open";
    case "obj_hold_ersever":
      if (hasMemory(state, "ersever", "spent")) return "failed";
      if (hasMemory(state, "ersever", "protected")) return "done";
      return "open";
    case "obj_cool_mit":
      return state.flags.mitCooledUntil >= state.turn ? "done" : "open";
    case "obj_leak":
      return state.stats.giz >= 40 ? "done" : state.stats.giz < 18 ? "failed" : "open";
    case "obj_inv":
      if (state.investigation.stage === "public" && state.stats.giz < 20) return "failed";
      if (
        state.investigation.stage === "inquiry" ||
        state.investigation.stage === "investigation" ||
        state.tags.includes("inv-direct") ||
        state.decisions.some((d) => d.id === "soru_yonlendir" || d.id === "soru_sinir")
      )
        return "done";
      return "open";
    case "obj_chain":
      return reports >= 2 ? "done" : "open";
    case "obj_balance":
      return state.flags.emniyetCooledUntil >= state.turn && state.stats.saha >= 30 ? "done" : "open";
    case "obj_secret_aygan":
      if (hasMemory(state, "aygan", "spent")) return "failed";
      return state.turn >= 7 && !hasMemory(state, "aygan", "spent") ? "done" : "open";
    default:
      return "open";
  }
}

export function syncObjectives(state: GameState): GameState {
  const act = actOf(state.turn);
  const want: string[] = [];
  if (act === 1) want.push("obj_edge");
  if (act === 2) want.push("obj_person", "obj_secret_aygan");
  if (act === 3) want.push("obj_truth", "obj_cool_mit");
  if (act === 4) want.push("obj_hold_ersever", "obj_leak");
  if (act >= 5) want.push("obj_inv", "obj_balance");
  if (act >= 6) want.push("obj_chain");

  const byId = Object.fromEntries(state.objectives.map((o) => [o.id, o]));
  const next: Objective[] = [];
  for (const id of want) {
    const def = CATALOG.find((c) => c.id === id);
    if (!def) continue;
    if (def.secret && act < 2) continue;
    const prev = byId[id];
    next.push({ ...def, status: evalStatus(state, id) });
    void prev;
  }
  for (const o of state.objectives) {
    if (!want.includes(o.id) && o.status === "done") next.push(o);
  }
  return { ...state, objectives: next };
}

export function visibleObjectives(state: GameState) {
  return state.objectives.filter((o) => !o.secret || state.turn >= 4);
}
