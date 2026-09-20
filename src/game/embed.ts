export type ShellMode = "standalone" | "embedded";

declare global {
  interface Window {
    __DERIN_AG_EMBEDDED?: boolean;
  }
}

export function detectShellMode(
  loc: { search?: string } | null = typeof window === "undefined" ? null : window.location,
  win: { parent?: unknown; self?: unknown; __DERIN_AG_EMBEDDED?: boolean } | null = typeof window === "undefined"
    ? null
    : window,
): ShellMode {
  if (!loc && !win) return "standalone";
  try {
    const q = new URLSearchParams(loc?.search ?? "");
    if (q.get("embed") === "1" || q.get("embedded") === "1") return "embedded";
  } catch {
    /* ignore */
  }
  if (win?.__DERIN_AG_EMBEDDED === true) return "embedded";
  try {
    if (win && win.parent && win.parent !== win) return "embedded";
  } catch {
    return "embedded";
  }
  return "standalone";
}

export function applyShellMode(mode?: ShellMode) {
  if (typeof document === "undefined") return "standalone" as ShellMode;
  const resolved = mode ?? detectShellMode();
  document.documentElement.dataset.shell = resolved;
  document.documentElement.classList.toggle("embedded", resolved === "embedded");
  return resolved;
}
