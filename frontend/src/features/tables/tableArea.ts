export const DEFAULT_TABLE_AREA = "Main hall";

export const SUGGESTED_TABLE_AREAS = ["Main hall", "Terrace", "Private room", "Bar"] as const;

export function normalizeTableArea(area?: string | null): string {
  return (area ?? "").trim().toLowerCase();
}

export function displayTableArea(area?: string | null): string {
  const trimmed = (area ?? "").trim();
  return trimmed || DEFAULT_TABLE_AREA;
}

/** Pairwise: different areas need at least one table with allowCrossAreaCombine. */
export function canCombineTables(
  tables: Array<{ area?: string | null; allowCrossAreaCombine?: boolean }>
): boolean {
  for (let i = 0; i < tables.length; i += 1) {
    for (let j = i + 1; j < tables.length; j += 1) {
      const left = tables[i];
      const right = tables[j];
      if (normalizeTableArea(left.area) === normalizeTableArea(right.area)) {
        continue;
      }
      if (!left.allowCrossAreaCombine && !right.allowCrossAreaCombine) {
        return false;
      }
    }
  }
  return true;
}
