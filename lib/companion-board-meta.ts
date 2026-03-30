export type CompanionBoardMetaRecord = Record<string, { lastActivityAt?: string; graduatedAt?: string | null }>;

export type MyCompanionState = "progress" | "resting" | "graduated";

const RESTING_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 7;

export function getCompanionBoardMetaStorageKey(roomId: string) {
  return `knit_companion_room_board_meta:${roomId}`;
}

export function readCompanionBoardMeta(roomId: string): CompanionBoardMetaRecord {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(getCompanionBoardMetaStorageKey(roomId));
    return raw ? (JSON.parse(raw) as CompanionBoardMetaRecord) : {};
  } catch {
    return {};
  }
}

export function getMyCompanionState(
  meta: { lastActivityAt?: string; graduatedAt?: string | null } | undefined,
  fallbackLastActivityAt?: string | null
): MyCompanionState {
  if (meta?.graduatedAt) return "graduated";
  const lastActivityAt = meta?.lastActivityAt ?? fallbackLastActivityAt ?? null;
  if (lastActivityAt) {
    const timestamp = new Date(lastActivityAt).getTime();
    if (!Number.isNaN(timestamp) && Date.now() - timestamp > RESTING_THRESHOLD_MS) return "resting";
  }
  return "progress";
}
