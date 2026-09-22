import { ACTIONS, EDGES, ENDINGS, EVENT_CHOICES, EVENTS, NODES } from "./data.ts";
import { actOf, mechanicUnlocked } from "./sim/acts.ts";
import { seedEdgeLive, touchEdge } from "./sim/edges.ts";
import { applyConsequence, applyFamilyFire, pickSideFamilies, pickVariant, selectAnchorFamily, viewEvent } from "./sim/families.ts";
import { initialFactions, tickFactions } from "./sim/factions.ts";
import { addDocument, recordChainLink, recordComparison, tickInvestigation } from "./sim/investigation.ts";
import { entry, initialHand, initialTruth, setFactionKnow, setHand, tickKnowledge } from "./sim/knowledge.ts";
import { remember, tickMemory, breakPromise } from "./sim/memory.ts";
import { syncObjectives } from "./sim/objectives.ts";
import { pickSeed } from "./sim/rng.ts";
import { buildDossier, buildRecap, pickEnding, pushDecision } from "./sim/recap.ts";
import { applyMany, applyStat, clamp } from "./sim/stats.ts";
import { apFor as hatAp, defaultStats, hatBlocks, hatOpeningLog, hatTick } from "./sim/hats.ts";
import { ALL_CLAIMS } from "./db/catalog.ts";
import type {
  ActionId,
  EndingId,
  GameState,
  Hat,
  LogEntry,
  MemoryTag,
  PlannedAction,
  Stance,
} from "./types.ts";
import { SAVE_VERSION, SCHEMA_VERSION } from "./types.ts";

export { applyStat, clamp };

export function apFor(hat: Hat) {
  return hatAp(hat);
}

export function nodeById(id: string) {
  return NODES.find((n) => n.id === id);
}

export function edgeById(id: string) {
  return EDGES.find((e) => e.id === id);
}

export function eventFor(turn: number) {
  return EVENTS.find((e) => e.turn === turn);
}

export function eventViewFor(state: GameState) {
  return viewEvent(state);
}

export function actionAp(id: ActionId) {
  return ACTIONS.find((a) => a.id === id)?.ap ?? 1;
}

function setFactionKnowSafe(state: GameState, fac: GameState["factions"][string]["id"], claimId: string, status: "TRUE" | "PARTIAL" | "RUMOR") {
  return setFactionKnow(state, fac, entry(claimId, status, { source: "dönem", confidence: status === "TRUE" ? 70 : 40 }));
}

function addLog(state: GameState, text: string, kind: LogEntry["kind"], key?: string, params?: Record<string, string | number>): GameState {
  const ev = eventFor(state.turn);
  return {
    ...state,
    logs: [...state.logs, { turn: state.turn, year: ev?.year ?? "—", text, kind, key, params }],
  };
}

function tightness(state: GameState) {
  let sum = 0;
  for (const e of EDGES) {
    if (!isEdgeVisible(state, e.id)) continue;
    sum += state.edgeStr[e.id] ?? 0;
    const live = state.edgeLive[e.id];
    if (!live) continue;
    if (live.secrecy < 30) sum += 1;
    if (live.tension >= 60) sum += 1;
  }
  return sum;
}

function actionRepeat(state: GameState, id: ActionId) {
  return state.decisions.filter((d) => d.id === id).length;
}

function scaled(n: number, repeats: number) {
  if (repeats <= 0) return n;
  const f = Math.max(0.35, 1 - repeats * 0.28);
  const out = Math.round(n * f);
  if (n > 0) return Math.max(1, out);
  if (n < 0) return Math.min(-1, out);
  return 0;
}

function openClaim(state: GameState, plan?: PlannedAction) {
  if (plan?.claimId && (state.investigation.comparisons ?? []).some((c) => c.claimId === plan.claimId)) {
    return plan.claimId;
  }
  const tagged = state.tags.filter((tag) => tag.startsWith("src-open:")).map((tag) => tag.slice("src-open:".length));
  if (tagged.length) return tagged[tagged.length - 1];
  return state.investigation.comparisons?.at(-1)?.claimId;
}

export function isNodeVisible(state: GameState, id: string) {
  const n = nodeById(id);
  if (!n) return false;
  if (state.revealed[id]) return true;
  if (state.turn >= n.appearTurn && state.stats.bilgi >= n.bilgiReveal) return true;
  return false;
}

export function isEdgeVisible(state: GameState, id: string) {
  const e = edgeById(id);
  if (!e) return false;
  if (state.turn < e.appearTurn) return false;
  return isNodeVisible(state, e.from) && isNodeVisible(state, e.to);
}

export function revealDueNodes(state: GameState): GameState {
  const revealed = { ...state.revealed };
  let changed = false;
  for (const n of NODES) {
    if (!revealed[n.id] && isNodeVisible(state, n.id)) {
      revealed[n.id] = true;
      changed = true;
    }
  }
  return changed ? { ...state, revealed } : state;
}

function defaultStatsFor(hat: Hat): GameState["stats"] {
  return defaultStats(hat);
}

function emptyReplay(hat: Hat, seed: number): GameState["replayMeta"] {
  return { seed, hat, decisions: [], events: [], factions: [], major: [] };
}

