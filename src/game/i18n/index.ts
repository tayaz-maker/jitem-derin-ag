export type { Locale, InteractiveCopy } from "./types.ts";
export { LOCALE_STORAGE_KEY, PARENT_LOCALE_EVENT } from "./types.ts";
export { t, dict, actionCopy, eventCopy, choiceCopy, endingCopy, claimWhy, logLine, logEntryLine } from "./copy.ts";
export { useLocale, detectLocale, bindParentLocale } from "./locale.ts";
export {
  copyForAction,
  resultForAction,
  nodeInteractive,
  edgeInteractive,
  playerFog,
  fogOf,
  affiliationLine,
  foggedClaimLine,
} from "./interactive.ts";
export { interpolate, flattenKeys, encodeNote, parseNote } from "./format.ts";
export { tr, actionsTr } from "./tr.ts";
export { en, actionsEn } from "./en.ts";

import { useLocale } from "./locale.ts";
import { t as tRaw } from "./copy.ts";

export function useT() {
  const locale = useLocale((s) => s.locale);
  return (path: string, vars?: Record<string, string | number>) => tRaw(locale, path, vars);
}