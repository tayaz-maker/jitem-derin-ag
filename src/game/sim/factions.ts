import type { Faction, FactionMind, GameState, KnowledgeEntry } from "../types.ts";
import { entry, setFactionKnow, setHand } from "./knowledge.ts";
import { hasMemory } from "./memory.ts";
import { rollAi } from "./rng.ts";
import { applyStat } from "./stats.ts";

type FacDef = {
  id: Faction;
  name: string;
  agenda: string;
  fear: string;
  startsKnown: string[];
  redLines: string[];
  allies: Faction[];
  rivals: Faction[];
};

export const FACTION_DEFS: FacDef[] = [
  { id: "jitem", name: "JİTEM / saha", agenda: "Kapasite ve resmi yok dili.", fear: "Görünürlük ve konuşan içerideki.", startsKnown: ["jitem", "dogan", "ersever", "guneydogu"], redLines: ["resmi varlık kabulü"], allies: [], rivals: ["media", "hukuk"] },
  { id: "mit", name: "MİT iç hatları", agenda: "Kendi kurumunu korumak.", fear: "İç hat kırılması, yanlış bağ.", startsKnown: ["mit"], redLines: ["jitem emri gibi görünmek"], allies: [], rivals: ["jitem"] },
  { id: "emniyet", name: "Emniyet / özel tim", agenda: "Kendi kesişimi.", fear: "Siyasi terk, kamu karesi.", startsKnown: ["emniyet"], redLines: ["jandarma uzantısı sayılmak"], allies: ["siyaset"], rivals: ["jitem"] },
  { id: "media", name: "Basın", agenda: "Haber. Yanlış bilgiye açık.", fear: "Tekzip / kaynak kuruması.", startsKnown: [], redLines: [], allies: [], rivals: [] },
  { id: "hukuk", name: "Savcı / meclis", agenda: "Dosya ve kamu.", fear: "Siyasi bloke.", startsKnown: [], redLines: [], allies: ["media"], rivals: [] },
  { id: "askeri", name: "Askerî bürokrasi", agenda: "Kurumsal mesafe.", fear: "Saha detayının görünmesi.", startsKnown: ["jitem"], redLines: ["siyasi emir kabulü"], allies: [], rivals: ["media"] },
  { id: "yeralti", name: "Yeraltı", agenda: "Fayda.", fear: "Harcanmak.", startsKnown: [], redLines: [], allies: ["emniyet"], rivals: [] },
  { id: "siyaset", name: "Siyasi koruma", agenda: "Kalkan ve inkâr dili.", fear: "Kamu kilidi.", startsKnown: [], redLines: ["meclis karesi"], allies: ["emniyet"], rivals: ["hukuk"] },
];

function baseKnow(ids: string[]): Record<string, KnowledgeEntry> {
  const out: Record<string, KnowledgeEntry> = {};
  for (const id of ids) out[id] = entry(id, "PARTIAL", { source: "kendi dosya", confidence: 60 });
  return out;
}

export function initialFactions(): Record<string, FactionMind> {
  const out: Record<string, FactionMind> = {};
  for (const f of FACTION_DEFS) {
    out[f.id] = {
      id: f.id,
      known: [...f.startsKnown],
      rumor: [],
      hostility: 18,
      lastAct: "",
      agenda: f.agenda,
      fear: f.fear,
      resources: 40,
      confidence: 50,
      redLines: [...f.redLines],
      allies: [...f.allies],
      rivals: [...f.rivals],
      currentObjective: f.agenda,
      memory: [],
      knowledgeBase: baseKnow(f.startsKnown),
    };
  }
  out.jitem.knowledgeBase.clm_jitem_exists = entry("clm_jitem_exists", "TRUE", { source: "saha", confidence: 85 });
  out.jitem.knowledgeBase.clm_official_denial = entry("clm_official_denial", "TRUE", { source: "resmi dil", confidence: 90 });
  out.media.knowledgeBase.clm_jitem_exists = entry("clm_jitem_exists", "UNKNOWN", { confidence: 10 });
  out.askeri.knowledgeBase.clm_official_denial = entry("clm_official_denial", "TRUE", { source: "resmi dil", confidence: 80 });
  return out;
}

function setMind(state: GameState, id: Faction, mind: FactionMind): GameState {
  return { ...state, factions: { ...state.factions, [id]: mind } };
}

function rememberFac(mind: FactionMind, note: string, objective?: string): FactionMind {
  return {
    ...mind,
    memory: [...mind.memory.slice(-7), note],
    lastAct: note,
    currentObjective: objective ?? mind.currentObjective,
  };
}

function statusOf(mind: FactionMind, claimId: string) {
  return mind.knowledgeBase[claimId]?.status ?? "UNKNOWN";
}

