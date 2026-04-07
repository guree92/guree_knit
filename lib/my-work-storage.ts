import { type WorkItem, type WorkProgress } from "@/data/my-work";
import type { CompanionParticipantActivityStatus, CompanionRoom } from "@/lib/companion";

export const MY_WORK_STORAGE_KEY = "knit_my_work_extra";
const COMPANION_LINKED_WORK_PREFIX = "companion-work";

export type WorkLogEntry = {
  id: string;
  createdAt: string;
  summary: string;
  memo: string;
  durationMinutes: number;
  status: WorkProgress | "졸업";
  photoDataUrl?: string | null;
  photoName?: string | null;
};

export type WorkStatusHistoryEntry = {
  id: string;
  status: WorkProgress | "졸업";
  createdAt: string;
  source: "manual" | "companion-auto" | "system";
  note: string;
};

export type WorkMemoSections = {
  todayNote: string;
  blockers: string;
  nextPlan: string;
  materials: string;
  reflection: string;
};

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
  coverPhotoDataUrl?: string | null;
  coverPhotoName?: string | null;
  workLogs?: WorkLogEntry[];
  statusHistory?: WorkStatusHistoryEntry[];
  memoSections?: WorkMemoSections;
};

const VALID_PROGRESS = new Set<WorkProgress>(["완성", "진행 중", "중단"]);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeWorkLogs(item: StoredWorkItem): WorkLogEntry[] {
  const rawLogs = Array.isArray(item.workLogs) ? item.workLogs : [];
  const normalizedLogs = rawLogs
    .filter(isRecord)
    .map((entry, index): WorkLogEntry => ({
      id: typeof entry.id === "string" ? entry.id : `log-${item.id}-${index}`,
      createdAt:
        typeof entry.createdAt === "string" && entry.createdAt.trim()
          ? entry.createdAt
          : item.lastQuickLogAt ?? item.updatedAt,
      summary:
        typeof entry.summary === "string" && entry.summary.trim()
          ? entry.summary
          : item.lastQuickLogSummary ?? "작업 기록",
      memo: typeof entry.memo === "string" ? entry.memo : item.note,
      durationMinutes:
        typeof entry.durationMinutes === "number" && Number.isFinite(entry.durationMinutes)
          ? entry.durationMinutes
          : 0,
      status:
        entry.status === "졸업" || isWorkProgress(entry.status)
          ? entry.status
          : item.progress,
      photoDataUrl: typeof entry.photoDataUrl === "string" ? entry.photoDataUrl : null,
      photoName: typeof entry.photoName === "string" ? entry.photoName : null,
    }))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  if (normalizedLogs.length > 0) return normalizedLogs;
  if (!item.lastQuickLogAt && !item.lastQuickLogSummary) return [];

  return [
    {
      id: `log-${item.id}-latest`,
      createdAt: item.lastQuickLogAt ?? item.updatedAt,
      summary: item.lastQuickLogSummary ?? "최근 작업 기록",
      memo: item.note,
      durationMinutes: 0,
      status: item.progress,
      photoDataUrl: item.quickLogPhotoDataUrl ?? null,
      photoName: item.quickLogPhotoName ?? null,
    },
  ];
}

function normalizeStatusHistory(item: StoredWorkItem): WorkStatusHistoryEntry[] {
  const rawHistory = Array.isArray(item.statusHistory) ? item.statusHistory : [];
  const normalizedHistory = rawHistory
    .filter(isRecord)
    .map((entry, index): WorkStatusHistoryEntry => ({
      id: typeof entry.id === "string" ? entry.id : `status-${item.id}-${index}`,
      status:
        entry.status === "졸업" || isWorkProgress(entry.status)
          ? entry.status
          : item.progress,
      createdAt:
        typeof entry.createdAt === "string" && entry.createdAt.trim()
          ? entry.createdAt
          : item.updatedAt,
      source:
        entry.source === "manual" || entry.source === "companion-auto" || entry.source === "system"
          ? entry.source
          : "system",
      note: typeof entry.note === "string" ? entry.note : "상태가 기록되었어요.",
    }))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  if (normalizedHistory.length > 0) return normalizedHistory;

  return [
    {
      id: `status-${item.id}-initial`,
      status: item.progress,
      createdAt: item.startedAt,
      source: "system",
      note: "작업이 시작되었어요.",
    },
  ];
}

function normalizeMemoSections(item: StoredWorkItem): WorkMemoSections {
  const rawSections: Record<string, unknown> = isRecord(item.memoSections) ? item.memoSections : {};
  return {
    todayNote: typeof rawSections.todayNote === "string" ? rawSections.todayNote : item.note,
    blockers: typeof rawSections.blockers === "string" ? rawSections.blockers : "",
    nextPlan: typeof rawSections.nextPlan === "string" ? rawSections.nextPlan : "",
    materials: typeof rawSections.materials === "string" ? rawSections.materials : item.yarn,
    reflection: typeof rawSections.reflection === "string" ? rawSections.reflection : item.detail,
  };
}

