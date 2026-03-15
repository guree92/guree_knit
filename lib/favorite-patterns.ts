const FAVORITE_PATTERN_STORAGE_KEY = "favorite-pattern-ids";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getFavoritePatternIds() {
  if (!canUseStorage()) return [] as string[];

  try {
    const raw = window.localStorage.getItem(FAVORITE_PATTERN_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

export function isFavoritePattern(patternId: string) {
  return getFavoritePatternIds().includes(patternId);
}

export function toggleFavoritePattern(patternId: string) {
  const currentIds = getFavoritePatternIds();
  const nextIds = currentIds.includes(patternId)
    ? currentIds.filter((id) => id !== patternId)
    : [patternId, ...currentIds];

  if (canUseStorage()) {
    window.localStorage.setItem(FAVORITE_PATTERN_STORAGE_KEY, JSON.stringify(nextIds));
    window.dispatchEvent(new CustomEvent("favorite-patterns-changed"));
  }

  return nextIds;
}
