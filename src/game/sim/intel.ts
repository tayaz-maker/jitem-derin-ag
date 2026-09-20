import type { Faction, GameState } from "../types.ts";
import { FACTION_DEFS } from "./factions.ts";
import { mechanicUnlocked } from "./acts.ts";

export type IntelGrade = "KNOWN" | "SUSPECTED" | "RUMOR" | "UNKNOWN";

export interface IntelSignal {
  faction: Faction;
  name: string;
  grade: IntelGrade;
  headline: string;
}

const ACT_HEADLINE: Record<string, { grade: IntelGrade; text: string }> = {
  "freelance-capacity": { grade: "SUSPECTED", text: "Saha hattında emirsiz kapasite kayması duyuldu." },
  "spent-resentment": { grade: "RUMOR", text: "İçeride harcanan hat kırgın; sızıntı söylentisi." },
  "scrape-funds": { grade: "RUMOR", text: "Örtülü kaynak arayışı. Kesin değil." },
  "distance-jitem": { grade: "SUSPECTED", text: "MİT hattında mesafe / soğutma hareketi." },
  "wait": { grade: "SUSPECTED", text: "MİT hattı bekliyor. Sinyal zayıf." },
  "protect-self": { grade: "SUSPECTED", text: "MİT kendi kurumunu kapatıyor." },
  "abas-shock": { grade: "KNOWN", text: "MİT şoku: Abas hattı kırıldı. JİTEM’e bağ TARTIŞMALI durur." },
  "catli-rise": { grade: "SUSPECTED", text: "Emniyet kesişiminde ısınma." },
  "cool": { grade: "SUSPECTED", text: "Karşı hat soğutuldu; eşgüdüm yok." },
  "leak": { grade: "RUMOR", text: "Yeraltı sızıntısı söylentisi." },
  ride: { grade: "RUMOR", text: "Yeraltı fayda arıyor." },
  shield: { grade: "SUSPECTED", text: "Siyasi kalkan duruyor." },
  distance: { grade: "SUSPECTED", text: "Siyaset kamu ısısından çekiliyor." },
  "crash-distance": { grade: "KNOWN", text: "Siyaset kaza karesinden mesafe koyuyor." },
  commission: { grade: "KNOWN", text: "Hukuk / meclis karesi açıldı." },
  "press-rumor": { grade: "RUMOR", text: "Basında söylenti büyüyor." },
  "press-false": { grade: "RUMOR", text: "Basın yanlış veya eksik yazıyor." },
  "press-push": { grade: "SUSPECTED", text: "Basın baskısı artıyor." },
  "file-open": { grade: "SUSPECTED", text: "Savcı hattında dosya ısısı." },
  "file-block": { grade: "SUSPECTED", text: "Hukuk siyasi bloke ile karşılaştı." },
};

function factionVisible(state: GameState, id: Faction): boolean {
  if (id === "jitem") return true;
  if (id === "mit") return state.turn >= 3 || Boolean(state.revealed.mit);
  if (id === "emniyet") return mechanicUnlocked(state, "emniyet") || Boolean(state.revealed.emniyet);
  if (id === "media") return mechanicUnlocked(state, "knowledge") || state.turn >= 3;
  if (id === "hukuk") return mechanicUnlocked(state, "investigation") || state.investigation.stage !== "dormant";
  if (id === "askeri") return state.turn >= 4;
  if (id === "siyaset") return state.turn >= 4;
  if (id === "yeralti") return Boolean(state.revealed.catli) || state.turn >= 8;
  return Boolean(state.revealed[id]);
}

function gradeFor(state: GameState, id: Faction, lastAct: string): IntelGrade {
  if (id === "jitem") return "KNOWN";
  const mapped = ACT_HEADLINE[lastAct];
  if (mapped?.grade === "KNOWN" && (id === "mit" || lastAct === "commission" || lastAct === "crash-distance" || lastAct === "abas-shock")) {
    return "KNOWN";
  }
  const hand = Object.values(state.hand);
  if (id === "media") {
    const press = hand.find((h) => h.claimId === "clm_jitem_exists");
    if (press?.status === "TRUE") return mapped?.grade === "RUMOR" ? "RUMOR" : "SUSPECTED";
    return "RUMOR";
  }
  if (!lastAct) return "UNKNOWN";
  return mapped?.grade ?? "SUSPECTED";
}

function headlineFor(id: Faction, name: string, lastAct: string, grade: IntelGrade): string {
  if (grade === "UNKNOWN" && !lastAct) return `${name}: sis. Elinde somut hareket yok.`;
  const mapped = ACT_HEADLINE[lastAct];
  if (mapped) {
    if (grade === "RUMOR" && mapped.grade === "KNOWN") return `Söylenti: ${mapped.text}`;
    return mapped.text;
  }
  if (grade === "UNKNOWN") return `${name}: hareket olabilir, okunamadı.`;
  if (id === "jitem") return "Kendi hattın. Kapasite ve inkâr dili sende.";
  return `${name}: hareketlilik. İç plan görünmüyor.`;
}

export function factionSignals(state: GameState): IntelSignal[] {
  const out: IntelSignal[] = [];
  for (const def of FACTION_DEFS) {
    if (!factionVisible(state, def.id)) continue;
    const mind = state.factions[def.id];
    const lastAct = mind?.lastAct ?? "";
    const grade = gradeFor(state, def.id, lastAct);
    out.push({
      faction: def.id,
      name: def.name,
      grade,
      headline: headlineFor(def.id, def.name, lastAct, grade),
    });
  }
  return out;
}

export function intelGradeLabel(g: IntelGrade) {
  if (g === "KNOWN") return "BİLİNEN";
  if (g === "SUSPECTED") return "ŞÜPHE";
  if (g === "RUMOR") return "SÖYLENTİ";
  return "BİLİNMEYEN";
}
