import type { ActionId, LogEntry } from "../types.ts";
import type { Locale } from "./types.ts";
import { interpolate, lookup, parseNote } from "./format.ts";
import { tr, actionsTr } from "./tr.ts";
import { en, actionsEn } from "./en.ts";
import { CHOICES_I18N, EVENTS_I18N, ENDINGS_I18N, CLAIM_WHY, familyVariantCopy, pickLocale } from "./content.ts";

export function dict(locale: Locale) {
  return locale === "en" ? en : tr;
}

export function t(locale: Locale, path: string, vars?: Record<string, string | number>): string {
  const found = lookup(dict(locale), path);
  if (typeof found === "string") return interpolate(found, vars);
  const fb = lookup(tr, path);
  if (typeof fb === "string") return interpolate(fb, vars);
  return path;
}

export function actionCopy(locale: Locale, id: ActionId) {
  return (locale === "en" ? actionsEn : actionsTr)[id];
}

export function eventCopy(locale: Locale, id: string) {
  const row = EVENTS_I18N[id];
  if (!row) return null;
  return {
    title: pickLocale(row.title, locale),
    body: pickLocale(row.body, locale),
    hidden: pickLocale(row.hidden, locale),
  };
}

export function choiceCopy(locale: Locale, id: string) {
  const row = CHOICES_I18N[id];
  if (!row) return null;
  return {
    label: pickLocale(row.label, locale),
    hint: pickLocale(row.hint, locale),
    log: pickLocale(row.log, locale),
  };
}

export function endingCopy(locale: Locale, id: string) {
  const row = ENDINGS_I18N[id];
  if (!row) return null;
  return {
    title: pickLocale(row.title, locale),
    verdict: pickLocale(row.verdict, locale),
    body: pickLocale(row.body, locale),
  };
}

export function claimWhy(locale: Locale, id: string) {
  return pickLocale(CLAIM_WHY[id], locale, "");
}

/** Resolve a log/note. Keys translate; legacy Turkish sentences pass through. */
export function logLine(locale: Locale, raw: string, key?: string, params?: Record<string, string | number>): string {
  if (key?.startsWith("choice.")) {
    return choiceCopy(locale, key.slice("choice.".length))?.log ?? raw;
  }
  if (key) {
    const x = t(locale, key, params);
    if (x !== key) return x;
  }
  const { path, vars } = parseNote(raw);
  if (path === "family.variant" && vars) {
    return familyVariantCopy(locale, vars.fallback, "note");
  }
  const x = t(locale, path, vars);
  return x !== path ? x : raw;
}

export { familyVariantCopy };

export function logEntryLine(locale: Locale, l: Pick<LogEntry, "text" | "key" | "params">): string {
  return logLine(locale, l.text, l.key, l.params);
}