export function createGame(hat: Hat, seed?: number): GameState {
  const edgeStr: Record<string, number> = {};
  for (const e of EDGES) edgeStr[e.id] = e.evidence === "BELGELİ" ? 2 : 1;
  const revealed: Record<string, boolean> = {};
  for (const n of NODES) {
    if (n.appearTurn === 1 && n.bilgiReveal === 0) revealed[n.id] = true;
  }
  const worldSeed = seed ?? pickSeed();
  const state: GameState = {
    version: SAVE_VERSION,
    schemaVersion: SCHEMA_VERSION,
    hat,
    turn: 1,
    phase: "event",
    stats: defaultStatsFor(hat),
    nodeHeat: {},
    edgeStr,
    edgeLive: seedEdgeLive(),
    stance: {},
    actorMemory: {},
    revealed,
    dead: {},
    logs: [
      {
        turn: 0,
        year: "1986",
        text:
          hat === "saha"
            ? "Masa: saha hattı. Ersever tipi. Emredilen: kapasite ve inkâr. Emredilmeyen: çıpa ölümler."
            : hat === "idari"
              ? "Masa: idari hat. Doğan tipi. Emredilen: dosya ve kalkan. Çıpa takvim durmaz."
              : hat === "arastirmaci"
                ? "Masa: araştırmacı hat. Emredilen: kaynak, çelişki, kamu. Emredilmeyen: saha emri, yeni iddia."
                : "Masa: hukuk hattı. Emredilen: delil zinciri ve eşik. Emredilmeyen: saha operasyonu.",
        key: hatOpeningLog(hat),
        kind: "sistem",
      },
    ],
    decisions: [],
    tags: [],
    factions: initialFactions(),
    hand: initialHand(hat),
    truth: initialTruth(),
    investigation: { stage: "dormant", heat: 0, documents: [], suppressed: [], comparisons: [], chain: [] },
    objectives: [],
    replay: [],
    replayMeta: emptyReplay(hat, worldSeed),
    actionsLeft: apFor(hat),
    flags: {
      commandShifted: false,
      abasDead: false,
      erseverTalked: false,
      erseverDead: false,
      susurluk: false,
      mitCooledUntil: 0,
      emniyetCooledUntil: 0,
      leakSuppressed: false,
      lastReportTurn: 0,
      investigationOpen: false,
      gizCrisisTurns: 0,
      informantBurned: false,
      yesilUsed: false,
    },
    selectedNodeId: "jitem",
    selectedEdgeId: null,
    pendingAction: null,
    ending: null,
    lastResolution: [],
    recap: [],
    dossier: null,
    worldSeed,
    eventSeed: (worldSeed ^ 0x9e3779b9) >>> 0,
    aiSeed: (worldSeed ^ 0x85ebca6b) >>> 0,
    rngCursor: 0,
    graphMode: "people",
  };
  return syncObjectives(applyEvent(state));
}

export function applyEvent(state: GameState): GameState {
  const ev = eventFor(state.turn);
  if (!ev) return state;
  let next = { ...state };
  const revealed = { ...next.revealed };
  for (const id of ev.revealNodeIds) revealed[id] = true;
  next.revealed = revealed;

  if (ev.turn === 4) next.flags = { ...next.flags, commandShifted: true };
  if (ev.turn === 5) {
    next.flags = { ...next.flags, abasDead: true };
    next.dead = { ...next.dead, abas: true };
  }
  if (ev.turn === 6) next.flags = { ...next.flags, erseverTalked: true };
  if (ev.turn === 7) {
    next.flags = { ...next.flags, erseverDead: true };
    next.dead = { ...next.dead, ersever: true };
  }
  if (ev.turn === 10) {
    next.flags = { ...next.flags, susurluk: true };
    next.dead = { ...next.dead, catli: true, kocadag: true, gonca: true };
    for (const e of EDGES) {
      if (e.belgelıLockTurn === 10) {
        next.edgeStr = { ...next.edgeStr, [e.id]: 3 };
      }
    }
    next = setHand(next, entry("clm_tbmm_commission", "TRUE", { source: "kaza kaydı", confidence: 88 }));
    next = setHand(next, entry("clm_kocadag_catli_precrash", "PARTIAL", { source: "aynı araç", confidence: 62 }));
    next = setFactionKnowSafe(next, "hukuk", "clm_tbmm_commission", "TRUE");
    next = setFactionKnowSafe(next, "media", "clm_susurluk_car", "TRUE");
  }
  if (ev.turn === 5) {
    next = setHand(next, entry("clm_abas_watch_withdrawn", next.hat === "arastirmaci" ? "PARTIAL" : "RUMOR", { source: "Pipo hattı", confidence: next.hat === "arastirmaci" ? 48 : 28 }));
    next = setFactionKnowSafe(next, "mit", "clm_abas_watch_withdrawn", "PARTIAL");
  }
  if (ev.turn === 6) {
    next = setHand(next, entry("clm_ersever_tapes", "TRUE", { source: "kaset", confidence: 80 }));
    next = addDocument(next, "kaset-1993", next.flags.leakSuppressed);
  }
  if (ev.turn === 8) {
    next = setHand(next, entry("clm_eymur_emniyet_warn", next.hat === "arastirmaci" ? "PARTIAL" : "RUMOR", { source: "Eymür", confidence: 50 }));
    if (next.hat === "arastirmaci") {
      next = setHand(next, entry("clm_hanefi_emniyet_split", "RUMOR", { source: "Emniyet hattı", confidence: 36 }));
    }
    next = setFactionKnowSafe(next, "media", "clm_eymur_emniyet_warn", "RUMOR");
  }

  const view = viewEvent(next);
  const layer = ev.anchor || view?.anchor ? "TARİHSEL ÇIPA" : "KAYNAK İDDİASI";
  next = addLog(next, `${layer} · ${ev.fileNo} — ${view?.title ?? ev.title}. Kanıt: ${ev.evidence}.`, "olay");
  if (view?.addendum) next = addLog(next, view.addendum, "gizli");
  const family = selectAnchorFamily(next);
  if (family) {
    const picked = pickVariant(next, family);
    const silent: string[] = [];
    next = applyConsequence(next, picked.consequence, silent);
    const extra: string[] = [];
    if (family.exclusivity) extra.push(`ex:${family.exclusivity}`);
    if (family.followUps) extra.push(...family.followUps.map((id) => `follow:${id}`));
    if (extra.length) next = { ...next, tags: [...next.tags, ...extra] };
    for (const n of silent) {
      if (n !== view?.addendum) next = addLog(next, n, "gizli");
    }
  }
  next = {
    ...next,
    replay: [
      ...next.replay,
      {
        turn: next.turn,
        familyId: view?.familyId,
        variantId: view?.variantId,
        factionActs: [],
        note: view?.title ?? ev.title,
      },
    ],
    replayMeta: {
      ...next.replayMeta,
      events: [
        ...next.replayMeta.events,
        { turn: next.turn, familyId: view?.familyId, variantId: view?.variantId, factionActs: [], note: ev.title },
      ],
    },
  };
  return revealDueNodes(next);
}

