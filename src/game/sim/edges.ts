import { EDGES } from "../data.ts";
import type { EdgeLive, GameState } from "../types.ts";

export function seedEdgeLive(): Record<string, EdgeLive> {
  const out: Record<string, EdgeLive> = {};
  for (const e of EDGES) {
    if (e.evidence === "BELGELİ") out[e.id] = { trust: 70, dependency: 50, secrecy: 25, tension: 20 };
    else if (e.evidence === "GÜÇLÜ") out[e.id] = { trust: 52, dependency: 40, secrecy: 48, tension: 28 };
    else if (e.evidence === "TARTIŞMALI") out[e.id] = { trust: 28, dependency: 22, secrecy: 62, tension: 44 };
    else out[e.id] = { trust: 10, dependency: 8, secrecy: 80, tension: 12 };
  }
  return out;
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function touchEdge(state: GameState, id: string, delta: Partial<EdgeLive>): GameState {
  const cur = state.edgeLive[id] ?? { trust: 40, dependency: 30, secrecy: 50, tension: 30 };
  const next: EdgeLive = {
    trust: clamp(cur.trust + (delta.trust ?? 0)),
    dependency: clamp(cur.dependency + (delta.dependency ?? 0)),
    secrecy: clamp(cur.secrecy + (delta.secrecy ?? 0)),
    tension: clamp(cur.tension + (delta.tension ?? 0)),
  };
  return { ...state, edgeLive: { ...state.edgeLive, [id]: next } };
}

export type EdgeMove = "strengthen" | "weaken" | "observe" | "mediate" | "isolate" | "expose" | "protect";

export function edgePreview(kind: EdgeMove) {
  switch (kind) {
    case "strengthen":
      return "Güven ve bağımlılık artar. Sızıntı yüzeyi büyür.";
    case "weaken":
      return "Mesafe. Kişi bağımsızlaşabilir, gizlilik toparlar.";
    case "observe":
      return "Bağı değiştirmez. Kısmi bilgi. İz bırakır.";
    case "mediate":
      return "Gerilim düşer. Güven toparlar. İz bırakır.";
    case "isolate":
      return "Sekiz duvar. Gizlilik artar, kapasite düşer.";
    case "expose":
      return "Kamu ve hukuk ısınır. Giz yanar. BELGELİ kilit durmaz.";
    case "protect":
      return "Bağın sızıntı yüzeyi kapanır. Kapasite bağlanır.";
  }
}

export function liveLine(e: EdgeLive) {
  return `güven ${e.trust} · bağımlılık ${e.dependency} · sır ${e.secrecy} · gerilim ${e.tension}`;
}
