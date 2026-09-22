export type Evidence = "BELGELİ" | "GÜÇLÜ" | "TARTIŞMALI" | "BOŞLUK";
export type NodeKind = "kurum" | "kisi" | "koridor";
export type Hat = "saha" | "idari" | "arastirmaci" | "hukuk";
export type Phase = "start" | "event" | "actions" | "resolution" | "ended";
export type Faction =
  | "jitem"
  | "mit"
  | "emniyet"
  | "media"
  | "hukuk"
  | "askeri"
  | "yeralti"
  | "siyaset";
export type ActionGroup = "saha" | "koruma" | "bilgi" | "ag" | "kisi";
export type ContentLayer =
  | "historicalFact"
  | "sourceClaim"
  | "gameReconstruction"
  | "alternativeOutcome";
export type Knowledge = 0 | 1 | 2 | 3;
export type Stance = "protect" | "use" | "spend" | "distance" | "none";
export type KnowledgeStatus = "TRUE" | "FALSE" | "PARTIAL" | "RUMOR" | "UNKNOWN";
export type MemoryTag =
  | "protected"
  | "used"
  | "spent"
  | "abandoned"
  | "leaked"
  | "backed-rival"
  | "promise-kept"
  | "promise-broken";
export type InvestigationStage =
  | "dormant"
  | "rumor"
  | "inquiry"
  | "investigation"
  | "evidence"
  | "public"
  | "response";
export type CampaignAct = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type MobilePane = "map" | "olay" | "kisi" | "isler" | "rapor";
export type Locale = "tr" | "en";
export type FogGrade = "KNOWN" | "SUSPECTED" | "RUMOR" | "UNKNOWN";

export type StatKey =
  | "etki"
  | "kara"
  | "giz"
  | "bilgi"
  | "saha"
  | "sadakat"
  | "kamuoyu"
  | "hukuk";

export interface NodeDef {
  id: string;
  researchId: string;
  name: string;
  kind: NodeKind;
  faction?: Faction;
  role: string;
  evidence: Evidence;
  source: string;
  sourceIds: string[];
  dossier: string;
  historicalFact: string;
  sourceClaim: string;
  gameReconstruction: string;
  motivationKind: "sourced" | "gameAssumption" | "unknown";
  motivation: string;
  x: number;
  y: number;
  appearTurn: number;
  bilgiReveal: number;
}

export interface EdgeDef {
  id: string;
  researchId: string;
  from: string;
  to: string;
  label: string;
  evidence: Evidence;
  source: string;
  sourceIds: string[];
  layer: ContentLayer;
  appearTurn: number;
  belgelıLockTurn?: number;
}

export type ActionId =
  | "tim_kur"
  | "itirafci_al"
  | "bag_guclendir"
  | "bag_gevset"
  | "bag_gozet"
  | "bag_yalitim"
  | "bag_ifsa"
  | "bag_arabul"
  | "bag_koru"
  | "sizinti_bastir"
  | "rakip_sogut"
  | "rapor_yaz"
  | "dosya_oku"
  | "saha_op"
  | "kara_topla"
  | "inkar_yaz"
  | "medya_kes"
  | "ankara_koru"
  | "kisi_koru"
  | "kisi_kullan"
  | "kisi_harca"
  | "kisi_mesafe"
  | "soru_yonlendir"
  | "soru_ac"
  | "soru_sinir"
  | "kaynak_karsilastir"
  | "dogrula"
  | "src_tut"
  | "src_paylas"
  | "src_yayin"
  | "delil_zincir"
  | "kanit_esigi";

export interface ActionDef {
  id: ActionId;
  name: string;
  blurb: string;
  cost: string;
  risk: string;
  group: ActionGroup;
  needs: "none" | "edge" | "faction" | "node";
  authority: "command" | "influence";
  ap: number;
  unlockAct?: CampaignAct;
}

export interface EventChoice {
  id: string;
  label: string;
  hint: string;
  log: string;
  effects: Partial<Record<StatKey, number>>;
  tags?: string[];
  special?: "leak-suppress" | "mit-cool" | "emniyet-cool" | "weaken-catli";
}

export interface EventDef {
  id: string;
  familyId: string;
  turn: number;
  year: string;
  block: "B" | "C" | "D" | "E";
  title: string;
  fileNo: string;
  body: string;
  hidden: string;
  hiddenBilgi: number;
  evidence: Evidence;
  layer: ContentLayer;
  anchor: boolean;
  revealNodeIds: string[];
}

export interface LogEntry {
  turn: number;
  year: string;
  text: string;
  key?: string;
  params?: Record<string, string | number>;
  kind: "olay" | "aksiyon" | "npc" | "gizli" | "sistem";
}

