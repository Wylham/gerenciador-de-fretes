export function normalizeTaggyName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function mergeTaggyOptions(...lists: Array<readonly string[]>): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const list of lists) {
    for (const option of list) {
      const normalized = normalizeTaggyName(option);
      if (!normalized || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      merged.push(normalized);
    }
  }

  return merged;
}
