import type { CampaignAct, GameState, Locale } from "../types.ts";
import { t } from "../i18n/copy.ts";

export const ACT_META: Record<
  CampaignAct,
  { name: string; years: string; unlock: string }
> = {
  1: { name: "Kuruluş", years: "1986–88", unlock: "bağ" },
  2: { name: "Ağın büyümesi", years: "1988–89", unlock: "kişi" },
  3: { name: "Kurum rekabeti", years: "1989–90", unlock: "bilgi / inkâr" },
  4: { name: "İlk kırılmalar", years: "1990–93", unlock: "soruşturma yüzeyi" },
  5: { name: "İfşa baskısı", years: "1993–95", unlock: "Emniyet kesişimi" },
  6: { name: "Son dönem", years: "1995–96", unlock: "hedef baskısı" },
  7: { name: "Final", years: "1996", unlock: "kamu karesi — çıpa durmaz" },
};

export function actOf(turn: number): CampaignAct {
  if (turn <= 1) return 1;
  if (turn <= 2) return 2;
  if (turn <= 4) return 3;
  if (turn <= 7) return 4;
  if (turn <= 8) return 5;
  if (turn <= 9) return 6;
  return 7;
}

export function actLabel(state: GameState, locale: Locale = "tr") {
  const a = actOf(state.turn);
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII"][a - 1];
  return t(locale, "brief.act", { n: roman, name: t(locale, `actName.${a}`) });
}

export function mechanicUnlocked(state: GameState, kind: "edge" | "person" | "knowledge" | "investigation" | "emniyet") {
  const a = actOf(state.turn);
  if (kind === "edge") return a >= 1;
  if (kind === "person") return a >= 2 || state.turn >= 2;
  if (kind === "knowledge") return a >= 3 || state.hat === "arastirmaci";
  if (kind === "investigation") return a >= 4 || state.investigation.stage !== "dormant" || state.hat === "hukuk";
  if (kind === "emniyet") return a >= 5 || Boolean(state.revealed.emniyet);
  return true;
}