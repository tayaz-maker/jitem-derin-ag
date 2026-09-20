import type { Evidence } from "./types.ts";

export function evidenceTone(e: Evidence) {
  switch (e) {
    case "BELGELİ":
      return "belgeli" as const;
    case "GÜÇLÜ":
      return "guc" as const;
    case "TARTIŞMALI":
      return "tart" as const;
    default:
      return "bos" as const;
  }
}

export function evidenceColor(e: Evidence) {
  switch (e) {
    case "BELGELİ":
      return "var(--color-paper)";
    case "GÜÇLÜ":
      return "var(--color-olive)";
    case "TARTIŞMALI":
      return "var(--color-warn)";
    default:
      return "var(--color-subtle)";
  }
}
