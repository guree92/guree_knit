import { type WorkItem, type WorkProgress } from "@/data/my-work";
import type { CompanionRoom } from "@/lib/companion";

export const MY_WORK_STORAGE_KEY = "knit_my_work_extra";
const COMPANION_LINKED_WORK_PREFIX = "companion-work";

export type StoredWorkItem = WorkItem & {
  source?: "seed" | "local";
  sourcePatternId?: string;
  sourcePatternTitle?: string;
  sourcePatternLevel?: string;
  sourcePatternCategory?: string;
  lastQuickLogAt?: string;
  lastQuickLogSummary?: string;
  quickLogPhotoDataUrl?: string;
  quickLogPhotoName?: string;
  sourceCompanionRoomId?: string;
  sourceCompanionTitle?: string;
};

const VALID_PROGRESS = new Set<WorkProgress>(["완성", "진행 중", "중단"]);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isWorkProgress(value: unknown): value is WorkProgress {
  return typeof value === "string" && VALID_PROGRESS.has(value as WorkProgress);
}

export function isStoredWorkItem(value: unknown): value is StoredWorkItem {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    isWorkProgress(candidate.progress) &&
    typeof candidate.yarn === "string" &&
    typeof candidate.note === "string" &&
    typeof candidate.needle === "string" &&
    typeof candidate.startedAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.detail === "string" &&
    isStringArray(candidate.checklist)
  );
}

export function readStoredWorkItems() {
  if (typeof window === "undefined") return [] as StoredWorkItem[];

  try {
    const raw = window.localStorage.getItem(MY_WORK_STORAGE_KEY);
    if (!raw) return [] as StoredWorkItem[];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [] as StoredWorkItem[];

    return parsed
      .filter(isStoredWorkItem)
      .map((item) => ({
        ...item,
        source: "local" as const,
      }));
  } catch {
    return [] as StoredWorkItem[];
  }
}

export function writeStoredWorkItems(items: StoredWorkItem[]) {
  if (typeof window === "undefined") return;

  const localItems = items.map(({ source, ...item }) => {
    void source;
    return item;
  });
  window.localStorage.setItem(MY_WORK_STORAGE_KEY, JSON.stringify(localItems));
}

export function mergeStoredAndSeedWorkItems(
  localItems: StoredWorkItem[],
  seedItems: StoredWorkItem[]
) {
  const merged = [...localItems, ...seedItems];

  return merged.filter(
    (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index
  );
}

export function getCompanionLinkedWorkId(roomId: string) {
  return `${COMPANION_LINKED_WORK_PREFIX}-${roomId}`;
}

export function createCompanionLinkedWorkItem(room: Pick<CompanionRoom, "id" | "title" | "patternName" | "level" | "createdAt">) {
  const startedAt = room.createdAt.slice(0, 10);
  return {
    id: getCompanionLinkedWorkId(room.id),
    title: room.title,
    progress: "진행 중" as WorkProgress,
    yarn: room.patternName || "동행 작품",
    note: "동행에서 함께 진행 중인 작품이에요.",
    needle: room.level,
    startedAt,
    updatedAt: startedAt,
    detail: `${room.title} 동행에 참여해 연결된 작품이에요.`,
    checklist: ["동행 기록 시작하기"],
    source: "local" as const,
    sourceCompanionRoomId: room.id,
    sourceCompanionTitle: room.title,
  } satisfies StoredWorkItem;
}

export function findCompanionLinkedWork(items: StoredWorkItem[], roomId: string) {
  return (
    items.find((item) => item.sourceCompanionRoomId === roomId) ??
    items.find((item) => item.id === getCompanionLinkedWorkId(roomId)) ??
    null
  );
}

export function ensureCompanionLinkedWork(
  items: StoredWorkItem[],
  room: Pick<CompanionRoom, "id" | "title" | "patternName" | "level" | "createdAt">
) {
  const existing = findCompanionLinkedWork(items, room.id);
  if (existing) {
    const normalized = {
      ...existing,
      source: "local" as const,
      sourceCompanionRoomId: room.id,
      sourceCompanionTitle: room.title,
    };
    return {
      items: items.map((item) => (item.id === existing.id ? normalized : item)),
      workId: normalized.id,
    };
  }

  const nextItem = createCompanionLinkedWorkItem(room);
  return {
    items: [nextItem, ...items],
    workId: nextItem.id,
  };
}
