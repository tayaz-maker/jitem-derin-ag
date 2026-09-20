import type { GameState, MemoryTag } from "../types.ts";
import { rollAi } from "./rng.ts";
import { applyStat } from "./stats.ts";

export function remember(state: GameState, actorId: string, tag: MemoryTag): GameState {
  const cur = state.actorMemory[actorId] ?? [];
  if (cur.includes(tag)) return state;
  return {
    ...state,
    actorMemory: { ...state.actorMemory, [actorId]: [...cur, tag] },
  };
}

export function hasMemory(state: GameState, actorId: string, tag: MemoryTag) {
  return (state.actorMemory[actorId] ?? []).includes(tag);
}

export function talkChance(state: GameState, actorId: string) {
  let p = 0.2;
  const tags = state.actorMemory[actorId] ?? [];
  if (tags.includes("spent")) p += 0.35;
  if (tags.includes("abandoned")) p += 0.2;
  if (tags.includes("leaked")) p += 0.15;
  if (tags.includes("used")) p += 0.08;
  if (tags.includes("protected")) p -= 0.22;
  if (tags.includes("promise-kept")) p -= 0.12;
  if (tags.includes("backed-rival")) p += 0.1;
  return Math.max(0.02, Math.min(0.85, p));
}

export function helpChance(state: GameState, actorId: string) {
  let p = 0.35;
  const tags = state.actorMemory[actorId] ?? [];
  if (tags.includes("protected")) p += 0.25;
  if (tags.includes("promise-kept")) p += 0.15;
  if (tags.includes("spent")) p -= 0.4;
  if (tags.includes("abandoned")) p -= 0.25;
  if (tags.includes("used")) p -= 0.08;
  return Math.max(0.05, Math.min(0.9, p));
}

export function memoryLine(state: GameState, actorId: string) {
  const tags = state.actorMemory[actorId] ?? [];
  if (!tags.length) return "Seni henüz dosyalamadı.";
  const tr: Record<MemoryTag, string> = {
    protected: "beni korudu",
    used: "beni kullandı",
    spent: "beni harcadı",
    abandoned: "beni yalnız bıraktı",
    leaked: "bilgimi sızdırdı",
    "backed-rival": "rakibimi destekledi",
    "promise-kept": "sözünü tuttu",
    "promise-broken": "sözünü tutmadı",
  };
  return `Hatırladığı: ${tags.map((t) => tr[t]).join("; ")}.`;
}

/** Spent/abandoned actors may leak heat once; protected ones may quietly help once. */
export function tickMemory(state: GameState, notes: string[]): GameState {
  let next = state;
  if (next.turn < 4) return next;
  for (const id of Object.keys(next.actorMemory)) {
    const tags = next.actorMemory[id] ?? [];
    if (!tags.length) continue;
    if (next.tags.includes(`talked:${id}`) || next.tags.includes(`helped:${id}`)) continue;
    const [rolled, r] = rollAi(next, next.turn + id.length * 17);
    next = rolled;
    const talk = talkChance(next, id);
    const help = helpChance(next, id);
    if (talk >= 0.48 && r < talk * 0.35) {
      next = applyStat(next, "giz", -3);
      next = applyStat(next, "kamuoyu", 2);
      next = { ...next, tags: [...next.tags, `talked:${id}`] };
      notes.push(`${id} hattı konuşma eşiğine geldi. Tanıklık değil; ısı. Bellek tutuyor.`);
    } else if (help >= 0.55 && r > 0.72) {
      next = applyStat(next, "giz", 2);
      next = applyStat(next, "sadakat", 1);
      next = { ...next, tags: [...next.tags, `helped:${id}`] };
      notes.push(`${id} hattı sessiz yardım etti. Korunan bellek döndü.`);
    }
  }
  return next;
}