/**
 * 1 evaluate → 2 interpret (from own knowledge) → 3 pick objective → 4 act → 5 remember
 * Small seed variation, not coin-flip chaos.
 */
function actFaction(state: GameState, id: Faction, notes: string[], roll: number): GameState {
  const mind = state.factions[id];
  if (!mind) return state;
  let next = state;

  const giz = next.stats.giz;
  const knowsJitem = statusOf(mind, "clm_jitem_exists");
  const exposed = giz < 35 && (knowsJitem === "TRUE" || knowsJitem === "PARTIAL");
  const hungry = mind.resources < 28;
  const angry = mind.hostility >= 28;
  const scared = mind.confidence < 36;
  const wrong = Object.values(mind.knowledgeBase).some((k) => k.status === "FALSE" || k.status === "RUMOR");

  if (id === "jitem") {
    const obj = next.stats.saha < 36 ? "kapasite kapat" : giz < 28 ? "iz küçült" : "inkârı tut";
    if (next.stats.saha < 36 && next.turn <= 7 && !next.flags.erseverDead) {
      next = applyStat(next, "saha", 5);
      next = applyStat(next, "giz", -3);
      notes.push("JİTEM hattı kapasite açığını kendi başına kapatıyor. Masa emretmedi.");
      next = setMind(next, "jitem", rememberFac({ ...next.factions.jitem, resources: mind.resources - 4 }, "freelance-capacity", obj));
    } else if (hasMemory(next, "ersever", "spent") && next.turn <= 7 && roll < 0.42) {
      next = applyStat(next, "giz", -4);
      notes.push("JİTEM: harcanan saha hattı kin taşıyor. Freelance sızıntı.");
      next = setMind(next, "jitem", rememberFac(next.factions.jitem, "spent-resentment", obj));
    } else if (hungry && roll > 0.7) {
      next = applyStat(next, "kara", 2);
      next = setMind(next, "jitem", rememberFac({ ...next.factions.jitem, resources: mind.resources + 3 }, "scrape-funds", obj));
    } else {
      next = setMind(next, "jitem", { ...next.factions.jitem, currentObjective: obj });
    }
    return next;
  }

  if (id === "mit") {
    const obj = knowsJitem === "RUMOR" ? "yanlış bağa mesafe" : next.flags.mitCooledUntil >= next.turn ? "bekle" : "kendi kurumunu koru";
    if (next.turn >= 3 && next.flags.mitCooledUntil < next.turn && [3, 5, 8, 9].includes(next.turn)) {
      const mitKnowsJitem = knowsJitem === "TRUE" || mind.known.includes("jitem");
      next = applyStat(next, "bilgi", mitKnowsJitem ? 5 : 3);
      next = applyStat(next, "giz", -4);
      notes.push(
        mitKnowsJitem
          ? "MİT içi hat: yazılı uyarı. Eymür tipi. JİTEM’in emri değil."
          : "MİT içi hat: eksik bilgiyle uyarı yazdı. Asimetri — yanlış da olabilir.",
      );
      next = setFactionKnow(next, "mit", entry("clm_jitem_exists", mitKnowsJitem ? "TRUE" : "RUMOR", { source: "memo", confidence: mitKnowsJitem ? 70 : 40 }));
      next = setMind(next, "mit", rememberFac({ ...next.factions.mit, hostility: next.factions.mit.hostility + 4 }, "memo", obj));
    } else if (next.flags.mitCooledUntil >= next.turn) {
      notes.push("MİT hattı bu tur soğuk. Uyarı gecikti — bilmedikleri duruyor.");
      next = setMind(next, "mit", rememberFac(next.factions.mit, "cooled", obj));
    } else if (statusOf(mind, "clm_abas_jitem") === "RUMOR" && next.turn >= 6 && roll > 0.62) {
      notes.push("MİT yanlış bağa (Abas–JİTEM) dayanarak mesafe koyuyor. Dünya gerçeği bunu kilitlemez.");
      next = applyStat(next, "etki", -2);
      next = setMind(next, "mit", rememberFac({ ...next.factions.mit, hostility: mind.hostility + 2 }, "false-bind", obj));
    }
    return next;
  }

  if (id === "emniyet") {
    const obj = next.flags.emniyetCooledUntil >= next.turn ? "soğuk kesişim" : "kendi payını ısıt";
    if (next.turn >= 8 && next.flags.emniyetCooledUntil < next.turn) {
      const edgeStr = { ...next.edgeStr };
      if (next.revealed.catli) {
        edgeStr["catli-kocadag"] = Math.min(3, (edgeStr["catli-kocadag"] ?? 1) + 1);
        edgeStr["catli-emniyet"] = Math.min(3, (edgeStr["catli-emniyet"] ?? 1) + 1);
      }
      next = { ...next, edgeStr };
      next = applyStat(next, "giz", -5);
      next = applyStat(next, "kara", 4);
      notes.push("Emniyet–yeraltı kesişimi ısınıyor. Çatlı hattı yükseliyor. JİTEM uzantısı değil.");
      next = setFactionKnow(next, "emniyet", entry("catli", "TRUE", { source: "kendi hat", confidence: 70 }));
      next = setMind(next, "emniyet", rememberFac({ ...next.factions.emniyet, resources: mind.resources + 3 }, "warm", obj));
    } else if (next.turn >= 8 && next.flags.emniyetCooledUntil >= next.turn) {
      notes.push("Emniyet hattı soğutuldu. Kesişim yavaşladı; kaza takvimi durmaz.");
      next = setMind(next, "emniyet", rememberFac(mind, "cooled", obj));
    }
    return next;
  }

  if (id === "media") {
    const obj = knowsJitem === "TRUE" ? "yaz ve ısıt" : "söylenti tara";
    if (giz < 35 && knowsJitem === "UNKNOWN") {
      next = setFactionKnow(next, "media", entry("clm_jitem_exists", "RUMOR", { confidence: 25 }));
      notes.push("Basın JİTEM’i henüz doğrulamıyor; söylenti. Masa biliyor, kamu tam değil.");
      next = setMind(next, "media", rememberFac(next.factions.media, "rumor-jitem", obj));
    } else if (knowsJitem === "RUMOR" && giz < 45 && roll > 0.45) {
      next = applyStat(next, "kamuoyu", 3);
      notes.push("Basın söylentiyle yazdı. Teyit yok — yanlış da olabilir.");
      next = setMind(next, "media", rememberFac(next.factions.media, "print-rumor", obj));
    } else if (wrong && roll > 0.6) {
      next = applyStat(next, "kamuoyu", 2);
      notes.push("Basın yanlış veya söylenti bilgiye dayanarak yazdı. Teyit yok.");
      next = setMind(next, "media", rememberFac(next.factions.media, "print-wrong", obj));
    } else if (knowsJitem === "PARTIAL" || knowsJitem === "TRUE") {
      next = applyStat(next, "kamuoyu", 2);
      next = applyStat(next, "giz", -1);
      next = setMind(next, "media", rememberFac(next.factions.media, "print-partial", obj));
    }
    return next;
  }

  if (id === "hukuk") {
    const obj = next.investigation.stage === "dormant" ? "bekle" : "dosyayı ilerlet";
    if (next.flags.investigationOpen) {
      next = applyStat(next, "hukuk", 2);
      next = setMind(next, "hukuk", rememberFac({ ...next.factions.hukuk, hostility: mind.hostility + 1 }, "file-heat", obj));
    } else if (next.stats.kamuoyu >= 36 && roll > 0.55) {
      next = applyStat(next, "hukuk", 1);
      notes.push("Hukuk kamu ısısından dosya kokusu aldı. Henüz soruşturma değil.");
      next = setMind(next, "hukuk", rememberFac(next.factions.hukuk, "sniff", obj));
    }
    return next;
  }

  if (id === "siyaset") {
    const obj = hasMemory(next, "agar", "protected") ? "kalkanı tut" : next.stats.kamuoyu >= 42 ? "mesafe" : "inkâr dili";
    if (hasMemory(next, "agar", "protected") && next.turn >= 8) {
      next = applyStat(next, "etki", 2);
      notes.push("Siyaset: korunan kalkan duruyor. Karşılık sınırlı.");
      next = setMind(next, "siyaset", rememberFac(next.factions.siyaset, "shield", obj));
    } else if (next.stats.kamuoyu >= 48 && roll > 0.4) {
      next = applyStat(next, "etki", -3);
      notes.push("Siyaset kamu ısısından çekiliyor. Emir yok; örtü incelir.");
      next = setMind(next, "siyaset", rememberFac({ ...next.factions.siyaset, confidence: mind.confidence - 6 }, "distance", obj));
    }
    return next;
  }

  if (id === "askeri") {
    const obj = giz < 38 ? "saha detayından uzak dur" : "resmi dili tut";
    if (exposed && roll > 0.5) {
      next = applyStat(next, "giz", 2);
      next = applyStat(next, "saha", -1);
      notes.push("Askerî bürokrasi saha detayından uzak durdu. Resmi dil kalın.");
      next = setMind(next, "askeri", rememberFac(next.factions.askeri, "distance", obj));
    } else {
      next = setMind(next, "askeri", { ...mind, currentObjective: obj });
    }
    return next;
  }

  if (id === "yeralti") {
    const obj = hasMemory(next, "catli", "spent") ? "kaç / sızdır" : "fayda al";
    if (hasMemory(next, "catli", "spent") && next.turn >= 8 && roll < 0.5) {
      next = applyStat(next, "giz", -4);
      notes.push("Yeraltı: harcanan hat sızdırıyor. Fayda bitti.");
      next = setMind(next, "yeralti", rememberFac(next.factions.yeralti, "leak", obj));
    } else if (next.revealed.catli && !scared) {
      next = setMind(next, "yeralti", rememberFac({ ...mind, resources: mind.resources + (angry ? 0 : 2) }, "ride", obj));
    }
    return next;
  }

  return next;
}