export function startActions(state: GameState): GameState {
  return {
    ...state,
    phase: "actions",
    actionsLeft: apFor(state.hat),
    flags: { ...state.flags, leakSuppressed: false },
    pendingAction: null,
  };
}

export function applyEventChoice(state: GameState, choiceId: string): GameState {
  if (state.phase !== "event") return state;
  const view = viewEvent(state);
  const choices = view?.choices ?? EVENT_CHOICES[state.turn] ?? [];
  const choice = choices.find((c) => c.id === choiceId);
  if (!choice) return startActions(state);

  let next = applyMany(state, choice.effects);
  next = addLog(next, choice.log, "aksiyon", `choice.${choice.id}`);
  next = pushDecision(next, { kind: "choice", id: choice.id, summary: choice.log });
  if (choice.tags?.length) next = { ...next, tags: [...next.tags, ...choice.tags] };
  next = startActions(next);

  if (choice.special === "leak-suppress") {
    next = { ...next, flags: { ...next.flags, leakSuppressed: true }, tags: [...next.tags, "inv-suppress"] };
    next = addDocument(next, `kaset-t${next.turn}`, true);
  }
  if (choice.special === "mit-cool") {
    next = { ...next, flags: { ...next.flags, mitCooledUntil: next.turn + 1 } };
  }
  if (choice.special === "emniyet-cool") {
    next = { ...next, flags: { ...next.flags, emniyetCooledUntil: next.turn + 1 }, tags: [...next.tags, "catli-cooled"] };
  }
  if (choice.special === "weaken-catli") {
    const edgeStr = { ...next.edgeStr };
    for (const e of EDGES) {
      if (e.from === "catli" || e.to === "catli") {
        if (!(e.belgelıLockTurn && next.turn >= e.belgelıLockTurn)) {
          edgeStr[e.id] = Math.max(0, (edgeStr[e.id] ?? 1) - 1);
        }
      }
    }
    next = { ...next, edgeStr };
  }
  if (choice.id === "e4-saha") next = remember(next, "ersever", "promise-kept");
  if (choice.id === "e4-uy") {
    next = remember(next, "ersever", "abandoned");
    next = breakPromise(next, "ersever");
  }
  if (choice.id === "e6-bas") next = remember(next, "ersever", "promise-kept");
  if (choice.id === "e6-not") {
    next = remember(next, "ersever", "leaked");
    next = breakPromise(next, "ersever");
  }
  if (choice.id === "e3-oku") next = setHand(next, entry("clm_eymur_abas_split", "PARTIAL", { source: "memo", confidence: 55 }));
  if (choice.id === "e7-dosya") next = setHand(next, entry("clm_yesil_ersever", "PARTIAL", { source: "dosya", confidence: 60 }));
  return syncObjectives(next);
}

export function canPlay(state: GameState, id: ActionId) {
  if (state.phase !== "actions") return false;
  const def = ACTIONS.find((a) => a.id === id);
  if (!def) return false;
  if (state.actionsLeft < def.ap) return false;
  if (hatBlocks(state.hat, id)) return false;
  if (def.unlockAct && actOf(state.turn) < def.unlockAct) return false;
  if (def.group === "kisi" && !mechanicUnlocked(state, "person")) return false;
  if ((id === "rapor_yaz" || id === "inkar_yaz") && !mechanicUnlocked(state, "knowledge")) return false;
  if ((id === "soru_yonlendir" || id === "soru_ac" || id === "soru_sinir") && !mechanicUnlocked(state, "investigation")) return false;
  if (id === "rakip_sogut" && actOf(state.turn) < 3) return false;
  if (id === "tim_kur" && state.stats.kara < 6) return false;
  if (id === "ankara_koru" && state.stats.kara < 5) return false;
  if (id === "medya_kes" && state.stats.etki < 4) return false;
  if (id === "saha_op" && state.flags.erseverDead && state.turn === 7) return false;
  if ((id === "kaynak_karsilastir" || id === "dogrula" || id === "src_tut" || id === "src_paylas" || id === "src_yayin") && state.hat !== "arastirmaci") return false;
  if ((id === "delil_zincir" || id === "kanit_esigi") && state.hat !== "hukuk") return false;
  if (id === "dogrula" && !Object.values(state.hand).some((h) => h.status === "RUMOR" || h.status === "PARTIAL")) return false;
  if (id === "delil_zincir" && !Object.values(state.hand).some((h) => h.status === "PARTIAL" || h.status === "TRUE")) return false;
  if ((id === "src_tut" || id === "src_paylas" || id === "src_yayin") && (state.investigation.comparisons?.length ?? 0) < 1) return false;
  return true;
}

function setStance(state: GameState, id: string, s: Stance): GameState {
  return { ...state, stance: { ...state.stance, [id]: s } };
}

function runPerson(
  state: GameState,
  plan: PlannedAction,
  kind: Stance,
  apply: (s: GameState) => GameState,
  log: string,
): GameState {
  const nodeId = plan.nodeId ?? state.selectedNodeId;
  const node = nodeId ? nodeById(nodeId) : undefined;
  if (!node || !isNodeVisible(state, node.id)) {
    return addLog({ ...state, actionsLeft: state.actionsLeft + actionAp(plan.id) }, "Kişi seçilmedi.", "sistem");
  }
  if (state.dead[node.id] && kind !== "distance") {
    return addLog({ ...state, actionsLeft: state.actionsLeft + actionAp(plan.id) }, "Kapalı düğüm harcanmaz.", "sistem");
  }
  let next = apply(setStance(state, node.id, kind));
  const tag: MemoryTag =
    kind === "protect" ? "protected" : kind === "use" ? "used" : kind === "spend" ? "spent" : "abandoned";
  next = remember(next, node.id, tag);
  if (kind === "spend" || kind === "distance") next = breakPromise(next, node.id);
  if (kind === "spend") next = remember(next, node.id, "leaked");
  if (kind === "protect" && node.faction && node.faction !== "jitem") {
    for (const other of ["ersever", "dogan", "aygan"]) {
      if (other !== node.id && isNodeVisible(next, other)) next = remember(next, other, "backed-rival");
    }
  }
  next.nodeHeat = { ...next.nodeHeat, [node.id]: (next.nodeHeat[node.id] ?? 0) + (kind === "spend" ? 2 : 1) };
  if (node.id === "yesil" && kind === "spend") next.flags = { ...next.flags, yesilUsed: true };
  if (node.id === "aygan" && kind === "spend") next.flags = { ...next.flags, informantBurned: true };
  next = addLog(next, `${node.name}: ${log}`, "aksiyon");
  next = pushDecision(next, { kind: "stance", id: kind, target: node.id, summary: `${node.name}: ${log}` });
  return next;
}

