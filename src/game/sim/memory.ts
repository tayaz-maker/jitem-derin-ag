import type { GameState, Locale, MemoryTag } from "../types.ts";
import { entry, setFactionKnow } from "./knowledge.ts";
import { rollAi } from "./rng.ts";
import { applyStat } from "./stats.ts";
import { t } from "../i18n/copy.ts";

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

/** A kept word that is later spent, abandoned or leaked becomes a break. */
export function breakPromise(state: GameState, actorId: string): GameState {
  if (!hasMemory(state, actorId, "promise-kept")) return state;
  return remember(state, actorId, "promise-broken");
}

export function talkChance(state: GameState, actorId: string) {
  let p = 0.2;
  const tags = state.actorMemory[actorId] ?? [];
  if (tags.includes("spent")) p += 0.35;
  if (tags.includes("abandoned")) p += 0.2;
  if (tags.includes("leaked")) p += 0.15;
  if (tags.includes("used")) p += 0.08;
  if (tags.includes("promise-broken")) p += 0.22;
  if (tags.includes("protected")) p -= 0.22;
  if (tags.includes("promise-kept") && !tags.includes("promise-broken")) p -= 0.12;
  if (tags.includes("backed-rival")) p += 0.1;
  return Math.max(0.02, Math.min(0.85, p));
}

export function helpChance(state: GameState, actorId: string) {
  let p = 0.35;
  const tags = state.actorMemory[actorId] ?? [];
  if (tags.includes("protected")) p += 0.25;
  if (tags.includes("promise-kept") && !tags.includes("promise-broken")) p += 0.15;
  if (tags.includes("spent")) p -= 0.4;
  if (tags.includes("abandoned")) p -= 0.25;
  if (tags.includes("used")) p -= 0.08;
  if (tags.includes("promise-broken")) p -= 0.28;
  return Math.max(0.05, Math.min(0.9, p));
}

export function memoryLine(state: GameState, actorId: string, locale: Locale = "tr") {
  const tags = state.actorMemory[actorId] ?? [];
  if (!tags.length) return t(locale, "see.none");
  return `${t(locale, "map.memory")}: ${tags.map((tag) => t(locale, `mem.${tag}`)).join("; ")}.`;
}

function lastTalkTurn(state: GameState, id: string): number | null {
  let last: number | null = null;
  for (const tag of state.tags) {
    if (tag === `talked:${id}`) last = last ?? 0;
    const m = /^talked:([^:]+):t(\d+)$/.exec(tag);
    if (m && m[1] === id) last = Math.max(last ?? 0, Number(m[2]));
  }
  return last;
}

/** Spent/abandoned actors may leak heat on a cooldown; protected ones may quietly help. */
export function tickMemory(state: GameState, notes: string[]): GameState {
  let next = state;
  if (next.turn < 4) return next;
  for (const id of Object.keys(next.actorMemory)) {
    const tags = next.actorMemory[id] ?? [];
    if (!tags.length) continue;
    const last = lastTalkTurn(next, id);
    if (last != null && next.turn - last < 2) continue;
    if (next.tags.includes(`helped:${id}`)) continue;
    const [rolled, r] = rollAi(next, next.turn + id.length * 17);
    next = rolled;
    const talk = talkChance(next, id);
    const help = helpChance(next, id);
    const shielded = tags.includes("protected") && tags.includes("promise-kept") && !tags.includes("promise-broken");
    if (talk >= 0.48 && r < talk * 0.35) {
      next = applyStat(next, "giz", -3);
      next = applyStat(next, "kamuoyu", 2);
      next = { ...next, tags: [...next.tags, `talked:${id}:t${next.turn}`] };
      notes.push(`note.mem.talk|id=${id}`);
      if (tags.includes("spent") && !shielded && !next.tags.includes(`leaked-media:${id}`)) {
        next = setFactionKnow(next, "media", entry("clm_jitem_exists", "RUMOR", { source: "iç sızıntı", confidence: 28 }));
        next = { ...next, tags: [...next.tags, `leaked-media:${id}`] };
        notes.push(`note.mem.spentLeak|id=${id}`);
      }
    } else if (help >= 0.55 && r > 0.72) {
      next = applyStat(next, "giz", 2);
      next = applyStat(next, "sadakat", 1);
      next = { ...next, tags: [...next.tags, `helped:${id}`] };
      notes.push(`note.mem.help|id=${id}`);
    }
  }
  return next;
}