export function tickAnchors(state: GameState, notes: string[]): GameState {
  let next = state;
  if (next.flags.abasDead && next.turn === 5) {
    next = applyStat(next, "etki", -4);
    notes.push("Abas hattı kırıldı. MİT mesafe koyuyor. JİTEM’e zorla bağlama — TARTIŞMALI.");
    next = setFactionKnow(next, "mit", entry("clm_abas_jitem", "RUMOR", { source: "şok", confidence: 30, propagationRisk: 50 }));
    next = setMind(next, "mit", {
      ...next.factions.mit,
      hostility: next.factions.mit.hostility + 12,
      confidence: 32,
      lastAct: "abas-shock",
      memory: [...next.factions.mit.memory.slice(-7), "abas-shock"],
    });
  }

  if (next.turn === 6 && next.flags.erseverTalked) {
    const base = next.flags.leakSuppressed ? 12 : 22;
    const extra = next.flags.commandShifted ? 5 : 0;
    const spent = hasMemory(next, "ersever", "spent") ? 6 : 0;
    next = applyStat(next, "giz", -(base + extra + spent));
    next = applyStat(next, "bilgi", 16);
    next = applyStat(next, "kamuoyu", next.flags.leakSuppressed ? 6 : 12);
    notes.push(
      next.flags.leakSuppressed
        ? "Ersever konuştu. Kaset var. Bastırma GİZ kaybını kesti; yok etmedi."
        : "Ersever konuştu. İçeriden kırılma. BİLGİ patladı, GİZ yandı.",
    );
    next = setFactionKnow(next, "media", entry("clm_jitem_exists", "PARTIAL", { source: "kaset", confidence: 55 }));
    next = setFactionKnow(next, "mit", entry("clm_jitem_exists", "TRUE", { source: "kaset", confidence: 75 }));
    next = setHand(next, entry("clm_jitem_exists", "TRUE", { source: "kaset", confidence: 80 }));
  }

  if (next.turn === 10 && next.flags.susurluk) {
    next = applyStat(next, "kamuoyu", 18);
    next = applyStat(next, "hukuk", 14);
    notes.push("3 Kasım. BELGELİ kilit. Görünürlük şoku. TBMM ve kamuoyu aynı kareye bakıyor.");
    next = setFactionKnow(next, "hukuk", entry("clm_susurluk_car", "TRUE", { source: "kaza", confidence: 95 }));
    next = setFactionKnow(next, "media", entry("clm_susurluk_car", "TRUE", { source: "kaza", confidence: 95 }));
    next = setMind(next, "hukuk", rememberFac(next.factions.hukuk, "commission", "komisyon"));
    next = setMind(next, "siyaset", rememberFac(next.factions.siyaset, "crash-distance", "mesafe"));
  }
  return next;
}

