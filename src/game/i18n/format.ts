export function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

export function lookup(dict: unknown, path: string): unknown {
  let cur: unknown = dict;
  for (const p of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return prefix ? [prefix] : [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) out.push(...flattenKeys(v, next));
    else out.push(next);
  }
  return out;
}

/** Encode a semantic note so save stores a key, not a translated sentence. */
export function encodeNote(path: string, vars?: Record<string, string | number>): string {
  if (!vars || !Object.keys(vars).length) return path;
  const parts = Object.entries(vars).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return `${path}|${parts.join("|")}`;
}

export function parseNote(raw: string): { path: string; vars?: Record<string, string> } {
  const [path, ...rest] = raw.split("|");
  if (!rest.length) return { path };
  const vars: Record<string, string> = {};
  for (const part of rest) {
    const i = part.indexOf("=");
    if (i > 0) vars[part.slice(0, i)] = decodeURIComponent(part.slice(i + 1));
  }
  return { path, vars };
}