function needEdge(state: GameState, plan: PlannedAction) {
  const edgeId = plan.edgeId ?? state.selectedEdgeId;
  const edge = edgeId ? edgeById(edgeId) : undefined;
  if (!edge || !isEdgeVisible(state, edge.id)) return null;
  return edge;
}

export function executeAction(state: GameState, plan: PlannedAction): GameState {
  if (!canPlay(state, plan.id)) return state;
  const apCost = actionAp(plan.id);
  let next: GameState = { ...state, actionsLeft: state.actionsLeft - apCost, pendingAction: null };
  const sahaHat = state.hat === "saha";
  const idariHat = state.hat === "idari";

  switch (plan.id) {
    case "tim_kur": {
      const n = actionRepeat(state, "tim_kur");
      next = applyStat(next, "saha", scaled(sahaHat ? 12 : 8, n));
      next = applyStat(next, "kara", scaled(-8, n));
      next = applyStat(next, "giz", scaled(sahaHat ? -3 : -5, n));
      next = addLog(next, n ? "Tim tekrar açıldı. Getiri azaldı. İz duruyor." : "Tim kapasitesi açıldı. Resmi kayıt: yok. Örtülü düştü.", "aksiyon");
      break;
    }
    case "itirafci_al": {
      next = applyStat(next, "saha", sahaHat ? 8 : 5);
      next = applyStat(next, "bilgi", 7);
      next = applyStat(next, "giz", sahaHat ? -6 : -8);
      next = applyStat(next, "etki", -3);
      next = applyStat(next, "sadakat", -4);
      next.nodeHeat = { ...next.nodeHeat, aygan: (next.nodeHeat.aygan ?? 0) + 1 };
      next = remember(next, "aygan", "used");
      next = setHand(next, entry("clm_informant_layer", "PARTIAL", { source: "itirafçı", confidence: 55 }));
      next = addLog(next, "İtirafçı katmanı alındı. Bilgi arttı. Konuşma riski giz’e işlendi.", "aksiyon");
      break;
    }
    case "bag_guclendir": {
      const edge = needEdge(next, plan);
      if (!edge) {
        next = addLog(next, "Bağ yok. Yeni efsane hat uydurulmaz.", "sistem");
        next.actionsLeft += apCost;
        break;
      }
      const cur = next.edgeStr[edge.id] ?? 1;
      next.edgeStr = { ...next.edgeStr, [edge.id]: Math.min(3, cur + 1) };
      next = touchEdge(next, edge.id, { trust: 12, dependency: 10, secrecy: -8, tension: 4 });
      const cost = edge.evidence === "TARTIŞMALI" ? 10 : edge.evidence === "BELGELİ" ? 2 : 4;
      next = applyStat(next, "giz", -cost);
      next = applyStat(next, "etki", edge.evidence === "TARTIŞMALI" ? -4 : 1);
      next = remember(next, edge.from, "used");
      next = remember(next, edge.to, "used");
      next = addLog(next, `Bağ sıkılaştırıldı: ${edge.label} (${edge.evidence}). Giz −${cost}.`, "aksiyon");
      next = pushDecision(next, { kind: "action", id: plan.id, target: edge.id, summary: edge.label });
      return revealDueNodes(syncObjectives(next));
    }
    case "bag_gevset": {
      const edge = needEdge(next, plan);
      if (!edge) {
        next = addLog(next, "Gevşetilecek bağ seçilmedi.", "sistem");
        next.actionsLeft += apCost;
        break;
      }
      if (edge.belgelıLockTurn && next.turn >= edge.belgelıLockTurn) {
        next = addLog(next, "BELGELİ kilit. Bu bağ gevşemez.", "sistem");
        next.actionsLeft += apCost;
        break;
      }
      const cur = next.edgeStr[edge.id] ?? 1;
      next.edgeStr = { ...next.edgeStr, [edge.id]: Math.max(0, cur - 1) };
      next = touchEdge(next, edge.id, { trust: -10, dependency: -8, secrecy: 8, tension: 6 });
      next = applyStat(next, "giz", 5);
      next = applyStat(next, "saha", -3);
      next = applyStat(next, "sadakat", -3);
      next = addLog(next, `Bağ gevşetildi: ${edge.label}. Kişi bağımsızlaşabilir.`, "aksiyon");
      next = pushDecision(next, { kind: "action", id: plan.id, target: edge.id, summary: edge.label });
      return revealDueNodes(syncObjectives(next));
    }
    case "bag_gozet": {
      const edge = needEdge(next, plan);
      if (!edge) {
        next = addLog(next, "Gözetilecek bağ seçilmedi.", "sistem");
        next.actionsLeft += apCost;
        break;
      }
      next = touchEdge(next, edge.id, { secrecy: -6 });
      next = applyStat(next, "bilgi", 5);
      next = applyStat(next, "giz", -3);
      next = setHand(next, entry(edge.id, "PARTIAL", { source: "gözetim", confidence: 45 }));
      next = addLog(next, `Bağ gözetildi: ${edge.label}. Kısmi bilgi. İz kaldı.`, "aksiyon");
      break;
    }
    case "bag_yalitim": {
      const edge = needEdge(next, plan);
      if (!edge) {
        next = addLog(next, "Yalıtılacak bağ seçilmedi.", "sistem");
        next.actionsLeft += apCost;
        break;
      }
      if (edge.belgelıLockTurn && next.turn >= edge.belgelıLockTurn) {
        next = addLog(next, "BELGELİ kilit. Yalıtım bu bağı koparmaz.", "sistem");
        next.actionsLeft += apCost;
        break;
      }
      const cur = next.edgeStr[edge.id] ?? 1;
      next.edgeStr = { ...next.edgeStr, [edge.id]: Math.max(0, cur - 1) };
      next = touchEdge(next, edge.id, { trust: -12, secrecy: 16, tension: 8, dependency: -10 });
      next = applyStat(next, "giz", 6);
      next = applyStat(next, "saha", -4);
      next = remember(next, edge.from, "abandoned");
      next = remember(next, edge.to, "abandoned");
      next = addLog(next, `Bağ yalıtıldı: ${edge.label}. Sekiz duvar. Kapasite düşer.`, "aksiyon");
      break;
    }
    case "bag_ifsa": {
      const edge = needEdge(next, plan);
      if (!edge) {
        next = addLog(next, "İfşa edilecek bağ seçilmedi.", "sistem");
        next.actionsLeft += apCost;
        break;
      }
      next = touchEdge(next, edge.id, { secrecy: -22, tension: 16 });
      next = applyStat(next, "kamuoyu", 8);
      next = applyStat(next, "hukuk", 6);
      next = applyStat(next, "giz", -12);
      next = addDocument(next, `ifsa-${edge.id}`, false);
      next = { ...next, tags: [...next.tags, "inv-expose"] };
      next = addLog(next, `Bağ ifşa: ${edge.label}. Kamu ısınır. Çıpa durmaz.`, "aksiyon");
      break;
    }
    case "bag_arabul": {
      const edge = needEdge(next, plan);
      if (!edge) {
        next = addLog(next, "Arabuluculuk için bağ seçilmedi.", "sistem");
        next.actionsLeft += apCost;
        break;
      }
      next = touchEdge(next, edge.id, { tension: -16, trust: 8, secrecy: -4 });
      next = applyStat(next, "sadakat", 3);
      next = applyStat(next, "giz", -2);
      next = addLog(next, `Arabuluculuk: ${edge.label}. Gerilim düştü.`, "aksiyon");
      break;
    }
    case "bag_koru": {
      const edge = needEdge(next, plan);
      if (!edge) {
        next = addLog(next, "Korunacak bağ seçilmedi.", "sistem");
        next.actionsLeft += apCost;
        break;
      }
      next = touchEdge(next, edge.id, { secrecy: 14, tension: -6, trust: 6, dependency: 8 });
      next = applyStat(next, "giz", 4);
      next = applyStat(next, "saha", -2);
      next = remember(next, edge.from, "protected");
      next = remember(next, edge.to, "protected");
      next = addLog(next, `Bağ korundu: ${edge.label}. Sızıntı yüzeyi kapandı; kapasite bağlandı.`, "aksiyon");
      break;
    }
    case "sizinti_bastir": {
      next = applyStat(next, "giz", idariHat ? 14 : 10);
      next = applyStat(next, "etki", idariHat ? -6 : -8);
      next = applyStat(next, "bilgi", -4);
      next.flags = { ...next.flags, leakSuppressed: true };
      next = { ...next, tags: [...next.tags, "inv-suppress"] };
      next = addLog(next, "Sızıntı bastırma. İnkâr dili güçlendi. Asimetri daraldı.", "aksiyon");
      break;
    }
    case "rakip_sogut": {
      const faction = plan.faction;
      if (!faction || (faction !== "mit" && faction !== "emniyet")) {
        next = addLog(next, "Hedef hat seçilmedi (MİT / Emniyet).", "sistem");
        next.actionsLeft += apCost;
        break;
      }
      if (faction === "emniyet" && !mechanicUnlocked(next, "emniyet") && next.turn < 8) {
        next = addLog(next, "Emniyet hattı henüz ısınmadı.", "sistem");
        next.actionsLeft += apCost;
        break;
      }
      if (faction === "mit") next.flags = { ...next.flags, mitCooledUntil: next.turn + 1 };
      else next.flags = { ...next.flags, emniyetCooledUntil: next.turn + 1 };
      next = applyStat(next, "etki", idariHat ? -4 : -6);
      next = applyStat(next, "kara", -3);
      next = applyStat(next, "bilgi", 2);
      next = addLog(next, `${faction === "mit" ? "MİT" : "Emniyet"} soğutuldu. Eşgüdüm yok; sadece mesafe.`, "aksiyon");
      break;
    }
    case "rapor_yaz": {
      next = applyStat(next, "bilgi", 14);
      next = applyStat(next, "giz", -9);
      next = applyStat(next, "kamuoyu", 3);
      next.flags = { ...next.flags, lastReportTurn: next.turn };
      next = addDocument(next, `rapor-t${next.turn}`, false);
      next = setHand(next, entry("clm_jitem_exists", "TRUE", { source: "rapor", confidence: 75 }));
      next = revealDueNodes(next);
      const newly = NODES.filter((n) => next.revealed[n.id] && !state.revealed[n.id]);
      next = addLog(
        next,
        newly.length
          ? `Rapor. Sis açıldı: ${newly.map((n) => n.name).join(", ")}. Giz çatladı.`
          : "Rapor dolaştı. Yeni düğüm yok; asimetri arttı, giz çatladı.",
        "aksiyon",
      );
      break;
    }
    case "saha_op": {
      if (next.stats.saha >= 40) {
        next = applyStat(next, "etki", 4);
        next = applyStat(next, "kara", 6);
        next = applyStat(next, "giz", sahaHat ? -5 : -7);
        next = applyStat(next, "saha", -2);
        next = addLog(next, "Operasyon: sonuç soyut. Kapasite döndü. Resmi kayıt yok.", "aksiyon");
      } else {
        next = applyStat(next, "giz", -10);
        next = applyStat(next, "saha", -6);
        next = applyStat(next, "etki", -4);
        next = applyStat(next, "hukuk", 4);
        next = addLog(next, "Operasyon zayıf kapasiteyle yürüdü. Sızıntı izi. Ayrıntı yok.", "aksiyon");
      }
      break;
    }
    case "kara_topla": {
      const n = actionRepeat(state, "kara_topla");
      next = applyStat(next, "kara", scaled(12, n));
      next = applyStat(next, "giz", scaled(-4, n));
      next = applyStat(next, "etki", scaled(-2, n));
      next = addLog(next, n ? "Örtülü kaynak tekrar toplandı. Getiri azaldı." : "Örtülü kaynak toplandı. Lojistik döndü, iz kaldı.", "aksiyon");
      break;
    }
    case "inkar_yaz": {
      const n = actionRepeat(state, "inkar_yaz");
      next = applyStat(next, "giz", scaled(idariHat ? 10 : 7, n));
      next = applyStat(next, "bilgi", scaled(-3, n));
      next = applyStat(next, "kamuoyu", 2 + (n >= 2 ? 1 : 0));
      next = setHand(next, entry("clm_official_denial", "TRUE", { source: "resmi dil", confidence: 92 }));
      next = addLog(next, n >= 2 ? "Resmi dil tekrar: yapı yoktur. Tekrar inandırmaz." : "Resmi dil: yapı yoktur. İnkâr yazıldı.", "aksiyon");
      break;
    }
    case "medya_kes": {
      next = applyStat(next, "giz", 6);
      next = applyStat(next, "etki", -5);
      next = applyStat(next, "bilgi", -2);
      next = applyStat(next, "kamuoyu", -4);
      next = addLog(next, "Basın kesildi. Haber sızması daraldı.", "aksiyon");
      break;
    }
    case "ankara_koru": {
      const n = actionRepeat(state, "ankara_koru");
      next = applyStat(next, "etki", scaled(idariHat ? 12 : 9, n));
      next = applyStat(next, "kara", scaled(-6, n));
      next = addLog(next, n ? "Ankara kalkanı tekrar. Getiri azaldı." : "Ankara kalkanı. Kurumsal koruma alındı.", "aksiyon");
      break;
    }
    case "dosya_oku": {
      const n = actionRepeat(state, "dosya_oku");
      next = applyStat(next, "bilgi", scaled(7, n));
      next = applyStat(next, "giz", scaled(-4, n));
      next = addDocument(next, `dosya-t${next.turn}`, false);
      next = revealDueNodes(next);
      next = addLog(next, n ? "Dosya tekrar okundu. Yeni sis az." : "Dosya okundu. Sis biraz açıldı.", "aksiyon");
      break;
    }
    case "kisi_koru":
      return revealDueNodes(
        syncObjectives(runPerson(next, plan, "protect", (s) => applyMany(s, { sadakat: 8, giz: 4, saha: -3 }), "korundu. Saha bağlandı.")),
      );
    case "kisi_kullan":
      return revealDueNodes(
        syncObjectives(runPerson(next, plan, "use", (s) => applyMany(s, { saha: 6, sadakat: -6, giz: -3, kara: 2 }), "kullanıldı. Fayda alındı.")),
      );
    case "kisi_harca":
      return revealDueNodes(
        syncObjectives(runPerson(next, plan, "spend", (s) => applyMany(s, { bilgi: 9, sadakat: -12, giz: -8, kamuoyu: 3 }), "harcandı. Geri dönüşü sert.")),
      );
    case "kisi_mesafe":
      return revealDueNodes(
        syncObjectives(runPerson(next, plan, "distance", (s) => applyMany(s, { giz: 5, sadakat: -4, etki: 1 }), "mesafe. İz küçüldü.")),
      );
    case "soru_yonlendir": {
      next = { ...next, tags: [...next.tags, "inv-direct"] };
      next = applyStat(next, "hukuk", 3);
      next = applyStat(next, "etki", -3);
      next = addLog(next, "Soruşturma yönlendirildi. Kontrol değil, sapma. Durdurulmadı.", "aksiyon");
      break;
    }
    case "soru_ac": {
      next = { ...next, tags: [...next.tags, "inv-expose"] };
      next = applyStat(next, "kamuoyu", 6);
      next = applyStat(next, "hukuk", 4);
      next = applyStat(next, "giz", -8);
      next = addLog(next, "Soruşturma yüzeyi açığa çekildi. Kamu öne alındı.", "aksiyon");
      break;
    }
    case "soru_sinir": {
      next = { ...next, tags: [...next.tags, "inv-limit"] };
      next = applyStat(next, "giz", 4);
      next = applyStat(next, "hukuk", next.hat === "hukuk" ? -5 : -3);
      next = applyStat(next, "kamuoyu", 1);
      next = addLog(next, "Soruşturma sınırlandı. Dar tutuldu; sönmedi.", "aksiyon", "act.soru_sinir");
      break;
    }
    case "kaynak_karsilastir": {
      const held = Object.values(next.hand).filter((h) => h.status !== "UNKNOWN");
      const compared = new Set((next.investigation.comparisons ?? []).map((c) => c.claimId));
      const clash = ALL_CLAIMS.filter((c) => c.contradiction && held.some((h) => h.claimId === c.id) && c.sourceIds.length >= 2);
      const fallback = ALL_CLAIMS.filter((c) => c.contradiction && held.some((h) => h.claimId === c.id));
      const unusedClash = clash.filter((c) => !compared.has(c.id));
      const unusedFb = fallback.filter((c) => !compared.has(c.id));
      const pick = unusedClash[0] ?? clash[0] ?? unusedFb[0] ?? fallback[0];
      next = applyStat(next, "bilgi", 8);
      next = applyStat(next, "giz", -3);
      next = applyStat(next, "kamuoyu", pick ? 2 : 1);
      if (pick) {
        next = setHand(next, entry(pick.id, "PARTIAL", { source: pick.sourceIds.join(" / "), confidence: 58 }));
        next = recordComparison(next, pick.id, pick.sourceIds);
        next = setFactionKnow(next, "media", entry(pick.id, "RUMOR", { source: "karşılaştırma sızıntısı", confidence: 30 }));
        next = setFactionKnow(next, "hukuk", entry(pick.id, "PARTIAL", { source: "karşılaştırma notu", confidence: 40 }));
        if (!next.tags.includes(`src-open:${pick.id}`)) next = { ...next, tags: [...next.tags, `src-open:${pick.id}`] };
      }
      next = addLog(
        next,
        pick
          ? `Kaynaklar karşılaştırıldı: ${pick.title}. ${pick.sourceIds.length} kaynak yan yana. Çelişki dosyaya işlendi; tek doğru kilitlenmedi.`
          : "Kaynaklar karşılaştırıldı. Elindeki kayıtlarda henüz iki kaynaklı çelişki yok.",
        "aksiyon",
        "act.kaynak_karsilastir",
      );
      break;
    }
    case "src_tut": {
      const claimId = openClaim(next, plan);
      if (!claimId) {
        next.actionsLeft += apCost;
        next = addLog(next, "Tutulacak karşılaştırma yok.", "sistem", "act.src_tut.none");
        break;
      }
      const media = next.factions.media.knowledgeBase[claimId];
      if (media) {
        next = setFactionKnow(next, "media", { ...media, confidence: Math.max(8, media.confidence - 18), propagationRisk: Math.max(8, media.propagationRisk - 12) });
      }
      next = applyStat(next, "giz", 4);
      next = applyStat(next, "kamuoyu", -2);
      next = { ...next, tags: [...next.tags, `src-held:${claimId}`] };
      next = addLog(next, "Karşılaştırma tutuldu. Basına dökülmedi. Çelişki dosyada kaldı.", "aksiyon", "act.src_tut");
      break;
    }
    case "src_paylas": {
      const claimId = openClaim(next, plan);
      if (!claimId) {
        next.actionsLeft += apCost;
        next = addLog(next, "Paylaşılacak karşılaştırma yok.", "sistem", "act.src_paylas.none");
        break;
      }
      next = setFactionKnow(next, "hukuk", entry(claimId, "PARTIAL", { source: "karşılaştırma paylaşımı", confidence: 52 }));
      next = applyStat(next, "hukuk", 4);
      next = applyStat(next, "giz", -3);
      next = { ...next, investigation: { ...next.investigation, heat: next.investigation.heat + 2 }, tags: [...next.tags, `src-shared:${claimId}`] };
      next = addLog(next, "Karşılaştırma hukuk hattına verildi. Emir üretilmedi.", "aksiyon", "act.src_paylas");
      break;
    }
    case "src_yayin": {
      const claimId = openClaim(next, plan);
      if (!claimId) {
        next.actionsLeft += apCost;
        next = addLog(next, "Yayımlanacak karşılaştırma yok.", "sistem", "act.src_yayin.none");
        break;
      }
      next = setFactionKnow(next, "media", entry(claimId, "PARTIAL", { source: "yayımlanan karşılaştırma", confidence: 48 }));
      next = applyStat(next, "kamuoyu", 6);
      next = applyStat(next, "giz", -6);
      next = applyStat(next, "hukuk", 2);
      next = { ...next, tags: [...next.tags, `src-published:${claimId}`] };
      next = addLog(next, "Karşılaştırma yayımlandı. Kamu ısındı. Tek doğru kilitlenmedi.", "aksiyon", "act.src_yayin");
      break;
    }
    case "dogrula": {
      const rumor = Object.values(next.hand).find((h) => h.status === "RUMOR") ?? Object.values(next.hand).find((h) => h.status === "PARTIAL");
      if (!rumor) {
        next.actionsLeft += apCost;
        next = addLog(next, "Yoklanacak söylenti yok.", "sistem", "act.dogrula.none");
        break;
      }
      const claim = ALL_CLAIMS.find((c) => c.id === rumor.claimId);
      const world = next.truth[rumor.claimId];
      const nextStatus = claim?.contradiction || world === "UNKNOWN" || world === "PARTIAL" ? "PARTIAL" : world === "TRUE" ? "PARTIAL" : "RUMOR";
      const bump = claim?.evidence === "BELGELİ" ? 24 : claim?.evidence === "GÜÇLÜ" ? 18 : 10;
      next = setHand(next, entry(rumor.claimId, nextStatus, { source: "yoklama", confidence: Math.min(72, rumor.confidence + bump) }));
      next = applyStat(next, "bilgi", 6);
      next = applyStat(next, "giz", -4);
      next = applyStat(next, "kamuoyu", 2);
      next = { ...next, investigation: { ...next.investigation, heat: next.investigation.heat + 1 } };
      next = addLog(next, `Söylenti yoklandı: ${claim?.title ?? rumor.claimId}. Kesinleştirilmedi.`, "aksiyon", "act.dogrula");
      break;
    }
    case "delil_zincir": {
      const held = Object.values(next.hand).filter((h) => h.status === "PARTIAL" || h.status === "TRUE");
      const compared = (next.investigation.comparisons ?? []).map((c) => c.claimId);
      const chained = new Set((next.investigation.chain ?? []).map((c) => c.claimId));
      const eligible = ALL_CLAIMS.filter((c) => held.some((h) => h.claimId === c.id));
      const byPlan = plan.claimId ? eligible.find((c) => c.id === plan.claimId) : undefined;
      const unusedCompared = eligible.filter((c) => compared.includes(c.id) && !chained.has(c.id));
      const unusedStrong = eligible.filter((c) => (c.evidence === "BELGELİ" || c.evidence === "GÜÇLÜ") && !chained.has(c.id));
      const bound =
        byPlan ??
        unusedCompared[0] ??
        unusedStrong[0] ??
        eligible.find((c) => compared.includes(c.id)) ??
        eligible.find((c) => c.evidence === "BELGELİ" || c.evidence === "GÜÇLÜ") ??
        eligible[0];
      if (!bound) {
        next.actionsLeft += apCost;
        next = addLog(next, "Delil zincirine bağlanacak uygun iddia yok.", "sistem", "act.delil_zincir.none");
        break;
      }
      const claimId = bound.id;
      const docId = `doc-${claimId}-t${next.turn}`;
      next = recordChainLink(next, claimId, docId);
      next = applyStat(next, "hukuk", 7);
      next = applyStat(next, "giz", -4);
      next = applyStat(next, "bilgi", 3);
      if (next.stats.kamuoyu >= 32) next = applyStat(next, "kamuoyu", 1);
      next = setFactionKnow(next, "hukuk", entry(claimId, "PARTIAL", { source: "delil halkası", confidence: 48 }));
      next = addLog(next, `Delil zincirine halka: ${bound.title}. Emir üretilmedi.`, "aksiyon", "act.delil_zincir");
      break;
    }
    case "kanit_esigi": {
      const docs = next.investigation.documents.length;
      const chainN = (next.investigation.chain ?? []).length;
      const comparedN = (next.investigation.comparisons ?? []).length;
      if (docs >= 2 || chainN >= 2) {
        next = { ...next, tags: [...next.tags, "inv-direct"] };
        next = applyStat(next, "hukuk", 6 + (comparedN >= 1 ? 2 : 0));
        next = applyStat(next, "giz", -3);
        next = addLog(next, "Kanıt eşiği işletildi. Dosya bir kat ilerledi.", "aksiyon", "act.kanit_esigi");
      } else {
        next = { ...next, tags: [...next.tags, "inv-limit"] };
        next = applyStat(next, "hukuk", 3);
        next = applyStat(next, "giz", 2);
        next = addLog(next, "Eşik tutuldu: belge yetersiz. Spekülasyon öne alınmadı; soruşturma sönmedi.", "aksiyon", "act.kanit_esigi.hold");
      }
      break;
    }
  }

  next = pushDecision(next, { kind: "action", id: plan.id, summary: plan.id });
  return revealDueNodes(syncObjectives(next));
}