export function normalizeStoredWorkItem(item: StoredWorkItem): StoredWorkItem {
  return {
    ...item,
    coverPhotoDataUrl: item.coverPhotoDataUrl ?? item.quickLogPhotoDataUrl ?? null,
    coverPhotoName: item.coverPhotoName ?? item.quickLogPhotoName ?? null,
    workLogs: normalizeWorkLogs(item),
    statusHistory: normalizeStatusHistory(item),
    memoSections: normalizeMemoSections(item),
  };
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
        ...normalizeStoredWorkItem(item),
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

function getCompanionLinkedWorkStatusPayload(
  room: Pick<CompanionRoom, "title">,
  activityStatus?: CompanionParticipantActivityStatus
) {
  if (activityStatus === "graduated") {
    return {
      progress: "완성" as WorkProgress,
      note: "동행을 졸업한 작품이에요.",
      detail: `${room.title} 동행을 잘 마무리하고 졸업한 작품이에요.`,
    };
  }

  if (activityStatus === "resting" || activityStatus === "waiting") {
    return {
      progress: "중단" as WorkProgress,
      note: "동행에서 잠시 쉬고 있는 작품이에요.",
      detail: `${room.title} 동행에서 잠시 쉬어가는 작품이에요.`,
    };
  }

  return {
    progress: "진행 중" as WorkProgress,
    note: "동행에서 함께 진행 중인 작품이에요.",
    detail: `${room.title} 동행에 참여해 연결된 작품이에요.`,
  };
}

export function createCompanionLinkedWorkItem(
  room: Pick<CompanionRoom, "id" | "title" | "patternName" | "level" | "createdAt">,
  activityStatus?: CompanionParticipantActivityStatus
) {
  const startedAt = room.createdAt.slice(0, 10);
  const statusPayload = getCompanionLinkedWorkStatusPayload(room, activityStatus);

  return {
    id: getCompanionLinkedWorkId(room.id),
    title: room.title,
    progress: statusPayload.progress,
    yarn: room.patternName || "동행 작품",
    note: statusPayload.note,
    needle: room.level,
    startedAt,
    updatedAt: startedAt,
    detail: statusPayload.detail,
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
  room: Pick<CompanionRoom, "id" | "title" | "patternName" | "level" | "createdAt">,
  activityStatus?: CompanionParticipantActivityStatus
) {
  const existing = findCompanionLinkedWork(items, room.id);
  if (existing) {
    const statusPayload = getCompanionLinkedWorkStatusPayload(room, activityStatus);
    const normalizedExisting = normalizeStoredWorkItem(existing);
    const nextStatus = activityStatus === "graduated"
      ? "완성"
      : activityStatus === "resting" || activityStatus === "waiting"
        ? "중단"
        : normalizedExisting.progress;
    const needsStatusHistory = normalizedExisting.statusHistory?.[0]?.status !== nextStatus;
    const normalized = {
      ...normalizedExisting,
      source: "local" as const,
      progress: nextStatus,
      note:
        normalizedExisting.note === "동행에서 함께 진행 중인 작품이에요." ||
        normalizedExisting.note === "동행에서 잠시 쉬고 있는 작품이에요." ||
        normalizedExisting.note === "동행을 졸업한 작품이에요."
          ? statusPayload.note
          : normalizedExisting.note,
      detail:
        normalizedExisting.detail === `${room.title} 동행에 참여해 연결된 작품이에요.` ||
        normalizedExisting.detail === `${room.title} 동행에서 잠시 쉬어가는 작품이에요.` ||
        normalizedExisting.detail === `${room.title} 동행을 잘 마무리하고 졸업한 작품이에요.`
          ? statusPayload.detail
          : normalizedExisting.detail,
      statusHistory: needsStatusHistory
        ? [
            {
              id: `status-${room.id}-${Date.now()}`,
              status: (activityStatus === "graduated" ? "졸업" : nextStatus) as WorkProgress | "졸업",
              createdAt: new Date().toISOString().slice(0, 10),
              source: "companion-auto" as const,
              note:
                activityStatus === "graduated"
                  ? "동행 상태가 졸업으로 반영되었어요."
                  : activityStatus === "resting" || activityStatus === "waiting"
                    ? "동행 상태가 중단으로 반영되었어요."
                    : "동행 상태가 진행 중으로 반영되었어요.",
            },
            ...(normalizedExisting.statusHistory ?? []),
          ]
        : normalizedExisting.statusHistory,
      sourceCompanionRoomId: room.id,
      sourceCompanionTitle: room.title,
    };
    return {
      items: items.map((item) => (item.id === existing.id ? normalized : item)),
      workId: normalized.id,
    };
  }

  const nextItem = normalizeStoredWorkItem(createCompanionLinkedWorkItem(room, activityStatus));
  nextItem.statusHistory = [
    {
      id: `status-${room.id}-initial`,
      status: (activityStatus === "graduated" ? "졸업" : nextItem.progress) as WorkProgress | "졸업",
      createdAt: room.createdAt.slice(0, 10),
      source: "companion-auto",
      note:
        activityStatus === "graduated"
          ? "동행 졸업이 보관함에 반영되었어요."
          : activityStatus === "resting" || activityStatus === "waiting"
            ? "동행 휴식 상태가 보관함에 반영되었어요."
            : "동행 참여 작품이 보관함에 생성되었어요.",
    },
  ];
  return {
    items: [nextItem, ...items],
    workId: nextItem.id,
  };
}
