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

/** Translate authored connection metadata only for presentation. */
export function connectionLabel(locale: Locale, raw: string): string {
  return locale === "en" && raw === "idari / saha" ? "administrative / field" : raw;
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

/** Resolve a log/note without rewriting the stored legacy receipt. */
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
  if (x !== path) return x;
  if (locale === "en") {
    // Older and current saves retain authored Turkish action receipts. Reuse
    // their existing copy only on an exact match, preserving unknown records.
    for (const id of Object.keys(actionsTr) as ActionId[]) {
      for (const field of ["resultOk", "resultWatch"] as const) {
        if (actionsTr[id][field] === raw && actionsEn[id][field]) return actionsEn[id][field]!;
      }
    }
    if (raw === "Örtülü kaynak tekrar toplandı. Getiri azaldı.") {
      return "Covert funds were raised again. The return diminished.";
    }
    // EventModal already presents these simulation addenda through this
    // helper; the log must apply the same distinction from historical facts.
    if (/^(?:OYUNSAL REKONSTRÜKSİYON|TARİHSEL ÇIPA|KAYNAK İDDİASI):/.test(raw)) {
      return familyVariantCopy(locale, raw, "addendum");
    }
  }
  return raw;
}

export { familyVariantCopy };

export function logEntryLine(locale: Locale, l: Pick<LogEntry, "text" | "key" | "params">): string {
  return logLine(locale, l.text, l.key, l.params);
}