function tickSides(state: GameState, notes: string[]): GameState {
  let next = state;
  const fams = pickSideFamilies(next, 2);
  for (const fam of fams) {
    next = applyFamilyFire(next, fam, notes);
  }
  return next;
}

function tickResources(state: GameState, notes: string[]): GameState {
  let next = state;
  const t = tightness(next);
  const gizDrain = 1 + Math.floor(t / 8);
  next = applyStat(next, "giz", -gizDrain);
  notes.push(`note.tick.giz|n=${gizDrain}|t=${t}`);

  if (next.hat === "idari") next = applyStat(next, "etki", 1);
  else if (next.hat === "saha") next = applyStat(next, "etki", -1);
  else if (next.hat === "arastirmaci") {
    next = applyStat(next, "bilgi", 1);
    if (next.stats.kamuoyu >= 24) next = applyStat(next, "giz", -1);
  } else if (next.hat === "hukuk") {
    if (next.investigation.stage !== "dormant") next = applyStat(next, "hukuk", 1);
  }
  next = hatTick(next, notes);

  if (next.stats.kara < 20) {
    next = applyStat(next, "saha", -4);
    notes.push("note.tick.kara");
  } else if (next.stats.saha >= 50) {
    next = applyStat(next, "kara", 3);
  }

  if (next.stats.giz < 40) {
    next = applyStat(next, "bilgi", -2);
    next = applyStat(next, "kamuoyu", 2);
    notes.push("note.tick.gizThin");
  }

  if (next.stats.giz < 12) {
    next = {
      ...next,
      flags: {
        ...next.flags,
        investigationOpen: true,
        gizCrisisTurns: next.flags.gizCrisisTurns + 1,
      },
    };
    next = applyStat(next, "hukuk", 3);
    notes.push("note.tick.crisis");
  } else {
    next = { ...next, flags: { ...next.flags, gizCrisisTurns: 0 } };
  }

  if (next.stats.sadakat < 25) {
    next = applyStat(next, "saha", -2);
    notes.push("note.tick.loyalty");
  }

  return next;
}

