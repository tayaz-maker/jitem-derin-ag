import { EVENT_CHOICES, EVENTS } from "../data.ts";
import type {
  EventChoice,
  EventDef,
  Faction,
  GameState,
  KnowledgeStatus,
  StatKey,
} from "../types.ts";
import { actOf } from "./acts.ts";
import { edgeSignal } from "./edges.ts";
import { addDocument } from "./investigation.ts";
import { entry, setFactionKnow, setHand } from "./knowledge.ts";
import { hasMemory } from "./memory.ts";
import { mulberry32, pickWeighted } from "./rng.ts";
import { applyMany } from "./stats.ts";
import { encodeNote } from "../i18n/format.ts";

export interface EventView extends EventDef {
  variantId: string;
  addendum?: string;
  choices: EventChoice[];
}

export interface VariantConsequence {
  note?: string;
  effects?: Partial<Record<StatKey, number>>;
  tags?: string[];
  documents?: string[];
  suppress?: string[];
  reveal?: string[];
  hand?: Array<{ claimId: string; status: KnowledgeStatus; confidence?: number; source?: string }>;
  factionKnow?: Array<{
    fac: Faction;
    claimId: string;
    status: KnowledgeStatus;
    confidence?: number;
  }>;
}

export interface FamilyVariant {
  id: string;
  weight: number;
  when?: (s: GameState) => boolean;
  addendum?: string;
  title?: string;
  body?: string;
  extraTags?: string[];
  choiceMutate?: (c: EventChoice[], s: GameState) => EventChoice[];
  consequence?: VariantConsequence;
}

export interface EventFamily {
  id: string;
  act: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  turnWindow: [number, number];
  historicalAnchor?: boolean;
  exclusivity?: string;
  cooldown?: number;
  prerequisites?: (s: GameState) => boolean;
  requiredKnowledge?: string[];
  factionState?: (s: GameState) => boolean;
  actorState?: (s: GameState) => boolean;
  relationshipState?: (s: GameState) => boolean;
  playerHistory?: (s: GameState) => boolean;
  triggers: (s: GameState) => boolean;
  variants: FamilyVariant[];
  followUps?: string[];
  choiceMutate?: (c: EventChoice[], s: GameState) => EventChoice[];
}

function has(s: GameState, tag: string) {
  return s.tags.includes(tag);
}

export function familyEligible(f: EventFamily, s: GameState, side: boolean) {
  if (s.turn < f.turnWindow[0] || s.turn > f.turnWindow[1]) return false;
  if (side && f.historicalAnchor) return false;
  if (f.act > actOf(s.turn) + 1) return false;
  if (f.exclusivity && s.tags.includes(`ex:${f.exclusivity}`)) return false;
  if (side) {
    if (f.cooldown) {
      const last = [...s.replay].reverse().find((r) => r.familyId === f.id);
      if (last && s.turn - last.turn < f.cooldown) return false;
    } else if (s.tags.includes(`side:${f.id}`)) return false;
  }
  if (!f.triggers(s)) return false;
  if (f.prerequisites && !f.prerequisites(s)) return false;
  if (f.requiredKnowledge && !f.requiredKnowledge.every((k) => s.hand[k] && s.hand[k].status !== "UNKNOWN")) {
    return false;
  }
  if (f.factionState && !f.factionState(s)) return false;
  if (f.actorState && !f.actorState(s)) return false;
  if (f.relationshipState && !f.relationshipState(s)) return false;
  if (f.playerHistory && !f.playerHistory(s)) return false;
  return true;
}

function liveSig(s: GameState, id: string) {
  const live = s.edgeLive[id];
  return live ? edgeSignal(live) : "stable";
}

// Hints below are semantic keys ("mutHint.<choiceId>"), not authored prose:
// the mutated hint must resolve per the player's current locale like any
// other runtime-generated text (see i18n/format.ts's encodeNote/parseNote
// pattern used for notes). EventModal resolves and prioritizes this key
// over the choice's static base hint, since it reflects what actually
// changed because of the player's past decision with this actor.
function mutateCommand(choices: EventChoice[], s: GameState): EventChoice[] {
  return choices.map((ch) => {
    if (ch.id === "e4-saha" && hasMemory(s, "ersever", "protected")) {
      return { ...ch, hint: "mutHint.e4-saha", effects: { ...ch.effects, sadakat: 4, giz: 2 } };
    }
    if (ch.id === "e4-uy" && (hasMemory(s, "ersever", "spent") || hasMemory(s, "ersever", "abandoned") || hasMemory(s, "ersever", "promise-broken"))) {
      return { ...ch, hint: "mutHint.e4-uy", effects: { ...ch.effects, sadakat: -5, giz: -3 } };
    }
    return ch;
  });
}

function mutateTapes(choices: EventChoice[], s: GameState): EventChoice[] {
  return choices.map((ch) => {
    if (ch.id === "e6-bas" && hasMemory(s, "ersever", "promise-kept") && !hasMemory(s, "ersever", "promise-broken")) {
      return { ...ch, hint: "mutHint.e6-bas", effects: { ...ch.effects, giz: 8, sadakat: 2 } };
    }
    if (ch.id === "e6-not" && (hasMemory(s, "ersever", "spent") || hasMemory(s, "ersever", "promise-broken"))) {
      return { ...ch, hint: "mutHint.e6-not", effects: { ...ch.effects, kamuoyu: 4, giz: -10 } };
    }
    return ch;
  });
}

function mutateCatli(choices: EventChoice[], s: GameState): EventChoice[] {
  const sig = liveSig(s, "catli-emniyet");
  const hot = sig === "hot" || sig === "fragile" || sig === "pressure";
  return choices.map((ch) => {
    if (ch.id === "e8-sogut" && hot) {
      return { ...ch, hint: "mutHint.e8-sogut", effects: { ...ch.effects, giz: 5, kara: -2 } };
    }
    if (ch.id === "e8-fayda" && hasMemory(s, "catli", "used")) {
      return { ...ch, effects: { ...ch.effects, giz: -8, kara: 10 } };
    }
    return ch;
  });
}