export interface Decision {
  turn: number;
  kind: "choice" | "action" | "stance" | "npc";
  id: string;
  target?: string;
  summary: string;
}

export interface PlannedAction {
  id: ActionId;
  edgeId?: string;
  nodeId?: string;
  faction?: Faction;
  claimId?: string;
}

export type EndingId =
  | "inkar_ayakta"
  | "kontrollu_parcalanma"
  | "giz_coktu"
  | "ersever_esigi"
  | "komuta_felaketi"
  | "susurluk_patlama"
  | "kurumsal_tasfiye"
  | "rakip_zafer"
  | "kismi_adalet"
  | "saha_felaketi";

export interface GameFlags {
  commandShifted: boolean;
  abasDead: boolean;
  erseverTalked: boolean;
  erseverDead: boolean;
  susurluk: boolean;
  mitCooledUntil: number;
  emniyetCooledUntil: number;
  leakSuppressed: boolean;
  lastReportTurn: number;
  investigationOpen: boolean;
  gizCrisisTurns: number;
  informantBurned: boolean;
  yesilUsed: boolean;
}

export interface KnowledgeEntry {
  claimId: string;
  status: KnowledgeStatus;
  confidence: number;
  source: string;
  freshness: number;
  propagationRisk: number;
}

export interface FactionMind {
  id: Faction;
  known: string[];
  rumor: string[];
  hostility: number;
  lastAct: string;
  agenda: string;
  fear: string;
  resources: number;
  confidence: number;
  redLines: string[];
  allies: Faction[];
  rivals: Faction[];
  currentObjective: string;
  memory: string[];
  knowledgeBase: Record<string, KnowledgeEntry>;
}

export interface EdgeLive {
  trust: number;
  dependency: number;
  secrecy: number;
  tension: number;
}

export interface InvestigationState {
  stage: InvestigationStage;
  heat: number;
  documents: string[];
  suppressed: string[];
  /** Researcher: sourced compare records. Additive; old saves omit. */
  comparisons?: Array<{ claimId: string; sourceIds: string[]; turn: number }>;
  /** Lawyer: claim-bound chain links. Additive; old saves omit. */
  chain?: Array<{ claimId: string; documentId: string; turn: number }>;
}

export interface Objective {
  id: string;
  title: string;
  hint: string;
  secret: boolean;
  origin: "act" | "faction" | "actor" | "event";
  status: "open" | "done" | "failed";
}

export interface Dossier {
  title: string;
  protectedActors: string[];
  sacrificedActors: string[];
  exposedDocuments: string[];
  suppressedDocuments: string[];
  risenFactions: string[];
  brokenTies: string[];
  publicKnowledge: string[];
  contradictions: string[];
  anchorDrift: string[];
  orderLeft: string;
  causal?: string[];
}

export interface ReplayFrame {
  turn: number;
  familyId?: string;
  variantId?: string;
  factionActs: string[];
  note: string;
}

export interface ReplayMeta {
  seed: number;
  hat: Hat;
  decisions: Decision[];
  events: ReplayFrame[];
  factions: string[];
  major: string[];
}

export interface GameState {
  version: number;
  schemaVersion: number;
  hat: Hat;
  turn: number;
  phase: Phase;
  stats: Record<StatKey, number>;
  nodeHeat: Record<string, number>;
  edgeStr: Record<string, number>;
  edgeLive: Record<string, EdgeLive>;
  stance: Record<string, Stance>;
  actorMemory: Record<string, MemoryTag[]>;
  revealed: Record<string, boolean>;
  dead: Record<string, boolean>;
  logs: LogEntry[];
  decisions: Decision[];
  tags: string[];
  factions: Record<string, FactionMind>;
  hand: Record<string, KnowledgeEntry>;
  truth: Record<string, KnowledgeStatus>;
  investigation: InvestigationState;
  objectives: Objective[];
  replay: ReplayFrame[];
  replayMeta: ReplayMeta;
  actionsLeft: number;
  flags: GameFlags;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  pendingAction: ActionId | null;
  ending: EndingId | null;
  lastResolution: string[];
  recap: string[];
  dossier: Dossier | null;
  worldSeed: number;
  eventSeed: number;
  aiSeed: number;
  rngCursor: number;
  graphMode: "people" | "factions";
}

export const SAVE_KEY = "jitem-derin-ag-v3";
export const SAVE_VERSION = 5;
export const SCHEMA_VERSION = 5;
export const HELP_KEY = "derin-ag-help-v1";
export const LEGACY_SAVE_KEY = "derin-ag-save-v1";