export function evaluateEnding(state: GameState): EndingId | null {
  return pickEnding(state);
}

function finish(state: GameState, ending: EndingId, notes: string[]): GameState {
  const dossier = buildDossier({ ...state, ending });
  const recap = buildRecap({ ...state, ending, dossier });
  let next: GameState = {
    ...state,
    phase: "ended",
    ending,
    lastResolution: notes,
    recap,
    dossier,
    replayMeta: {
      ...state.replayMeta,
      decisions: state.decisions,
      events: state.replay,
      factions: Object.values(state.factions).map((f) => `${f.id}:${f.lastAct}`),
      major: notes.slice(0, 8),
    },
  };
  next = addLog(next, `SONUÇ — ${ENDINGS[ending].verdict}: ${ENDINGS[ending].title}`, "sistem");
  return next;
}

export function resolveTurn(state: GameState): GameState {
  const notes: string[] = [];
  let next = tickFactions(state, notes);
  next = tickKnowledge(next, notes);
  next = tickSides(next, notes);
  next = tickMemory(next, notes);
  next = tickInvestigation(next, notes);
  next = tickResources(next, notes);
  next = syncObjectives(next);
  next = revealDueNodes(next);

  for (const n of notes) {
    const kind: LogEntry["kind"] = n.startsWith("note.tick")
      ? "sistem"
      : n.startsWith("note.inv") || n.startsWith("note.know") || n.startsWith("note.mem")
        ? "gizli"
        : n.startsWith("note.")
          ? "npc"
          : n.startsWith("Ağ sızdırmazlık")
            ? "sistem"
            : n.includes("MİT") ||
                n.includes("Emniyet") ||
                n.includes("JİTEM") ||
                n.includes("Ersever") ||
                n.includes("3 Kasım") ||
                n.includes("Abas") ||
                n.includes("Basın") ||
                n.includes("Siyaset") ||
                n.includes("Asker")
              ? "npc"
              : "gizli";
    next = addLog(next, n, kind);
  }

  const ending = evaluateEnding(next);
  if (ending) return finish(next, ending, notes);

  return {
    ...next,
    phase: "resolution",
    lastResolution: notes,
    pendingAction: null,
  };
}

export function advanceTurn(state: GameState): GameState {
  if (state.phase === "ended") return state;
  const turn = state.turn + 1;
  if (turn > 10) {
    const ending = evaluateEnding({ ...state, turn: 10 }) ?? "kontrollu_parcalanma";
    return finish(state, ending, state.lastResolution);
  }
  const next: GameState = {
    ...state,
    turn,
    phase: "event",
    actionsLeft: apFor(state.hat),
    selectedEdgeId: null,
    pendingAction: null,
    lastResolution: [],
  };
  return syncObjectives(applyEvent(next));
}

export function endingOf(id: EndingId) {
  return ENDINGS[id];
}

export function onboardingHint(state: GameState): string | null {
  if (state.turn === 1 && state.phase === "actions") return "onboard.t1";
  if (state.turn === 2 && state.phase === "actions") return "onboard.t2";
  if (state.turn === 3 && state.phase === "actions") return "onboard.t3";
  return null;
}