export function tickFactions(state: GameState, notes: string[]): GameState {
  let next = tickAnchors(state, notes);
  const order: Faction[] = ["jitem", "mit", "emniyet", "yeralti", "siyaset", "media", "hukuk", "askeri"];
  const acts: string[] = [];
  for (const id of order) {
    const [rolled, r] = rollAi(next, next.turn + id.length);
    next = rolled;
    const before = next.factions[id]?.lastAct ?? "";
    next = actFaction(next, id, notes, r);
    const after = next.factions[id]?.lastAct ?? "";
    if (after && after !== before) acts.push(`${id}:${after}`);
  }

  if (next.turn >= 8 && next.flags.emniyetCooledUntil < next.turn) {
    const media = next.factions.media;
    if (media.knowledgeBase.clm_jitem_exists?.status !== "TRUE" && next.stats.giz < 40) {
      if (!media.knowledgeBase.catli || media.knowledgeBase.catli.status === "UNKNOWN") {
        next = setFactionKnow(next, "media", entry("catli", "RUMOR", { source: "söylenti", confidence: 28 }));
        notes.push("Basın Çatlı’yı söylenti olarak duydu. BELGELİ kilit henüz yok.");
      }
    }
  }

  next = {
    ...next,
    replay: [
      ...next.replay,
      { turn: next.turn, factionActs: acts.slice(0, 4), note: next.factions.mit.lastAct },
    ],
  };
  return next;
}
