import type { ActionId, GameState, Hat, StatKey } from "../types.ts";

export const HATS: Hat[] = ["saha", "idari", "arastirmaci", "hukuk"];

export function parseHat(v: unknown): Hat {
  if (v === "idari" || v === "arastirmaci" || v === "hukuk" || v === "saha") return v;
  return "saha";
}

export function apFor(hat: Hat) {
  return hat === "saha" ? 5 : 4;
}

const BLOCKED: Record<Hat, ActionId[]> = {
  saha: [],
  idari: [],
  arastirmaci: ["tim_kur", "saha_op", "kara_topla", "itirafci_al", "kisi_harca"],
  hukuk: ["tim_kur", "saha_op", "kara_topla", "itirafci_al", "kisi_harca"],
};

const HAT_ONLY: Partial<Record<ActionId, Hat>> = {
  kaynak_karsilastir: "arastirmaci",
  dogrula: "arastirmaci",
  delil_zincir: "hukuk",
  kanit_esigi: "hukuk",
};

export function hatBlocks(hat: Hat, id: ActionId) {
  if (BLOCKED[hat].includes(id)) return true;
  const only = HAT_ONLY[id];
  if (only && only !== hat) return true;
  return false;
}

export function defaultStats(hat: Hat): Record<StatKey, number> {
  if (hat === "saha") return { etki: 42, kara: 38, giz: 72, bilgi: 22, saha: 56, sadakat: 58, kamuoyu: 12, hukuk: 10 };
  if (hat === "idari") return { etki: 56, kara: 42, giz: 76, bilgi: 28, saha: 34, sadakat: 40, kamuoyu: 18, hukuk: 16 };
  if (hat === "arastirmaci") return { etki: 34, kara: 26, giz: 64, bilgi: 46, saha: 20, sadakat: 34, kamuoyu: 30, hukuk: 24 };
  return { etki: 38, kara: 28, giz: 68, bilgi: 36, saha: 18, sadakat: 32, kamuoyu: 26, hukuk: 40 };
}

export function hatTick(state: GameState, _notes: string[]): GameState {
  return state;
}

export function hatOpeningLog(hat: Hat) {
  if (hat === "saha") return "log.open.saha";
  if (hat === "idari") return "log.open.idari";
  if (hat === "arastirmaci") return "log.open.arastirmaci";
  return "log.open.hukuk";
}
