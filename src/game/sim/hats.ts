import type { ActionId, GameState, Hat, StatKey } from "../types.ts";
import { applyStat } from "./stats.ts";

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
  src_tut: "arastirmaci",
  src_paylas: "arastirmaci",
  src_yayin: "arastirmaci",
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

export function hatTick(state: GameState, notes: string[]): GameState {
  let next = state;
  const hat = next.hat;
  if (hat === "saha") {
    const fieldSpam = next.decisions.filter((d) => d.id === "tim_kur" || d.id === "saha_op" || d.id === "kara_topla").length;
    if (fieldSpam >= 3 && next.turn >= 4) {
      next = applyStat(next, "giz", -2);
      notes.push("note.hat.saha.trace");
    }
    if (next.stats.sadakat < 28) next = applyStat(next, "saha", -1);
  } else if (hat === "idari") {
    const deny = next.decisions.filter((d) => d.id === "inkar_yaz").length;
    if (deny >= 3 && next.stats.kamuoyu >= 24) {
      next = applyStat(next, "giz", -2);
      notes.push("note.hat.idari.repeat");
    }
  } else if (hat === "arastirmaci") {
    if (next.tags.some((tag) => tag.startsWith("src-held"))) next = applyStat(next, "giz", 1);
    if (next.tags.some((tag) => tag.startsWith("src-published"))) next = applyStat(next, "kamuoyu", 1);
    if ((next.investigation.comparisons?.length ?? 0) === 0 && next.turn >= 4) {
      next = applyStat(next, "bilgi", -1);
      notes.push("note.hat.research.stall");
    }
  } else if (hat === "hukuk") {
    const chainN = next.investigation.chain?.length ?? 0;
    if (next.investigation.stage !== "dormant" && chainN === 0 && next.turn >= 5) {
      next = applyStat(next, "hukuk", -1);
      notes.push("note.hat.law.stall");
    }
    if (chainN >= 2 && next.stats.kamuoyu >= 28) {
      next = applyStat(next, "kamuoyu", 1);
      notes.push("note.hat.law.public");
    }
  }
  return next;
}

export function hatOpeningLog(hat: Hat) {
  if (hat === "saha") return "log.open.saha";
  if (hat === "idari") return "log.open.idari";
  if (hat === "arastirmaci") return "log.open.arastirmaci";
  return "log.open.hukuk";
}
