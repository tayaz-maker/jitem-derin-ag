import type { ActionId, Locale as GameLocale } from "../types.ts";

export type Locale = GameLocale;

/** Five-beat interactive language. Empty fields are omitted in UI — never pad with filler. */
export interface InteractiveCopy {
  label: string;
  verb?: string;
  shortExplanation?: string;
  whyItMatters?: string;
  knownCost?: string;
  expectedEffect?: string;
  uncertainty?: string;
  resultExplanation?: string;
  nextSuggestion?: string;
}

export type ActionCopy = Record<
  ActionId,
  {
    label: string;
    verb: string;
    shortExplanation: string;
    whyItMatters: string;
    knownCost: string;
    expectedEffect: string;
    uncertainty?: string;
    resultOk: string;
    resultWatch?: string;
    nextSuggestion: string;
  }
>;

export const LOCALE_STORAGE_KEY = "jitem-derin-ag-locale";
export const PARENT_LOCALE_EVENT = "derin-ag-locale";

export type DeepStringify<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? DeepStringify<U>[]
    : T extends object
      ? { [K in keyof T]: DeepStringify<T[K]> }
      : T;