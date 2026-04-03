import { type WorkItem, type WorkProgress } from "@/data/my-work";

export const MY_WORK_STORAGE_KEY = "knit_my_work_extra";

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
