import { create } from "zustand";
import type { Locale } from "./types.ts";
import { LOCALE_STORAGE_KEY, PARENT_LOCALE_EVENT } from "./types.ts";
import { detectShellMode } from "../embed.ts";

declare global {
  interface Window {
    __DERIN_AG_LOCALE?: Locale;
  }
}

function readQueryLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const q = new URLSearchParams(window.location.search);
    const lang = q.get("lang") || q.get("locale");
    if (lang === "en" || lang === "tr") return lang;
  } catch {
    /* */
  }
  return null;
}

function readParentLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const v = window.__DERIN_AG_LOCALE;
  if (v === "en" || v === "tr") return v;
  return null;
}

function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (v === "en" || v === "tr") return v;
  } catch {
    /* */
  }
  return null;
}

export function detectLocale(): Locale {
  return readQueryLocale() ?? readParentLocale() ?? readStoredLocale() ?? "tr";
}

interface LocaleStore {
  locale: Locale;
  hydrated: boolean;
  hydrate: () => void;
  setLocale: (locale: Locale, opts?: { fromParent?: boolean }) => void;
}

export const useLocale = create<LocaleStore>((set, get) => ({
  locale: "tr",
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    const locale = detectLocale();
    if (typeof document !== "undefined") document.documentElement.lang = locale;
    set({ locale, hydrated: true });
  },
  setLocale: (locale, opts) => {
    const embedded = typeof window !== "undefined" && detectShellMode() === "embedded";
    if (embedded && !opts?.fromParent) return;
    if (typeof document !== "undefined") document.documentElement.lang = locale;
    if (!embedded) {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      } catch {
        /* */
      }
    }
    set({ locale });
  },
}));

export function bindParentLocale() {
  if (typeof window === "undefined") return () => undefined;
  const onMsg = (e: MessageEvent) => {
    const data = e.data as { type?: string; locale?: string } | null;
    if (!data || data.type !== PARENT_LOCALE_EVENT) return;
    if (data.locale === "tr" || data.locale === "en") useLocale.getState().setLocale(data.locale, { fromParent: true });
  };
  const onCustom = (e: Event) => {
    const locale = (e as CustomEvent<{ locale?: string }>).detail?.locale;
    if (locale === "tr" || locale === "en") useLocale.getState().setLocale(locale, { fromParent: true });
  };
  window.addEventListener("message", onMsg);
  window.addEventListener(PARENT_LOCALE_EVENT, onCustom as EventListener);
  return () => {
    window.removeEventListener("message", onMsg);
    window.removeEventListener(PARENT_LOCALE_EVENT, onCustom as EventListener);
  };
}

export { LOCALE_STORAGE_KEY, PARENT_LOCALE_EVENT };