function mutateSusurluk(choices: EventChoice[], s: GameState): EventChoice[] {
  const publicHeat = s.investigation.stage === "public" || s.investigation.stage === "response";
  const chained = (s.investigation.chain?.length ?? 0) >= 2;
  return choices.map((ch) => {
    if (ch.id === "e10-inkar" && publicHeat) {
      return { ...ch, hint: "mutHint.e10-inkar", effects: { giz: 3, etki: -8, kamuoyu: 3 } };
    }
    if (ch.id === "e10-parca" && chained) {
      return { ...ch, hint: "mutHint.e10-parca", effects: { ...ch.effects, hukuk: 4 } };
    }
    return ch;
  });
}

export const FAMILIES: EventFamily[] = [
  {
    id: "fam_formation",
    act: 1,
    turnWindow: [1, 1],
    historicalAnchor: true,
    triggers: () => true,
    variants: [
      { id: "base", weight: 3 },
      { id: "idari", weight: 2, when: (s) => s.hat === "idari", addendum: "OYUNSAL REKONSTRÜKSİYON: İdari masa doğuşu dosya ve inkâr dilinden görür." },
      { id: "saha", weight: 2, when: (s) => s.hat === "saha", addendum: "OYUNSAL REKONSTRÜKSİYON: Saha hattı fiilî timden bakar. Resmi dil uzaktır." },
    ],
  },
  {
    id: "fam_denial",
    act: 1,
    turnWindow: [1, 2],
    exclusivity: "denial",
    triggers: (s) => s.stats.giz >= 60,
    factionState: (s) => s.factions.jitem.knowledgeBase.clm_official_denial?.status === "TRUE",
    variants: [
      {
        id: "quiet",
        weight: 2,
        addendum: "OYUNSAL REKONSTRÜKSİYON: İnkâr dili henüz tutuyor. Kimse tek kare görmüyor.",
        consequence: { note: "Resmi dil: yapı yoktur. Basın JİTEM’i bilmiyor.", effects: { giz: 2 }, factionKnow: [{ fac: "media", claimId: "clm_jitem_exists", status: "UNKNOWN", confidence: 8 }] },
      },
    ],
    followUps: ["fam_media_probe"],
  },
  {
    id: "fam_informants",
    act: 2,
    turnWindow: [2, 2],
    historicalAnchor: true,
    triggers: () => true,
    actorState: () => true,
    variants: [
      { id: "base", weight: 3 },
      { id: "heat", weight: 3, when: (s) => (s.nodeHeat.aygan ?? 0) >= 1, addendum: "OYUNSAL REKONSTRÜKSİYON: İtirafçı katmanı zaten ısındı. Konuşma yüzeyi geniş." },
      { id: "protected", weight: 2, when: (s) => hasMemory(s, "aygan", "protected"), addendum: "OYUNSAL REKONSTRÜKSİYON: İtirafçı korundu. Konuşma ihtimali düşük." },
    ],
  },
  {
    id: "fam_yesil_arrives",
    act: 2,
    turnWindow: [2, 3],
    exclusivity: "yesil-in",
    triggers: (s) => s.revealed.yesil || s.stats.bilgi >= 20,
    variants: [
      { id: "tool", weight: 2, addendum: "KAYNAK İDDİASI: Yeşil operatif olarak durur. Kendi başına karar verici değil.", consequence: { note: "Yeşil hattı gölgede duruyor. Emir boşluğu durur.", hand: [{ claimId: "clm_yesil_ersever", status: "RUMOR", confidence: 30, source: "saha fısıltı" }] } },
      { id: "spent", weight: 2, when: (s) => hasMemory(s, "yesil", "spent"), addendum: "OYUNSAL REKONSTRÜKSİYON: Yeşil harcandı. Isı yükselir, emir hâlâ TARTIŞMALI.", consequence: { note: "Harcana operatif ısı yaydı. Fail iddiası söylenti olarak dolaşıyor.", effects: { giz: -4, kamuoyu: 3 } } },
    ],
  },
  {
    id: "fam_southeast",
    act: 2,
    turnWindow: [2, 4],
    triggers: (s) => s.stats.saha >= 40,
    variants: [
      { id: "pressure", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: Güneydoğu koridoru kapasite istiyor. Freelance riski.", consequence: { note: "Koridor kapasite istiyor. Masa emretmezse saha kendi işini yapar.", effects: { saha: 2, giz: -2 } } },
      { id: "thin", weight: 2, when: (s) => s.stats.saha < 36, addendum: "OYUNSAL REKONSTRÜKSİYON: Koridor aç. Kapasite yoksa iz büyür.", consequence: { note: "Koridor aç, kapasite ince. Freelance iz.", effects: { giz: -4, saha: -2 } } },
    ],
  },
  {
    id: "fam_mit_split",
    act: 3,
    turnWindow: [3, 3],
    historicalAnchor: true,
    triggers: () => true,
    variants: [
      { id: "base", weight: 3 },
      { id: "distant", weight: 3, when: (s) => s.flags.mitCooledUntil >= s.turn, addendum: "OYUNSAL REKONSTRÜKSİYON: MİT hattı soğuk. Uyarı gecikir." },
      { id: "false", weight: 2, when: (s) => s.factions.mit?.knowledgeBase.clm_abas_jitem?.status === "RUMOR", addendum: "OYUNSAL REKONSTRÜKSİYON: MİT yanlış bağa inanıyor. Karar asimetrik." },
    ],
  },
  {
    id: "fam_eymur_memo",
    act: 3,
    turnWindow: [3, 5],
    exclusivity: "eymur",
    triggers: (s) => s.turn >= 3 && s.flags.mitCooledUntil < s.turn,
    factionState: (s) => s.factions.mit.hostility >= 14,
    variants: [
      { id: "memo", weight: 2, addendum: "KAYNAK İDDİASI: Eymür tipi uyarı. JİTEM emri değil.", consequence: { note: "MİT içi not dolaştı. JİTEM’in emri değil.", effects: { bilgi: 3, giz: -2 }, hand: [{ claimId: "clm_eymur_abas_split", status: "PARTIAL", confidence: 55, source: "memo" }] } },
      { id: "files", weight: 2, when: (s) => s.flags.lastReportTurn > 0, addendum: "OYUNSAL REKONSTRÜKSİYON: Masada zaten rapor var. Uyarı dolu dosyaya düşer.", consequence: { note: "Uyarı dolu dosyaya düştü. Asimetri daraldı.", effects: { bilgi: 5, giz: -4 }, documents: ["eymur-memo"] } },
    ],
  },
  {
    id: "fam_command_shift",
    act: 3,
    turnWindow: [4, 4],
    historicalAnchor: true,
    triggers: () => true,
    choiceMutate: mutateCommand,
    variants: [
      { id: "base", weight: 3 },
      { id: "saha-split", weight: 3, when: (s) => s.hat === "saha", addendum: "OYUNSAL REKONSTRÜKSİYON: Saha hattı devri kendi bedeniyle yaşar." },
      { id: "ersever-held", weight: 2, when: (s) => hasMemory(s, "ersever", "protected"), addendum: "OYUNSAL REKONSTRÜKSİYON: Ersever korundu. Kopuş kişisel değil, kurumsal." },
      {
        id: "edge-pressure",
        weight: 2,
        when: (s) => {
          const sig = liveSig(s, "ersever-jitem");
          return sig === "pressure" || sig === "hot" || sig === "fragile";
        },
        addendum: "OYUNSAL REKONSTRÜKSİYON: Ersever hattı zaten gerilimde. Devir, bağın üstüne biner; takvim durmaz.",
        consequence: { note: "Komuta kayması gerilimli bağın üstüne bindi. Çıpa durur; saha ısınır.", effects: { giz: -2, sadakat: -2 } },
      },
    ],
  },
  {
    id: "fam_interservice",
    act: 3,
    turnWindow: [3, 5],
    triggers: (s) => s.factions.mit.hostility >= 20,
    factionState: (s) => s.factions.jitem.hostility >= 12,
    variants: [
      { id: "distance", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: Kurumlar mesafe koyuyor. Eşgüdüm yok.", consequence: { note: "MİT ve jandarma hattı birbirine soğuk. Eşgüdüm uydurulmadı.", effects: { etki: -2 } } },
    ],
  },
  {
    id: "fam_abas",
    act: 4,
    turnWindow: [5, 5],
    historicalAnchor: true,
    triggers: () => true,
    variants: [
      { id: "base", weight: 3 },
      { id: "mit-shock", weight: 2, when: (s) => s.factions.mit.confidence < 50, addendum: "OYUNSAL REKONSTRÜKSİYON: MİT profesyonel kanadı sarsıldı. JİTEM zafer saymamalı." },
    ],
  },
  {
    id: "fam_mumcu",
    act: 4,
    turnWindow: [6, 7],
    exclusivity: "1993-media",
    cooldown: 2,
    triggers: (s) => s.turn >= 6,
    variants: [
      { id: "anchor", weight: 3, addendum: "TARİHSEL ÇIPA: Mumcu suikastı BELGELİ. JİTEM bağ TARTIŞMALI.", consequence: { note: "Basın ısındı. Fail/emir boşluğu durur.", effects: { kamuoyu: 6, giz: -3 }, factionKnow: [{ fac: "media", claimId: "clm_mumcu_jitem", status: "RUMOR", confidence: 25 }] } },
      { id: "already-hot", weight: 2, when: (s) => s.stats.kamuoyu >= 28, addendum: "OYUNSAL REKONSTRÜKSİYON: Kamu zaten bakıyordu. Mumcu karesi üstüne bindi.", consequence: { note: "Kamu zaten sıcaktı. Mumcu karesi üstüne bindi; bağ uydurulmadı.", effects: { kamuoyu: 4, hukuk: 3, giz: -4 } } },
    ],
    followUps: ["fam_media_probe"],
  },
  {
    id: "fam_tapes",
    act: 4,
    turnWindow: [6, 6],
    historicalAnchor: true,
    triggers: () => true,
    followUps: ["fam_mumcu"],
    choiceMutate: mutateTapes,
    variants: [
      { id: "base", weight: 3 },
      { id: "files-ready", weight: 3, when: (s) => s.flags.lastReportTurn > 0, addendum: "OYUNSAL REKONSTRÜKSİYON: Kaset boşluğa değil dolu dosyaya düşer.", consequence: { note: "Kaset dolu dosyaya düştü. Asimetri daraldı.", effects: { bilgi: 3 }, documents: ["kaset-not"] } },
      { id: "spent-talk", weight: 3, when: (s) => hasMemory(s, "ersever", "spent") || hasMemory(s, "ersever", "abandoned"), addendum: "OYUNSAL REKONSTRÜKSİYON: Harcanan hat konuştu. Sadakat çatladı.", consequence: { note: "Harcanan hat konuşmayı sertleştirdi. Çıpa durur; hasar büyür.", effects: { sadakat: -4, kamuoyu: 3 } } },
      { id: "protected-soft", weight: 2, when: (s) => hasMemory(s, "ersever", "protected"), addendum: "OYUNSAL REKONSTRÜKSİYON: Korunan hat yine konuştu — çıpa durur; hasar kesilir.", consequence: { note: "Korunan hat konuştu. Çıpa durur; giz hasarı kısmen kesilir.", effects: { giz: 4, sadakat: 2 } } },
      {
        id: "broken-word",
        weight: 3,
        when: (s) => hasMemory(s, "ersever", "promise-broken"),
        addendum: "OYUNSAL REKONSTRÜKSİYON: Bozulan söz kaseti sertleştirdi. Konuşma durmaz.",
        consequence: { note: "Söz bozulmuştu. Kaset aynı çıpa; hasar büyüdü.", effects: { sadakat: -5, kamuoyu: 4, giz: -3 } },
      },
    ],
  },
  {
    id: "fam_ersever_death",
    act: 4,
    turnWindow: [7, 7],
    historicalAnchor: true,
    triggers: () => true,
    variants: [
      { id: "base", weight: 3 },
      { id: "yesil-heat", weight: 2, when: (s) => s.flags.yesilUsed, addendum: "KAYNAK İDDİASI: Yeşil fail GÜÇLÜ. Emir TARTIŞMALI bırakılır.", consequence: { note: "Yeşil harcandı. Fail iddiası ısındı; emir boşluğu durur.", effects: { kamuoyu: 3, giz: -2 }, hand: [{ claimId: "clm_yesil_ersever", status: "PARTIAL", confidence: 58, source: "saha ısı" }] } },
      { id: "protected-loss", weight: 2, when: (s) => hasMemory(s, "ersever", "protected"), addendum: "OYUNSAL REKONSTRÜKSİYON: Korunan hat yine düştü. Çıpa durur; kin farklı yerde.", consequence: { note: "Korunan hat düştü. Sadakat sarsıldı, konuşma zaten olmuştu.", effects: { sadakat: -3 } } },
    ],
  },
  {
    id: "fam_informant_leak",
    act: 4,
    turnWindow: [6, 8],
    exclusivity: "aygan-talk",
    triggers: (s) => hasMemory(s, "aygan", "spent") || (s.nodeHeat.aygan ?? 0) >= 2,
    actorState: (s) => hasMemory(s, "aygan", "spent") || hasMemory(s, "aygan", "used"),
    variants: [
      { id: "talk", weight: 3, addendum: "OYUNSAL REKONSTRÜKSİYON: İtirafçı konuşma eşiği. Tanıklık bilgi patlatır.", consequence: { note: "İtirafçı katmanı konuşma eşiğine geldi. Tanıklık bilgi açar, giz yakar.", effects: { bilgi: 8, giz: -7, kamuoyu: 4 }, documents: ["aygan-taniklik"], hand: [{ claimId: "clm_informant_layer", status: "TRUE", confidence: 70, source: "tanık" }] } },
      {
        id: "held-quiet",
        weight: 4,
        when: (s) => hasMemory(s, "aygan", "protected") && hasMemory(s, "aygan", "promise-kept") && !hasMemory(s, "aygan", "promise-broken"),
        addendum: "OYUNSAL REKONSTRÜKSİYON: Korunan ve sözü tutulan tanık tutuldu. Konuşma ertelendi.",
        consequence: { note: "Tanık korundu. Konuşma ertelendi; ısı durdu, dosya durmadı.", effects: { giz: 4, sadakat: 3, hukuk: -1 } },
      },
    ],
    followUps: ["fam_investigate_branch"],
  },
  {
    id: "fam_protect_payoff",
    act: 4,
    turnWindow: [5, 8],
    exclusivity: "protect-pay",
    triggers: (s) => hasMemory(s, "ersever", "protected") || hasMemory(s, "eymur", "protected"),
    playerHistory: (s) => hasMemory(s, "ersever", "protected") || hasMemory(s, "eymur", "protected"),
    variants: [
      { id: "help", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: Korunan hat sessiz yardım etti. Sadakat döndü.", consequence: { note: "Korunan hat sessiz yardım etti. Sadakat döndü, konuşma ihtimali düştü.", effects: { sadakat: 6, giz: 3 } } },
    ],
  },
  {
    id: "fam_catli_rise",
    act: 5,
    turnWindow: [8, 8],
    historicalAnchor: true,
    triggers: () => true,
    choiceMutate: mutateCatli,
    variants: [
      { id: "base", weight: 3 },
      { id: "logistics", weight: 2, when: (s) => s.stats.kara >= 55, addendum: "OYUNSAL REKONSTRÜKSİYON: Örtülü kaynak bol. Çatlı hattı fayda olarak ısınır." },
      { id: "cooled", weight: 2, when: (s) => s.flags.emniyetCooledUntil >= s.turn, addendum: "OYUNSAL REKONSTRÜKSİYON: Emniyet soğutulmuştu. Isınma yavaş; takvim durmaz." },
      {
        id: "fragile-web",
        weight: 3,
        when: (s) => {
          const sig = liveSig(s, "catli-emniyet");
          return sig === "fragile" || sig === "hot";
        },
        addendum: "OYUNSAL REKONSTRÜKSİYON: Çatlı–Emniyet bağı kırılgan. Kesişim ısınır; JİTEM uzantısı uydurulmaz.",
        consequence: { note: "Kırılgan kesişim ısındı. Takvim durmaz; bağ JİTEM emri değildir.", effects: { giz: -3, kara: 2 } },
      },
    ],
  },
  {
    id: "fam_emniyet_warm",
    act: 5,
    turnWindow: [8, 9],
    exclusivity: "emniyet-warm",
    triggers: (s) => s.revealed.catli,
    factionState: (s) => s.factions.emniyet.resources >= 30,
    variants: [
      { id: "warm", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: Emniyet–yeraltı kendi çıkarını güder. JİTEM uzantısı değil.", consequence: { note: "Emniyet hattı kendi kesişimini ısıtıyor. JİTEM uzantısı değil.", effects: { giz: -3, kara: 2 }, reveal: ["sahin"] } },
      {
        id: "pressure",
        weight: 3,
        when: (s) => {
          const sig = liveSig(s, "catli-emniyet");
          return sig === "pressure" || sig === "hot";
        },
        addendum: "OYUNSAL REKONSTRÜKSİYON: Baskılı kesişim kendi ısısını büyütüyor. Emir yok.",
        consequence: { note: "Baskılı kesişim büyüdü. Masa emretmedi.", effects: { giz: -4, kamuoyu: 2 } },
      },
    ],
  },
  {
    id: "fam_media_probe",
    act: 5,
    turnWindow: [4, 9],
    exclusivity: "media",
    cooldown: 2,
    triggers: (s) => s.stats.kamuoyu >= 32 && s.stats.giz < 52,
    factionState: (s) => s.factions.media.knowledgeBase.clm_jitem_exists?.status !== "TRUE",
    variants: [
      { id: "wrong", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: Basın bakıyor. Bildikleri tam değil — yanlış da olabilir.", consequence: { note: "Basın bakıyor. Söylenti yazıldı; teyit yok.", effects: { kamuoyu: 4, giz: -2 }, factionKnow: [{ fac: "media", claimId: "clm_jitem_exists", status: "RUMOR", confidence: 28 }] } },
      { id: "true", weight: 1, when: (s) => s.factions.media.knowledgeBase.clm_jitem_exists?.status === "TRUE", addendum: "OYUNSAL REKONSTRÜKSİYON: Basın JİTEM’i teyit etti sanıyor. Kamu ısınır.", consequence: { note: "Basın teyit sandı. Kamu ısındı.", effects: { kamuoyu: 8, hukuk: 4, giz: -6 } } },
      {
        id: "held-file",
        weight: 3,
        when: (s) => s.tags.some((tag) => tag.startsWith("src-held")),
        addendum: "OYUNSAL REKONSTRÜKSİYON: Karşılaştırma tutuldu. Basın sisli kaldı.",
        consequence: { note: "Karşılaştırma tutuldu. Basın teyit yazmadı.", effects: { giz: 2, kamuoyu: -1 } },
      },
      {
        id: "published",
        weight: 3,
        when: (s) => s.tags.some((tag) => tag.startsWith("src-published")),
        addendum: "OYUNSAL REKONSTRÜKSİYON: Yayımlanan karşılaştırma kamu ısısını büyüttü. Tek doğru kilitlenmedi.",
        consequence: { note: "Yayımlanan karşılaştırma kamu ısısını büyüttü. Kilitleme yok.", effects: { kamuoyu: 6, giz: -4, hukuk: 2 } },
      },
    ],
  },
  {
    id: "fam_prosecutor",
    act: 5,
    turnWindow: [6, 10],
    exclusivity: "hukuk",
    triggers: (s) => s.investigation.stage !== "dormant",
    variants: [
      { id: "open", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: Hukuk yüzeyi ısındı. Yönlendirilebilir; durmak zorunda değilsin.", consequence: { note: "Hukuk yüzeyi ısındı. Soruşturma tek event değil; kendi hattı var.", effects: { hukuk: 4 } } },
      { id: "directed", weight: 2, when: (s) => s.tags.includes("inv-direct") || s.decisions.some((d) => d.id === "soru_yonlendir"), addendum: "OYUNSAL REKONSTRÜKSİYON: Masa soruşturmayı sapıttı. Dosya durmadı, kaydı.", consequence: { note: "Soruşturma senin dosyana kaydı. Kontrol değil.", effects: { hukuk: 2, etki: -2 } } },
    ],
  },
  {
    id: "fam_agar_shield",
    act: 6,
    turnWindow: [8, 10],
    exclusivity: "agar",
    triggers: (s) => s.revealed.agar,
    actorState: (s) => Boolean(s.revealed.agar),
    variants: [
      { id: "shield", weight: 2, addendum: "KAYNAK İDDİASI: Siyasi kalkan. Emir uydurulmaz.", consequence: { note: "Siyasi kalkan duruyor. Emir yok; örtü var.", effects: { etki: 3 } } },
      { id: "drop", weight: 2, when: (s) => s.stats.etki < 22, addendum: "OYUNSAL REKONSTRÜKSİYON: Kalkan inceldi. Siyaset mesafeye çekiliyor.", consequence: { note: "Siyaset mesafe koyuyor. Kalkan inceldi.", effects: { etki: -4, kamuoyu: 3 } } },
    ],
  },
  {
    id: "fam_intersection",
    act: 6,
    turnWindow: [9, 9],
    historicalAnchor: true,
    triggers: () => true,
    variants: [
      { id: "base", weight: 3 },
      { id: "cooled-web", weight: 3, when: (s) => has(s, "catli-cooled"), addendum: "OYUNSAL REKONSTRÜKSİYON: Kesişim soğutulmuştu. Kaza takvimi durmaz." },
    ],
  },
  {
    id: "fam_bucak",
    act: 6,
    turnWindow: [9, 9],
    triggers: () => true,
    variants: [
      { id: "corridor", weight: 2, addendum: "TARİHSEL ÇIPA’ya giden siyasi koridor. BELGELİ kilit yarın.", consequence: { note: "Siyasi koridor aynı kareye yaklaşıyor. Kaza takvimi durmaz.", effects: { etki: -1 } } },
    ],
  },
  {
    id: "fam_loyalty_crack",
    act: 6,
    turnWindow: [3, 9],
    exclusivity: "sadakat",
    cooldown: 2,
    triggers: (s) => s.stats.sadakat < 30,
    variants: [
      { id: "crack", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: Sadakat çatladı. Saha freelance kayıyor.", consequence: { note: "Sadakat çatladı. Saha freelance kayıyor.", effects: { saha: -3, giz: -3 } } },
      { id: "spent-crack", weight: 3, when: (s) => Object.values(s.actorMemory).some((t) => t.includes("spent")), addendum: "OYUNSAL REKONSTRÜKSİYON: Harcanan bellek çatlağı büyüttü.", consequence: { note: "Harcanan bellek çatlağı büyüttü. Freelance + konuşma ısısı.", effects: { saha: -2, giz: -5, sadakat: -3 } } },
      {
        id: "broken",
        weight: 3,
        when: (s) => Object.values(s.actorMemory).some((t) => t.includes("promise-broken")),
        addendum: "OYUNSAL REKONSTRÜKSİYON: Bozulan söz çatlağı büyüttü. Konuşma eşiği yaklaşır.",
        consequence: { note: "Bozulan söz çatlağı büyüttü. Sadakat inceldi.", effects: { sadakat: -4, giz: -3 } },
      },
    ],
  },
  {
    id: "fam_document_chain",
    act: 6,
    turnWindow: [7, 10],
    exclusivity: "docs",
    triggers: (s) => s.investigation.documents.length >= 1,
    variants: [
      { id: "chain", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: Belge zinciri uzadı. Bastırılanlar karanlıkta kaldı.", consequence: { note: "Belge zinciri uzadı. Açılanlar kamuoyuna, bastırılanlar karanlığa.", effects: { hukuk: 3, bilgi: 2 } } },
      { id: "suppressed", weight: 2, when: (s) => s.investigation.suppressed.length >= 1, addendum: "OYUNSAL REKONSTRÜKSİYON: Bastırılan belge karanlıkta. Zincir kopuk.", consequence: { note: "Bastırılanlar karanlıkta kaldı. Hukuk eksik bakıyor.", effects: { hukuk: -2, giz: 2 } } },
    ],
  },
  {
    id: "fam_wrong_intel",
    act: 6,
    turnWindow: [5, 9],
    exclusivity: "wrong",
    triggers: (s) => Object.values(s.factions).some((f) => Object.values(f.knowledgeBase).some((k) => k.status === "FALSE" || k.status === "RUMOR")),
    variants: [
      { id: "false", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: Bir taraf yanlış bilgiye dayanarak hareket ediyor.", consequence: { note: "Yanlış bilgiye dayalı hamle. Dünya gerçeği bunu kilitlemez.", effects: { etki: -2, giz: -2 } } },
    ],
  },
  {
    id: "fam_faction_rivalry",
    act: 6,
    turnWindow: [4, 9],
    exclusivity: "rival",
    triggers: (s) => s.factions.mit.hostility >= 28 && s.factions.emniyet.hostility >= 20,
    factionState: (s) => s.factions.mit.hostility >= 24 && s.factions.emniyet.hostility >= 18,
    variants: [
      { id: "clash", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: MİT ve Emniyet birbirini oyuncudan bağımsız dürtüyor.", consequence: { note: "MİT ve Emniyet birbirini dürttü. Masa emretmedi.", effects: { giz: -3, etki: -2 } } },
    ],
  },
  {
    id: "fam_susurluk",
    act: 7,
    turnWindow: [10, 10],
    historicalAnchor: true,
    triggers: () => true,
    choiceMutate: mutateSusurluk,
    variants: [
      { id: "base", weight: 3 },
      { id: "contained", weight: 2, when: (s) => s.stats.giz >= 32, addendum: "OYUNSAL REKONSTRÜKSİYON: Görünürlük şoku var; masa kareyi dar tutmaya çalışıyor.", consequence: { note: "Kaza belgelendi. Masa kareyi dar tutuyor; kamu yine bakıyor.", effects: { giz: 3 } } },
      { id: "blown", weight: 2, when: (s) => s.stats.giz < 22 || s.investigation.stage === "public", addendum: "OYUNSAL REKONSTRÜKSİYON: Kamu zaten bakıyordu. Kaza tek kareyi kilitledi.", consequence: { note: "Kamu zaten bakıyordu. Kaza kilitledi; soruşturma kamu eşiğine yürüdü.", effects: { kamuoyu: 4, hukuk: 3 }, tags: ["inv-expose"] } },
      {
        id: "file-ready",
        weight: 3,
        when: (s) => (s.investigation.chain?.length ?? 0) >= 2 || (s.investigation.comparisons?.length ?? 0) >= 1,
        addendum: "OYUNSAL REKONSTRÜKSİYON: Kaza, eldeki zincir/karşılaştırmanın üstüne düştü. Emir uydurulmadı.",
        consequence: { note: "Kaza belgelendi. Eldeki dosya kareyi ısıttı; emir üretilmedi.", effects: { hukuk: 4, kamuoyu: 2 } },
      },
    ],
  },
  {
    id: "fam_commission",
    act: 7,
    turnWindow: [10, 10],
    triggers: () => true,
    variants: [
      { id: "tbmm", weight: 2, addendum: "TARİHSEL ÇIPA: TBMM. Parçalı itiraf. Tek doğru komplo yok.", consequence: { note: "Meclis yüzeyi açıldı. Parçalı itiraf, tek çözüm yok.", effects: { hukuk: 6, kamuoyu: 4 }, documents: ["tbmm-tutanak"] } },
    ],
  },
  {
    id: "fam_silence_bargain",
    act: 4,
    turnWindow: [4, 7],
    exclusivity: "bargain",
    triggers: (s) => hasMemory(s, "eymur", "used") || hasMemory(s, "veli", "used"),
    playerHistory: (s) => hasMemory(s, "eymur", "used") || hasMemory(s, "veli", "used"),
    variants: [
      { id: "bargain", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: Kullanılan hat sessizlik pazarlığı açtı.", consequence: { note: "Kullanılan hat sessizlik istedi. Pazarlık: bilgi ya da mesafe.", effects: { sadakat: -4, bilgi: 3 } } },
    ],
  },
  {
    id: "fam_spent_revenge",
    act: 4,
    turnWindow: [6, 9],
    exclusivity: "revenge",
    triggers: (s) => Object.values(s.actorMemory).some((t) => t.includes("spent")),
    actorState: (s) => Object.values(s.actorMemory).some((t) => t.includes("spent")),
    variants: [
      { id: "rev", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: Harcanan bellek konuşma veya kopuş üretir.", consequence: { note: "Harcanan bellek öfke taşıyor. Konuşma veya kopuş.", effects: { giz: -5, sadakat: -4, kamuoyu: 3 } } },
    ],
  },
  {
    id: "fam_investigate_branch",
    act: 5,
    turnWindow: [6, 10],
    exclusivity: "inv-branch",
    triggers: (s) => s.investigation.stage === "investigation" || s.investigation.stage === "inquiry",
    variants: [
      { id: "branch", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: Soruşturma dallanıyor. Kontrol, yönlendirme, tasfiye — seçenek açık.", consequence: { note: "Soruşturma dallandı. Tamamen durdurmak zorunda değilsin.", effects: { hukuk: 3 } } },
    ],
  },
  {
    id: "fam_bitlis",
    act: 4,
    turnWindow: [5, 7],
    exclusivity: "bitlis",
    triggers: (s) => s.turn >= 5 && s.stats.bilgi >= 28,
    variants: [
      { id: "record", weight: 2, addendum: "TARİHSEL ÇIPA: Bitlis uçak kazası BELGELİ. Sabotaj TARTIŞMALI. JİTEM bağ üretilmez.", consequence: { note: "Jandarma üstü düştü. Neden TARTIŞMALI bırakıldı.", effects: { etki: -2, bilgi: 3 }, hand: [{ claimId: "clm_bitlis_sabotaj", status: "RUMOR", confidence: 25, source: "basın" }] } },
    ],
  },
  {
    id: "fam_promise_payoff",
    act: 4,
    turnWindow: [5, 8],
    exclusivity: "promise",
    triggers: (s) => hasMemory(s, "ersever", "promise-kept") || hasMemory(s, "aygan", "promise-kept"),
    playerHistory: (s) => hasMemory(s, "ersever", "promise-kept") || hasMemory(s, "aygan", "promise-kept"),
    variants: [
      { id: "kept", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: Sözü tutulan hat bir tur daha sessiz kaldı.", consequence: { note: "Söz tutuldu. Konuşma gecikti — çıpa durmaz ama hasar kesilir.", effects: { sadakat: 5, giz: 4 } } },
    ],
  },
  {
    id: "fam_abandoned_freelance",
    act: 4,
    turnWindow: [4, 8],
    exclusivity: "freelance",
    triggers: (s) => hasMemory(s, "ersever", "abandoned") || s.stats.sadakat < 28,
    actorState: (s) => hasMemory(s, "ersever", "abandoned") || hasMemory(s, "aygan", "abandoned"),
    variants: [
      { id: "free", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: Yalnız bırakılan hat kendi işini yaptı.", consequence: { note: "Yalnız bırakılan hat freelance yürüdü. Masa emretmedi.", effects: { saha: 3, giz: -5, sadakat: -3 } } },
    ],
  },
  {
    id: "fam_political_distance",
    act: 6,
    turnWindow: [8, 10],
    exclusivity: "politik",
    triggers: (s) => s.stats.kamuoyu >= 40 && s.stats.etki < 28,
    factionState: (s) => s.factions.siyaset.confidence < 48,
    variants: [
      { id: "stepback", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: Siyaset kamu ısısından çekiliyor.", consequence: { note: "Siyaset mesafe. Kalkan inceldi, kamu önde.", effects: { etki: -5, kamuoyu: 3 } } },
    ],
  },
  {
    id: "fam_askeri_mesafe",
    act: 5,
    turnWindow: [5, 9],
    exclusivity: "askeri",
    triggers: (s) => s.stats.giz < 40 && s.flags.abasDead,
    factionState: (s) => s.factions.askeri.confidence <= 55,
    variants: [
      { id: "dist", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: Askerî bürokrasi saha detayından uzak duruyor.", consequence: { note: "Askerî bürokrasi mesafe koydu. Resmi dil kalınlaştı.", effects: { giz: 3, saha: -2, etki: 2 } } },
    ],
  },
  {
    id: "fam_witness_protect",
    act: 5,
    turnWindow: [6, 9],
    exclusivity: "witness",
    triggers: (s) => hasMemory(s, "aygan", "protected") && s.stats.bilgi >= 30,
    actorState: (s) => hasMemory(s, "aygan", "protected"),
    variants: [
      { id: "hold", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: Korunan tanık tutuldu. Konuşma ertelendi.", consequence: { note: "Tanık korundu. Konuşma ertelendi; soruşturma yavaşladı.", effects: { giz: 5, hukuk: -2, sadakat: 3 } } },
    ],
  },
  {
    id: "fam_network_purge",
    act: 6,
    turnWindow: [7, 10],
    exclusivity: "purge",
    triggers: (s) => Object.values(s.stance).filter((v) => v === "spend").length >= 2,
    playerHistory: (s) => Object.values(s.stance).filter((v) => v === "spend").length >= 2,
    variants: [
      { id: "purge", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: Masa kendi ağını tasfiye ediyor. Kapasite düşer, iz küçülür.", consequence: { note: "Kendi ağ tasfiyesi. Kapasite düştü, iz küçüldü, kin kaldı.", effects: { saha: -6, giz: 5, sadakat: -8, kamuoyu: 2 } } },
    ],
  },
  {
    id: "fam_false_flag_rumor",
    act: 5,
    turnWindow: [5, 8],
    exclusivity: "falseflag",
    triggers: (s) => s.factions.mit.knowledgeBase.clm_abas_jitem?.status === "RUMOR" && s.flags.abasDead,
    requiredKnowledge: [],
    factionState: (s) => s.factions.mit.knowledgeBase.clm_abas_jitem?.status === "RUMOR",
    variants: [
      { id: "rumor", weight: 2, addendum: "OYUNSAL REKONSTRÜKSİYON: MİT yanlış bağa (Abas–JİTEM) dayanarak soğuyor. Dünya gerçeği kilitlemez.", consequence: { note: "Yanlış bağ. MİT soğudu. Bu, JİTEM emri değildir.", effects: { etki: -3 }, factionKnow: [{ fac: "mit", claimId: "clm_abas_jitem", status: "RUMOR", confidence: 40 }] } },
    ],
  },
  {
    id: "fam_source_clash",
    act: 4,
    turnWindow: [3, 7],
    exclusivity: "src-clash",
    cooldown: 2,
    triggers: (s) => s.hat === "arastirmaci" && (s.investigation.comparisons?.length ?? 0) >= 1,
    playerHistory: (s) => (s.investigation.comparisons?.length ?? 0) >= 1,
    variants: [
      {
        id: "media-notice",
        weight: 2,
        addendum: "OYUNSAL REKONSTRÜKSİYON: Karşılaştırma sızdı. Basın iki kaynağı gördü; tek doğru yazmadı.",
        consequence: {
          note: "Karşılaştırma sızdı. Basın çelişkiyi duydu; kilitlemedi.",
          effects: { kamuoyu: 4, giz: -3, bilgi: 2 },
          factionKnow: [{ fac: "media", claimId: "clm_aygan_dogan_split", status: "PARTIAL", confidence: 42 }],
        },
      },
      {
        id: "denial-push",
        weight: 2,
        when: (s) => s.stats.etki >= 36,
        addendum: "OYUNSAL REKONSTRÜKSİYON: Resmi dil karşı anlatıyı ‘yok’ diye iter. Belge boşluğu durur.",
        consequence: {
          note: "Resmi dil karşı anlatıyı itti. İnkâr BELGELİ; saha tanıklığı ayrı durur.",
          effects: { giz: 3, kamuoyu: 2, hukuk: 1 },
          hand: [{ claimId: "clm_official_denial", status: "TRUE", confidence: 80, source: "resmi dil" }],
        },
      },
    ],
  },
  {
    id: "fam_chain_consequence",
    act: 5,
    turnWindow: [5, 9],
    exclusivity: "chain-heat",
    triggers: (s) => s.hat === "hukuk" && ((s.investigation.chain?.length ?? 0) >= 1 || s.investigation.documents.length >= 1),
    playerHistory: (s) => (s.investigation.chain?.length ?? 0) >= 1 || s.tags.includes("chain-link"),
    variants: [
      {
        id: "prosecutor-scent",
        weight: 2,
        addendum: "OYUNSAL REKONSTRÜKSİYON: Halka savcı masasına düştü. Yön var; emir yok.",
        consequence: {
          note: "Halka savcı masasına düştü. Soruşturma ısındı; emir üretilmedi.",
          effects: { hukuk: 4, giz: -2 },
          factionKnow: [{ fac: "hukuk", claimId: "clm_kutlu_vs_official", status: "PARTIAL", confidence: 50 }],
        },
      },
      {
        id: "compared-file",
        weight: 2,
        when: (s) => (s.investigation.chain?.length ?? 0) >= 2,
        addendum: "OYUNSAL REKONSTRÜKSİYON: Karşılaştırılmış kayıt zincire girdi. Standart yükseldi.",
        consequence: {
          note: "Karşılaştırılmış kayıt zincire girdi. Spekülasyon öne alınmadı.",
          effects: { hukuk: 5, bilgi: 2, giz: -3 },
          tags: ["inv-direct"],
        },
      },
    ],
  },
];

export function pickVariant(state: GameState, family: EventFamily): FamilyVariant {
  const variants = family.variants.filter((v) => !v.when || v.when(state));
  const pool = variants.length ? variants : family.variants;
  const rng = mulberry32((state.eventSeed ^ (state.turn * 1009) ^ family.id.length) >>> 0);
  return pickWeighted(rng, pool);
}

export function applyConsequence(state: GameState, c: VariantConsequence | undefined, notes: string[]): GameState {
  if (!c) return state;
  let next = state;
  if (c.note) notes.push(c.note);
  if (c.effects) next = applyMany(next, c.effects);
  if (c.tags) next = { ...next, tags: [...next.tags, ...c.tags] };
  if (c.reveal) {
    const revealed = { ...next.revealed };
    for (const id of c.reveal) revealed[id] = true;
    next = { ...next, revealed };
  }
  if (c.documents) {
    for (const d of c.documents) next = addDocument(next, d, false);
  }
  if (c.suppress) {
    for (const d of c.suppress) next = addDocument(next, d, true);
  }
  if (c.hand) {
    for (const h of c.hand) next = setHand(next, entry(h.claimId, h.status, h));
  }
  if (c.factionKnow) {
    for (const k of c.factionKnow) {
      next = setFactionKnow(next, k.fac, entry(k.claimId, k.status, { confidence: k.confidence }));
    }
  }
  return next;
}

export function applyFamilyFire(state: GameState, family: EventFamily, notes: string[]): GameState {
  const picked = pickVariant(state, family);
  const note = picked.consequence?.note ?? picked.addendum ?? `${family.id} · ${picked.id}`;
  const semanticNote = encodeNote("family.variant", {
    family: family.id,
    variant: picked.id,
    fallback: note,
  });
  let next = applyConsequence(state, picked.consequence, []);
  notes.push(semanticNote);
  const tags = next.tags.filter((t) => t !== `follow:${family.id}`).concat(`side:${family.id}`);
  if (family.exclusivity) tags.push(`ex:${family.exclusivity}`);
  if (picked.extraTags) tags.push(...picked.extraTags);
  if (family.followUps) {
    for (const id of family.followUps) {
      if (!tags.includes(`follow:${id}`)) tags.push(`follow:${id}`);
    }
  }
  next = { ...next, tags };
  next = {
    ...next,
    replay: [
      ...next.replay,
      { turn: next.turn, familyId: family.id, variantId: picked.id, factionActs: [], note: semanticNote },
    ],
  };
  return next;
}

export function selectAnchorFamily(state: GameState): EventFamily | undefined {
  const inWindow = FAMILIES.filter(
    (f) =>
      f.historicalAnchor &&
      state.turn >= f.turnWindow[0] &&
      state.turn <= f.turnWindow[1] &&
      f.triggers(state),
  );
  const exact = inWindow.find((f) => f.turnWindow[0] === f.turnWindow[1] && f.turnWindow[0] === state.turn);
  return (
    exact ??
    inWindow[0] ??
    FAMILIES.find(
      (f) => actOf(state.turn) === f.act && state.turn >= f.turnWindow[0] && state.turn <= f.turnWindow[1] && f.triggers(state),
    )
  );
}

export function viewEvent(state: GameState): EventView | null {
  const base = EVENTS.find((e) => e.turn === state.turn);
  if (!base) return null;
  const family = selectAnchorFamily(state);
  const choices = EVENT_CHOICES[state.turn] ?? [];
  if (!family) return { ...base, variantId: "base", choices };

  const picked = pickVariant(state, family);
  let mutated = choices;
  if (family.choiceMutate) mutated = family.choiceMutate(mutated, state);
  if (picked.choiceMutate) mutated = picked.choiceMutate(mutated, state);
  return {
    ...base,
    familyId: family.id,
    title: picked.title ?? base.title,
    body: picked.body ?? base.body,
    variantId: picked.id,
    addendum: picked.addendum,
    choices: mutated,
  };
}

function shuffleWith<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i];
    a[i] = a[j]!;
    a[j] = t!;
  }
  return a;
}

export function pickSideFamilies(state: GameState, max = 2): EventFamily[] {
  const eligible = FAMILIES.filter((f) => familyEligible(f, state, true));
  if (!eligible.length) return [];
  const follow = new Set(state.tags.filter((t) => t.startsWith("follow:")).map((t) => t.slice(7)));
  const preferred = eligible.filter((f) => follow.has(f.id));
  const rest = eligible.filter((f) => !follow.has(f.id));
  const rng = mulberry32((state.eventSeed ^ (state.turn * 7919) ^ 0x51ed) >>> 0);
  const out: EventFamily[] = [];
  for (const f of [...shuffleWith(preferred, rng), ...shuffleWith(rest, rng)]) {
    if (out.length >= max) break;
    if (f.exclusivity && out.some((o) => o.exclusivity === f.exclusivity)) continue;
    out.push(f);
  }
  return out;
}

export const FAMILY_COUNT = FAMILIES.length;
export const VARIANT_COUNT = FAMILIES.reduce((s, f) => s + f.variants.length, 0);
