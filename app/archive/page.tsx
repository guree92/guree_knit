"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/client";
import {
  customCompanionRoomsStorageKey,
  deserializeCompanionRooms,
  getEffectiveCompanionParticipantActivityStatus,
  getCompanionRoomStateStorageKey,
  deserializeCompanionRoomState,
  isCompanionParticipantCounted,
  mapCompanionRoom,
  type CompanionParticipantActivityStatus,
  type CompanionCheckInRow,
  type CompanionParticipantRole,
  type CompanionRoom,
  type CompanionRoomRow,
} from "@/lib/companion";
import {
  ensureCompanionLinkedWork,
  findCompanionLinkedWork,
  mergeStoredAndSeedWorkItems,
  readStoredWorkItems,
  writeStoredWorkItems,
  type StoredWorkItem,
} from "@/lib/my-work-storage";
import { getPatternImageUrl, getPatterns, type PatternItem as PatternCatalogItem } from "@/lib/patterns";
import { workItems, type WorkProgress } from "@/data/my-work";
import styles from "./archive-page.module.css";
import heroHeaderImage from "../../Image/headerlogo.png";

type SortOption = "최신순" | "이름순";
type LibraryTab = "전체" | "진행 중" | "완성" | "중단" | "도안 연결";
type SectionTab = "시작" | "지금 하는 작업" | "멈춘 작품" | "내 작품" | "기록";
type QuickLogPreset = string;
type QuickLogDurationUnit = "분" | "시간";

type MyCompanionItem = CompanionRoom & {
  myRole: "진행자" | "참여자";
  myActivity: CompanionParticipantActivityStatus;
  joinedAt: string | null;
  isArchived: boolean;
  latestProgressPreview: string | null;
  latestProgressAt: string | null;
  linkedWorkId: string | null;
};

type MyParticipantRow = {
  room_id: string;
  user_id: string;
  role: CompanionParticipantRole;
  activity_status: CompanionParticipantActivityStatus | null;
  last_activity_at: string | null;
  joined_at: string | null;
};

type TimelineItem = {
  id: string;
  date: string;
  title: string;
  description: string;
  label: string;
  href: string;
  tone: "work" | "pattern" | "companion";
};

type TimelineGroup = {
  key: string;
  year: number;
  month: number;
  label: string;
  items: TimelineItem[];
};

const DRAFT_STORAGE_KEY = "knit_my_work_draft";
const QUICK_LOG_PRESET_STORAGE_KEY = "knit_quick_log_presets";
const PATTERN_SEARCH_PAGE_SIZE = 10;
const FEATURED_WORKS_PER_PAGE = 6;
const MAX_QUICK_LOG_PRESETS = 8;
const DEFAULT_QUICK_LOG_PRESETS: QuickLogPreset[] = ["한 단 완료", "실 교체", "수정 진행", "오늘은 여기까지"];
const QUICK_LOG_DURATION_UNITS: QuickLogDurationUnit[] = ["분", "시간"];
const PAUSED_WORKS_PER_PAGE = 6;
const COMPLETED_WORKS_PER_PAGE = 6;
const SECTION_TAB_LABELS: Record<SectionTab, string> = {
  시작: "시작",
  "지금 하는 작업": "진행중",
  "멈춘 작품": "멈춘작품",
  "내 작품": "완성작품",
  기록: "History",
};
const seedWorkItems: StoredWorkItem[] = workItems.map((item) => ({
  ...item,
  source: "seed",
}));

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-\uac00-\ud7a3]/g, "")
      .slice(0, 40) || String(Date.now())
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getRelativeText(value: string) {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return value;
  const diffDays = Math.round((Date.now() - target.getTime()) / 86400000);
  if (diffDays <= 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  return formatDate(value);
}

function formatMonthLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function getTimelineGroupKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCalendarMonthLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function getCalendarDays(date: Date) {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const startDay = startOfMonth.getDay();
  const startDate = new Date(startOfMonth);
  startDate.setDate(startOfMonth.getDate() - startDay);

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + index);
    return current;
  });
}

function formatHistoryPickerLabel(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "날짜 선택";
  return `${year}. ${month}. ${day}.`;
}

function getWorkBadgeClass(progress: WorkProgress) {
  if (progress === "완성") return styles.badgeDone;
  if (progress === "진행 중") return styles.badgeActive;
  return styles.badgePaused;
}

function getActivityLabel(activity: CompanionParticipantActivityStatus) {
  if (activity === "graduated") return "졸업";
  if (activity === "resting") return "쉬는중";
  return "활동중";
}

function getActivityBadgeClass(activity: CompanionParticipantActivityStatus) {
  if (activity === "graduated") return styles.badgeDone;
  if (activity === "resting") return styles.badgePaused;
  return styles.badgeActive;
}

function getWorkPercent(work: StoredWorkItem) {
  if (work.progress === "완성") return 100;
  if (work.progress === "중단") return 46;
  return Math.min(88, 28 + work.checklist.length * 18);
}

function getFocusLabel(work: StoredWorkItem) {
  const placeholderSteps = new Set(["첫 기록 남기기"]);
  const hasRecordedWork = Boolean(work.lastQuickLogSummary?.trim()) || work.checklist.some((item) => /^\d{4}-\d{2}-\d{2}\s/.test(item));
  const nextChecklistItem = hasRecordedWork
    ? [...work.checklist].reverse().find((item) => !placeholderSteps.has(item))
    : work.checklist[work.checklist.length - 1];

  return nextChecklistItem ?? (hasRecordedWork ? "다음 기록 이어가기" : "다음 단계를 정리해볼까요?");
}

function getFocusSummary(work: StoredWorkItem) {
  const summarySource = work.lastQuickLogSummary?.trim() || work.note.trim();
  if (!summarySource) return "다음 기록을 남기면 작업 흐름이 더 또렷해져요.";
  return summarySource.length > 64 ? `${summarySource.slice(0, 64)}...` : summarySource;
}

function getRecordCountLabel(work: StoredWorkItem) {
  const count = work.checklist.length;
  return count > 0 ? `기록 ${count}회` : "기록 시작 전";
}

function getCompanionProgressPreview(title: string | null | undefined, content: string | null | undefined) {
  const joined = [title?.trim(), content?.trim()].filter(Boolean).join(" · ");
  if (!joined) return null;
  return joined.length > 72 ? `${joined.slice(0, 72)}...` : joined;
}

function getCompanionLinkedWorkViewProgress(
  work: Pick<StoredWorkItem, "progress" | "sourceCompanionRoomId">,
  companionActivityMap: Map<string, CompanionParticipantActivityStatus>,
  shouldTreatMissingCompanionAsPaused = false
) {
  if (!work.sourceCompanionRoomId) return work.progress;
  const companionActivity = companionActivityMap.get(work.sourceCompanionRoomId);
  if (!companionActivity && shouldTreatMissingCompanionAsPaused) return "중단";
  if (companionActivity === "graduated") return "hidden";
  if (companionActivity === "resting" || companionActivity === "waiting") return "중단";
  return "진행 중";
}

function readDraft() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      yarn: typeof parsed.yarn === "string" ? parsed.yarn : "",
      note: typeof parsed.note === "string" ? parsed.note : "",
      progress: parsed.progress === "완성" || parsed.progress === "중단" ? parsed.progress : "진행 중",
    } as { title: string; yarn: string; note: string; progress: WorkProgress };
  } catch {
    return null;
  }
}

function normalizeQuickLogPresets(values: string[]) {
  const next = values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);

  return next.length > 0 ? next : [...DEFAULT_QUICK_LOG_PRESETS];
}

function readQuickLogPresets() {
  if (typeof window === "undefined") return [...DEFAULT_QUICK_LOG_PRESETS];

  try {
    const raw = window.localStorage.getItem(QUICK_LOG_PRESET_STORAGE_KEY);
    if (!raw) return [...DEFAULT_QUICK_LOG_PRESETS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_QUICK_LOG_PRESETS];
    return normalizeQuickLogPresets(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return [...DEFAULT_QUICK_LOG_PRESETS];
  }
}

function MyWorkPageContent() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const searchParams = useSearchParams();
  const processedPatternKeyRef = useRef<string | null>(null);

  const [works, setWorks] = useState<StoredWorkItem[]>(seedWorkItems);
  const [companions, setCompanions] = useState<MyCompanionItem[]>([]);
  const [patternCatalog, setPatternCatalog] = useState<PatternCatalogItem[]>([]);
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("전체");
  const [sectionTab, setSectionTab] = useState<SectionTab>("지금 하는 작업");
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState<WorkProgress>("진행 중");
  const [yarn, setYarn] = useState("");
  const [note, setNote] = useState("");
  const [patternSearchText, setPatternSearchText] = useState("");
  const [patternSearchPage, setPatternSearchPage] = useState(1);
  const [featuredWorksPage, setFeaturedWorksPage] = useState(1);
  const [pausedWorksPage, setPausedWorksPage] = useState(1);
  const [completedWorksPage, setCompletedWorksPage] = useState(1);
  const [historyDateFilter, setHistoryDateFilter] = useState(() => getTodayDateInputValue());
  const [isHistoryCalendarOpen, setIsHistoryCalendarOpen] = useState(false);
  const [historyCalendarMonth, setHistoryCalendarMonth] = useState(() => parseDateInputValue(getTodayDateInputValue()) ?? new Date());
  const [featuredSearchText, setFeaturedSearchText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("최신순");
  const [isCompanionLoading, setIsCompanionLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activityNotice, setActivityNotice] = useState("");
  const [quickLogTargetId, setQuickLogTargetId] = useState("");
  const [quickLogPresets, setQuickLogPresets] = useState<QuickLogPreset[]>(DEFAULT_QUICK_LOG_PRESETS);
  const [quickLogPreset, setQuickLogPreset] = useState<QuickLogPreset>(DEFAULT_QUICK_LOG_PRESETS[0]);
  const [quickLogDurationValue, setQuickLogDurationValue] = useState("30");
  const [quickLogDurationUnit, setQuickLogDurationUnit] = useState<QuickLogDurationUnit>("분");
  const [quickLogPhoto, setQuickLogPhoto] = useState<{ name: string; dataUrl: string } | null>(null);
  const [quickLogMemo, setQuickLogMemo] = useState("");
  const [isQuickLogPhotoModalOpen, setIsQuickLogPhotoModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [presetDrafts, setPresetDrafts] = useState<string[]>(DEFAULT_QUICK_LOG_PRESETS);
  const [presetModalError, setPresetModalError] = useState("");
  const historyCalendarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const localItems = readStoredWorkItems();
    setWorks(mergeStoredAndSeedWorkItems(localItems, seedWorkItems));
    const storedQuickLogPresets = readQuickLogPresets();
    setQuickLogPresets(storedQuickLogPresets);
    setQuickLogPreset((current) =>
      storedQuickLogPresets.includes(current) ? current : (storedQuickLogPresets[0] ?? DEFAULT_QUICK_LOG_PRESETS[0])
    );

    const draft = readDraft();
    if (!draft) return;

    setTitle(draft.title);
    setProgress(draft.progress);
    setYarn(draft.yarn);
    setNote(draft.note);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasDraft = Boolean(title.trim() || yarn.trim() || note.trim() || progress !== "진행 중");
    if (!hasDraft) {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        title,
        yarn,
        note,
        progress,
      })
    );
  }, [note, progress, title, yarn]);

  useEffect(() => {
    if (!activityNotice) return;
    const timeoutId = window.setTimeout(() => setActivityNotice(""), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [activityNotice]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(QUICK_LOG_PRESET_STORAGE_KEY, JSON.stringify(quickLogPresets));
  }, [quickLogPresets]);

  useEffect(() => {
    if (!quickLogPresets.includes(quickLogPreset)) {
      setQuickLogPreset(quickLogPresets[0] ?? DEFAULT_QUICK_LOG_PRESETS[0]);
    }
  }, [quickLogPreset, quickLogPresets]);

  useEffect(() => {
    if (!isPresetModalOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsPresetModalOpen(false);
        setPresetModalError("");
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isPresetModalOpen]);

  useEffect(() => {
    const selected = parseDateInputValue(historyDateFilter);
    if (!selected) return;
    setHistoryCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [historyDateFilter]);

  useEffect(() => {
    if (!isHistoryCalendarOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (historyCalendarRef.current?.contains(target)) return;
      setIsHistoryCalendarOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsHistoryCalendarOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isHistoryCalendarOpen]);

  useEffect(() => {
    let isCancelled = false;

    async function fetchCompanionItems() {
      setIsCompanionLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (isCancelled) return;

      if (!user) {
        setIsLoggedIn(false);
        setCompanions([]);
        setIsCompanionLoading(false);
        return;
      }

      setIsLoggedIn(true);

      const [{ data: myParticipantRows, error: myParticipantError }, { data: hostedRows, error: hostedError }] =
        await Promise.all([
          supabase
            .from("companion_participants")
            .select("room_id, user_id, role, activity_status, last_activity_at, joined_at")
            .eq("user_id", user.id),
          supabase.from("companion_rooms").select("id").eq("host_user_id", user.id),
        ]);

      if (isCancelled) return;

      if (myParticipantError || hostedError) {
        console.error(myParticipantError ?? hostedError);
        setCompanions([]);
        setIsCompanionLoading(false);
        return;
      }

      const joinedRoomIds = Array.from(
        new Set([
          ...(((myParticipantRows ?? []) as Array<{ room_id: string }>).map((row) => row.room_id)),
          ...(((hostedRows ?? []) as Array<{ id: string }>).map((row) => row.id)),
        ])
      );

      if (joinedRoomIds.length === 0) {
        setCompanions([]);
        setIsCompanionLoading(false);
        return;
      }

      const [
        { data: roomRows, error: roomError },
        { data: allParticipantRows, error: allParticipantError },
        { data: checkInRows, error: checkInError },
      ] =
        await Promise.all([
          supabase
            .from("companion_rooms")
            .select("*")
            .in("id", joinedRoomIds)
            .order("created_at", { ascending: false }),
          supabase
            .from("companion_participants")
            .select("room_id, user_id, role, activity_status, last_activity_at, joined_at")
            .in("room_id", joinedRoomIds),
          supabase
            .from("companion_checkins")
            .select("room_id, title, content, created_at")
            .eq("author_user_id", user.id)
            .in("room_id", joinedRoomIds)
            .order("created_at", { ascending: false }),
        ]);

      if (isCancelled) return;

      if (roomError || allParticipantError || checkInError) {
        console.error(roomError ?? allParticipantError ?? checkInError);
        setCompanions([]);
        setIsCompanionLoading(false);
        return;
      }

      const companionRoomRows = (roomRows ?? []) as CompanionRoomRow[];
      const participantRows = (allParticipantRows ?? []) as MyParticipantRow[];
      const latestCheckInByRoomId = new Map<string, { preview: string | null; createdAt: string | null }>();
      (((checkInRows ?? []) as Array<Pick<CompanionCheckInRow, "room_id" | "title" | "content" | "created_at">>) ?? []).forEach((row) => {
        if (latestCheckInByRoomId.has(row.room_id)) return;
        latestCheckInByRoomId.set(row.room_id, {
          preview: getCompanionProgressPreview(row.title, row.content),
          createdAt: row.created_at,
        });
      });

      if (typeof window !== "undefined") {
        const localRooms = deserializeCompanionRooms(window.localStorage.getItem(customCompanionRoomsStorageKey));
        localRooms
          .filter((room) => joinedRoomIds.includes(room.id))
          .forEach((room) => {
            if (latestCheckInByRoomId.has(room.id)) return;
            const fallback = {
              participants: [],
              notices: [],
              supplies: [],
              threads: [],
              checkIns: [],
            };
            const localState = deserializeCompanionRoomState(
              window.localStorage.getItem(getCompanionRoomStateStorageKey(room.id)),
              fallback
            );
            const latestCheckIn = [...localState.checkIns]
              .filter((checkIn) => checkIn.author === (user.email ?? user.id) || checkIn.author === user.id)
              .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
            if (!latestCheckIn) return;
            latestCheckInByRoomId.set(room.id, {
              preview: getCompanionProgressPreview(latestCheckIn.title, latestCheckIn.content),
              createdAt: latestCheckIn.createdAt,
            });
          });
      }

      const participantCountMap = new Map<string, number>();
      participantRows.forEach((row) => {
        if (isCompanionParticipantCounted(row)) {
          participantCountMap.set(row.room_id, (participantCountMap.get(row.room_id) ?? 0) + 1);
        }
      });

      const hostIds = Array.from(
        new Set(companionRoomRows.map((row) => row.host_user_id).filter(Boolean))
      ) as string[];

      let nicknameMap = new Map<string, string | null>();
      if (hostIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, nickname")
          .in("id", hostIds);

        if (profileError) {
          console.error(profileError);
        } else {
          nicknameMap = new Map(
            ((profiles ?? []) as Array<{ id: string; nickname: string | null }>).map((profile) => [
              profile.id,
              profile.nickname,
            ])
          );
        }
      }

      const myParticipantMap = new Map(
        ((myParticipantRows ?? []) as MyParticipantRow[])
          .map((row) => [row.room_id, row] as const)
      );

      const localWorks = readStoredWorkItems();
      let nextLocalWorks = [...localWorks];

      const nextCompanions: MyCompanionItem[] = companionRoomRows.map((row) => {
        const mapped = mapCompanionRoom(
          { ...row, participant_count: participantCountMap.get(row.id) ?? 0 },
          { hostName: row.host_user_id ? nicknameMap.get(row.host_user_id) ?? "진행자" : "진행자" }
        );

        const myJoined = myParticipantMap.get(row.id);
        const fallbackRole: CompanionParticipantRole =
          row.host_user_id === user.id ? "host" : "participant";
        const participantLike = myJoined ?? {
          room_id: row.id,
          user_id: user.id,
          role: fallbackRole,
          activity_status: null,
          last_activity_at: null,
          joined_at: null,
        };

        const effectiveActivity = getEffectiveCompanionParticipantActivityStatus(participantLike);
        const ensured = ensureCompanionLinkedWork(nextLocalWorks, mapped, effectiveActivity);
        nextLocalWorks = ensured.items;
        const linkedWorkId = ensured.workId;

        return {
          ...mapped,
          myRole: participantLike.role === "host" ? "진행자" : "참여자",
          myActivity: effectiveActivity,
          joinedAt: participantLike.joined_at,
          isArchived: effectiveActivity === "graduated",
          latestProgressPreview: latestCheckInByRoomId.get(row.id)?.preview ?? null,
          latestProgressAt: latestCheckInByRoomId.get(row.id)?.createdAt ?? null,
          linkedWorkId,
        };
      });

      if (nextLocalWorks.length !== localWorks.length || JSON.stringify(nextLocalWorks) !== JSON.stringify(localWorks)) {
        writeStoredWorkItems(nextLocalWorks);
        setWorks(mergeStoredAndSeedWorkItems(nextLocalWorks, seedWorkItems));
      }

      setCompanions(nextCompanions);
      setIsCompanionLoading(false);
    }

    void fetchCompanionItems();

    return () => {
      isCancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    let isCancelled = false;

    async function fetchPatterns() {
      try {
        const items = await getPatterns();
        if (!isCancelled) {
          setPatternCatalog(items);
        }
      } catch (error) {
        console.error("도안 목록을 불러오지 못했어요.", error);
        if (!isCancelled) {
          setPatternCatalog([]);
        }
      }
    }

    void fetchPatterns();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    setPatternSearchPage(1);
  }, [patternSearchText]);

  useEffect(() => {
    setFeaturedWorksPage(1);
  }, [featuredSearchText, sectionTab]);

  useEffect(() => {
    setCompletedWorksPage(1);
  }, [searchText, sectionTab, sortOption]);

  useEffect(() => {
    setPausedWorksPage(1);
  }, [sectionTab]);

  const companionActivityMap = useMemo(
    () => new Map(companions.map((item) => [item.id, item.myActivity] as const)),
    [companions]
  );

  const activeWorks = useMemo(
    () =>
      works.filter((work) => getCompanionLinkedWorkViewProgress(work, companionActivityMap, !isCompanionLoading) === "진행 중"),
    [companionActivityMap, isCompanionLoading, works]
  );

  const pausedWorks = useMemo(
    () =>
      works.filter((work) => getCompanionLinkedWorkViewProgress(work, companionActivityMap, !isCompanionLoading) === "중단"),
    [companionActivityMap, isCompanionLoading, works]
  );

  const completedWorks = useMemo(
    () =>
      works.filter((work) => {
        if (!work.sourceCompanionRoomId) {
          return work.progress === "완성";
        }

        const companionActivity = companionActivityMap.get(work.sourceCompanionRoomId);
        if (!companionActivity && !isCompanionLoading) return false;
        if (companionActivity === "graduated") return true;
        return work.progress === "완성";
      }),
    [companionActivityMap, isCompanionLoading, works]
  );

  const activeCompanions = useMemo(
    () => companions.filter((item) => !item.isArchived),
    [companions]
  );

  const linkedPatternWorks = useMemo(
    () => works.filter((work) => Boolean(work.sourcePatternId)),
    [works]
  );

  const effectiveQuickLogTargetId = useMemo(() => {
    if (activeWorks.some((work) => work.id === quickLogTargetId)) {
      return quickLogTargetId;
    }
    return activeWorks[0]?.id ?? "";
  }, [activeWorks, quickLogTargetId]);

  const filteredWorks = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    const source = works.filter((work) => {
      const viewProgress = getCompanionLinkedWorkViewProgress(work, companionActivityMap, !isCompanionLoading);
      if (viewProgress === "hidden") return false;
      if (libraryTab === "전체") return true;
      if (libraryTab === "도안 연결") return Boolean(work.sourcePatternId);
      return viewProgress === libraryTab;
    });

    const searched = source.filter((item) => {
      if (!keyword) return true;
      return [
        item.title,
        item.yarn,
        item.note,
        item.detail,
        item.sourcePatternTitle ?? "",
        item.sourcePatternCategory ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });

    return [...searched].sort((a, b) => {
      if (sortOption === "이름순") {
        return a.title.localeCompare(b.title, "ko");
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [companionActivityMap, isCompanionLoading, libraryTab, searchText, sortOption, works]);

  const featuredWorks = useMemo(
    () =>
      works.filter((work) => {
        if (work.progress === "완성") return false;
        if (!work.sourceCompanionRoomId) return work.progress === "진행 중";
        const companionActivity = companionActivityMap.get(work.sourceCompanionRoomId);
        if (!companionActivity && !isCompanionLoading) return false;
        if (companionActivity === "graduated") return false;
        if (companionActivity === "resting" || companionActivity === "waiting") return false;
        return true;
      }),
    [companionActivityMap, isCompanionLoading, works]
  );

  const filteredFeaturedWorks = useMemo(() => {
    const keyword = featuredSearchText.trim().toLowerCase();
    if (!keyword) return featuredWorks;

    return featuredWorks.filter((work) =>
      [
        work.title,
        work.note,
        work.detail,
        work.lastQuickLogSummary ?? "",
        work.sourcePatternTitle ?? "",
        work.sourcePatternCategory ?? "",
        work.sourceCompanionTitle ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [featuredSearchText, featuredWorks]);

  const pausedDisplayWorks = useMemo(
    () =>
      works.filter((work) => {
        if (work.progress === "중단") return true;
        if (!work.sourceCompanionRoomId) return false;
        const companionActivity = companionActivityMap.get(work.sourceCompanionRoomId);
        if (!companionActivity && !isCompanionLoading) return true;
        return companionActivity === "resting" || companionActivity === "waiting";
      }),
    [companionActivityMap, isCompanionLoading, works]
  );

  const pausedWorksTotalPages = Math.max(1, Math.ceil(pausedDisplayWorks.length / PAUSED_WORKS_PER_PAGE));
  const safePausedWorksPage = Math.min(pausedWorksPage, pausedWorksTotalPages);
  const pagedPausedWorks = useMemo(() => {
    const startIndex = (safePausedWorksPage - 1) * PAUSED_WORKS_PER_PAGE;
    return pausedDisplayWorks.slice(startIndex, startIndex + PAUSED_WORKS_PER_PAGE);
  }, [pausedDisplayWorks, safePausedWorksPage]);

  useEffect(() => {
    if (pausedWorksPage > pausedWorksTotalPages) {
      setPausedWorksPage(pausedWorksTotalPages);
    }
  }, [pausedWorksPage, pausedWorksTotalPages]);

  const filteredCompletedWorks = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    const searched = completedWorks.filter((work) => {
      if (!keyword) return true;

      return [
        work.title,
        work.note,
        work.detail,
        work.lastQuickLogSummary ?? "",
        work.sourcePatternTitle ?? "",
        work.sourcePatternCategory ?? "",
        work.sourceCompanionTitle ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });

    return [...searched].sort((a, b) => {
      if (sortOption === "이름순") {
        return a.title.localeCompare(b.title, "ko");
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [completedWorks, searchText, sortOption]);

  const completedWorksTotalPages = Math.max(1, Math.ceil(filteredCompletedWorks.length / COMPLETED_WORKS_PER_PAGE));
  const safeCompletedWorksPage = Math.min(completedWorksPage, completedWorksTotalPages);
  const pagedCompletedWorks = useMemo(() => {
    const startIndex = (safeCompletedWorksPage - 1) * COMPLETED_WORKS_PER_PAGE;
    return filteredCompletedWorks.slice(startIndex, startIndex + COMPLETED_WORKS_PER_PAGE);
  }, [filteredCompletedWorks, safeCompletedWorksPage]);

  useEffect(() => {
    if (completedWorksPage > completedWorksTotalPages) {
      setCompletedWorksPage(completedWorksTotalPages);
    }
  }, [completedWorksPage, completedWorksTotalPages]);

  const featuredWorksTotalPages = Math.max(1, Math.ceil(filteredFeaturedWorks.length / FEATURED_WORKS_PER_PAGE));
  const safeFeaturedWorksPage = Math.min(featuredWorksPage, featuredWorksTotalPages);
  const pagedFeaturedWorks = useMemo(() => {
    const startIndex = (safeFeaturedWorksPage - 1) * FEATURED_WORKS_PER_PAGE;
    return filteredFeaturedWorks.slice(startIndex, startIndex + FEATURED_WORKS_PER_PAGE);
  }, [filteredFeaturedWorks, safeFeaturedWorksPage]);

  useEffect(() => {
    if (featuredWorksPage > featuredWorksTotalPages) {
      setFeaturedWorksPage(featuredWorksTotalPages);
    }
  }, [featuredWorksPage, featuredWorksTotalPages]);

  const linkedPatternSearchMatches = useMemo(() => {
    const keyword = patternSearchText.trim().toLowerCase();
    if (!keyword) return [] as PatternCatalogItem[];

    return patternCatalog
      .filter((pattern) =>
        [
          pattern.title,
          pattern.description,
          pattern.category,
          pattern.level,
          pattern.author_nickname ?? "",
          pattern.yarn,
          pattern.needle,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword)
      );
  }, [patternCatalog, patternSearchText]);

  const patternSearchPageCount = useMemo(
    () => Math.max(1, Math.ceil(linkedPatternSearchMatches.length / PATTERN_SEARCH_PAGE_SIZE)),
    [linkedPatternSearchMatches]
  );

  useEffect(() => {
    if (patternSearchPage > patternSearchPageCount) {
      setPatternSearchPage(patternSearchPageCount);
    }
  }, [patternSearchPage, patternSearchPageCount]);

  const linkedPatternSearchResults = useMemo(() => {
    const startIndex = (patternSearchPage - 1) * PATTERN_SEARCH_PAGE_SIZE;
    return linkedPatternSearchMatches.slice(startIndex, startIndex + PATTERN_SEARCH_PAGE_SIZE);
  }, [linkedPatternSearchMatches, patternSearchPage]);

  const timelineItems = useMemo<TimelineItem[]>(() => {
    const workTimeline = works.map<TimelineItem>((work) => ({
      id: `work-${work.id}`,
      date: work.lastQuickLogAt ?? work.updatedAt,
      title: work.title,
      description:
        work.lastQuickLogAt === work.updatedAt
          ? work.lastQuickLogSummary
            ? `${work.lastQuickLogSummary} 기록을 남겼어요.`
            : "작업 기록이 남겨졌어요."
          : `${work.sourcePatternTitle ? "도안에서 시작한 " : ""}${work.note}`,
      label: work.sourcePatternTitle ? "도안 연결" : "작품 업데이트",
      href: `/archive/${work.id}`,
      tone: work.sourcePatternTitle ? "pattern" : "work",
    }));

    const companionTimeline = companions.map((room) => ({
      id: `companion-${room.id}`,
      date: room.createdAt,
      title: room.title,
      description: `${room.myRole}로 참여 중인 동행이에요. 현재 상태는 ${getActivityLabel(room.myActivity)}예요.`,
      label: "동행 스냅샷",
      href: `/companion/${room.id}`,
      tone: "companion" as const,
    }));

    return [...workTimeline, ...companionTimeline]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [companions, works]);

  const filteredTimelineItems = useMemo(() => {
    if (!historyDateFilter) return timelineItems;

    const [selectedYear, selectedMonth] = historyDateFilter.split("-");
    if (!selectedYear || !selectedMonth) return timelineItems;

    return timelineItems.filter((item) => {
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return false;
      return String(date.getFullYear()) === selectedYear && String(date.getMonth() + 1).padStart(2, "0") === selectedMonth;
    });
  }, [historyDateFilter, timelineItems]);

  const historyGroups = useMemo<TimelineGroup[]>(() => {
    const grouped = new Map<string, TimelineGroup>();

    filteredTimelineItems.forEach((item) => {
      const date = new Date(item.date);
      const groupKey = getTimelineGroupKey(item.date);
      const year = Number.isNaN(date.getTime()) ? 0 : date.getFullYear();
      const month = Number.isNaN(date.getTime()) ? 0 : date.getMonth() + 1;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          key: groupKey,
          year,
          month,
          label: formatMonthLabel(item.date),
          items: [],
        });
      }

      grouped.get(groupKey)?.items.push(item);
    });

    return Array.from(grouped.values()).sort((left, right) => {
      if (left.year !== right.year) return right.year - left.year;
      return right.month - left.month;
    });
  }, [filteredTimelineItems]);

  const selectedHistoryDate = useMemo(
    () => parseDateInputValue(historyDateFilter) ?? new Date(),
    [historyDateFilter]
  );

  const historyCalendarDays = useMemo(
    () => getCalendarDays(historyCalendarMonth),
    [historyCalendarMonth]
  );

  const summary = useMemo(
    () => ({
      workCount: works.length,
      activeCount: activeWorks.length,
      completedCount: completedWorks.length,
      patternLinkedCount: linkedPatternWorks.length,
      activeCompanionCount: activeCompanions.length,
    }),
    [activeCompanions.length, activeWorks.length, completedWorks.length, linkedPatternWorks.length, works.length]
  );

  function resetForm() {
    setTitle("");
    setProgress("진행 중");
    setYarn("");
    setNote("");
  }

  const syncWorks = useCallback((nextLocalItems: StoredWorkItem[]) => {
    writeStoredWorkItems(nextLocalItems);
    setWorks(mergeStoredAndSeedWorkItems(nextLocalItems, seedWorkItems));
  }, []);

  const upsertLocalWork = useCallback((item: StoredWorkItem) => {
    const nextLocalItems = readStoredWorkItems();
    const index = nextLocalItems.findIndex((stored) => stored.id === item.id);
    const localItem = { ...item, source: "local" as const };

    if (index >= 0) {
      nextLocalItems[index] = localItem;
    } else {
      nextLocalItems.unshift(localItem);
    }

    syncWorks(nextLocalItems);
  }, [syncWorks]);

  function clearDraft() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  }

  function handleSubmitWork() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      alert("작품명만 입력하면 바로 시작할 수 있어요.");
      return;
    }

    const today = getTodayKey();
    const trimmedYarn = yarn.trim() || "준비 중";
    const trimmedNote = note.trim() || "새 작업을 시작했어요. 첫 기록을 남겨볼까요?";

    const newWork: StoredWorkItem = {
      id: `${slugify(trimmedTitle)}-${Date.now()}`,
      title: trimmedTitle,
      progress,
      yarn: trimmedYarn,
      note: trimmedNote,
      needle: "미정",
      startedAt: today,
      updatedAt: today,
      detail: trimmedNote,
      checklist: ["작업 시작", "다음 단계 정리", "첫 기록 남기기"],
      source: "local",
    };

    upsertLocalWork(newWork);
    setLibraryTab("전체");
    setActivityNotice(`${trimmedTitle} 작품이 서랍에 추가됐어요.`);
    resetForm();
    clearDraft();
  }

  function handleChangeProgress(work: StoredWorkItem, nextProgress: WorkProgress) {
    const updated: StoredWorkItem = {
      ...work,
      progress: nextProgress,
      updatedAt: getTodayKey(),
      source: "local",
    };
    upsertLocalWork(updated);
    setActivityNotice(`${work.title} 상태를 ${nextProgress}(으)로 바꿨어요.`);
  }

  function handleQuickLog() {
    const target = activeWorks.find((work) => work.id === effectiveQuickLogTargetId) ?? activeWorks[0] ?? null;
    if (!target) {
      setActivityNotice("기록할 작품이 아직 없어서 시작 탭에서 먼저 작품을 하나 추가해볼까요?");
      setSectionTab("시작");
      return;
    }

    const selectedQuickLogPreset = quickLogPreset.trim() || quickLogPresets[0] || DEFAULT_QUICK_LOG_PRESETS[0];
    const durationValue = quickLogDurationValue.trim() || "0";
    const quickLogDuration = `${durationValue}${quickLogDurationUnit}`;
    const today = getTodayKey();
    const quickLogSummary = [selectedQuickLogPreset, quickLogDuration, quickLogPhoto ? `사진 ${quickLogPhoto.name}` : null]
      .filter(Boolean)
      .join(" · ");
    const checklistEntry = `${today} ${selectedQuickLogPreset}`;
    const nextChecklist = [checklistEntry, ...target.checklist.filter((item) => item !== checklistEntry)];
    const quickLogLead = [selectedQuickLogPreset, `${quickLogDuration} 작업`, quickLogPhoto ? "사진 추가" : null]
      .filter(Boolean)
      .join(", ");
    const memoSuffix = quickLogMemo.trim() ? ` 메모: ${quickLogMemo.trim()}` : "";
    const updated: StoredWorkItem = {
      ...target,
      updatedAt: today,
      lastQuickLogAt: today,
      lastQuickLogSummary: quickLogSummary,
      note: `${selectedQuickLogPreset} 기록을 남겼어요. ${quickLogDuration} 동안 작업했어요.${quickLogPhoto ? " 사진도 함께 남겼어요." : ""}${memoSuffix} ${target.note}`.trim(),
      detail: `${quickLogLead} 기록을 남겼어요.${memoSuffix} ${target.detail}`.trim(),
      checklist: nextChecklist.slice(0, 5),
      quickLogPhotoDataUrl: quickLogPhoto?.dataUrl,
      quickLogPhotoName: quickLogPhoto?.name,
      source: "local",
    };

    upsertLocalWork(updated);
    setQuickLogPreset(quickLogPresets[0] ?? DEFAULT_QUICK_LOG_PRESETS[0]);
    setQuickLogDurationValue("30");
    setQuickLogDurationUnit("분");
    setQuickLogPhoto(null);
    setIsQuickLogPhotoModalOpen(false);
    setQuickLogMemo("");
    setActivityNotice(`${target.title}에 ${quickLogSummary} 기록을 남겼어요.`);
    setSectionTab("기록");
  }

  function openPresetModal() {
    setPresetDrafts([...quickLogPresets]);
    setPresetModalError("");
    setIsPresetModalOpen(true);
  }

  function handlePresetDraftChange(index: number, value: string) {
    setPresetDrafts((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function handleAddPresetDraft() {
    if (presetDrafts.length >= MAX_QUICK_LOG_PRESETS) {
      setPresetModalError(`프리셋은 최대 ${MAX_QUICK_LOG_PRESETS}개까지 만들 수 있어요.`);
      return;
    }

    setPresetDrafts((current) => [...current, ""]);
    setPresetModalError("");
  }

  function handleRemovePresetDraft(index: number) {
    setPresetDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setPresetModalError("");
  }

  function handleResetPresetDrafts() {
    setPresetDrafts([...DEFAULT_QUICK_LOG_PRESETS]);
    setPresetModalError("");
  }

  function handleSavePresetDrafts() {
    const normalized = presetDrafts
      .map((value) => value.trim())
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index);

    if (normalized.length === 0) {
      setPresetModalError("프리셋은 최소 하나 이상 필요해요.");
      return;
    }

    if (normalized.length > MAX_QUICK_LOG_PRESETS) {
      setPresetModalError(`프리셋은 최대 ${MAX_QUICK_LOG_PRESETS}개까지 저장할 수 있어요.`);
      return;
    }

    setQuickLogPresets(normalized);
    setQuickLogPreset((current) => (normalized.includes(current) ? current : normalized[0]));
    setIsPresetModalOpen(false);
    setPresetModalError("");
    setActivityNotice("빠른 기록 프리셋을 업데이트했어요.");
  }

  function handleQuickLogPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      setQuickLogPhoto({ name: file.name, dataUrl: result });
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = "";
  }

  useEffect(() => {
    const startPatternId = searchParams.get("startPatternId");
    const startPatternTitle = searchParams.get("startPatternTitle");
    const startPatternLevel = searchParams.get("startPatternLevel");
    const startPatternCategory = searchParams.get("startPatternCategory");

    if (!startPatternId || !startPatternTitle) return;

    const patternKey = `${startPatternId}:${startPatternTitle}`;
    if (processedPatternKeyRef.current === patternKey) return;
    processedPatternKeyRef.current = patternKey;

    const existing = works.find(
      (work) => work.sourcePatternId === startPatternId && work.progress !== "완성"
    );

    if (existing) {
      queueMicrotask(() => {
        setActivityNotice(`${startPatternTitle} 도안으로 시작한 작품이 이미 있어서 그 작업을 이어서 볼 수 있어요.`);
      });
      void router.replace("/archive", { scroll: false });
      return;
    }

    const today = getTodayKey();
    const nextWork: StoredWorkItem = {
      id: `${slugify(startPatternTitle)}-${Date.now()}`,
      title: startPatternTitle,
      progress: "진행 중",
      yarn: "도안에 맞는 실 고르는 중",
      note: `${startPatternTitle} 도안에서 바로 시작한 작업이에요.`,
      needle: "미정",
      startedAt: today,
      updatedAt: today,
      detail: "도안 페이지에서 바로 시작했어요. 재료를 정하고 첫 기록을 남겨보세요.",
      checklist: ["재료 준비", "게이지 확인", "첫 기록 남기기"],
      source: "local",
      sourcePatternId: startPatternId,
      sourcePatternTitle: startPatternTitle,
      sourcePatternLevel: startPatternLevel ?? undefined,
      sourcePatternCategory: startPatternCategory ?? undefined,
    };

    queueMicrotask(() => {
      upsertLocalWork(nextWork);
      setActivityNotice(`${startPatternTitle} 도안으로 새 작업을 만들었어요.`);
      setLibraryTab("도안 연결");
      setSectionTab("내 작품");
    });
    void router.replace("/archive", { scroll: false });
  }, [router, searchParams, upsertLocalWork, works]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Header />

        <section className={styles.heroPanel}>
          <div className={styles.heroCopy}>
            <div className={styles.heroTitleImage}>
              <Image
                src={heroHeaderImage}
                alt="GUREE"
                priority
                unoptimized
                className={styles.heroTitleImageAsset}
              />
            </div>
          </div>
        </section>

        <div className={styles.workspace}>
          <div className={styles.mainColumn}>
            <section className={styles.hero}>
              <div className={styles.heroTop}>
                <div className={styles.heroIntro}>
                  <h1 className={styles.heroTitle}>작품서랍</h1>
                  <p className={styles.heroDescription}>
                    시작은 가볍게, 기록은 천천히 쌓이게 설계한 내 작업 아카이브예요.
                  </p>
                </div>
              </div>

              <div className={styles.sectionTabRow}>
                {(["시작", "지금 하는 작업", "멈춘 작품", "내 작품", "기록"] as SectionTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSectionTab(tab)}
                    className={[
                      sectionTab === tab ? styles.sectionTabButtonActive : styles.sectionTabButton,
                      tab === "시작"
                        ? sectionTab === tab
                          ? styles.sectionTabNeutralActive
                          : styles.sectionTabNeutral
                        : tab === "지금 하는 작업"
                          ? sectionTab === tab
                            ? styles.sectionTabGreenActive
                            : styles.sectionTabGreen
                          : tab === "멈춘 작품"
                            ? sectionTab === tab
                              ? styles.sectionTabSandActive
                              : styles.sectionTabSand
                          : tab === "내 작품"
                            ? sectionTab === tab
                              ? styles.sectionTabBlueActive
                              : styles.sectionTabBlue
                            : sectionTab === tab
                              ? styles.sectionTabYellowActive
                              : styles.sectionTabYellow,
                    ].join(" ")}
                  >
                    {SECTION_TAB_LABELS[tab]}
                  </button>
                ))}
              </div>
            </section>

            {activityNotice ? (
              <div className={`${styles.actionToast} ${styles.actionToastSuccess}`} role="status" aria-live="polite">
                {activityNotice}
              </div>
            ) : null}

            {sectionTab === "시작" ? (
            <section className={styles.startSection}>
              <section className={styles.quickLogPanel}>
                <div className={styles.quickLogPanelHeader}>
                  <div className={styles.quickLogPanelCopy}>
                    <h3 className={styles.quickLogPanelTitle}>한 번으로 작업 남기기</h3>
                    <p className={styles.quickLogPanelDescription}>
                      진행 중인 작품 하나를 고르고, 오늘 작업한 내용만 빠르게 남길 수 있어요.
                    </p>
                  </div>
                  <div className={styles.quickLogTopActions}>
                    <div className={styles.quickLogSelectWrap}>
                      <span className={styles.quickLogTopLabel}>작품 선택</span>
                      <select
                        value={effectiveQuickLogTargetId}
                        onChange={(event) => setQuickLogTargetId(event.target.value)}
                        className={styles.select}
                        disabled={activeWorks.length === 0}
                      >
                        {activeWorks.length > 0 ? (
                          activeWorks.map((work) => (
                            <option key={work.id} value={work.id}>
                              {work.title}
                            </option>
                          ))
                        ) : (
                          <option value="">진행 중 작품이 없어요</option>
                        )}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleQuickLog}
                      className={`${styles.secondaryLinkAction} ${styles.quickLogSubmitButtonTop}`}
                      disabled={activeWorks.length === 0}
                    >
                      기록 하기
                    </button>
                  </div>
                </div>
                <div className={styles.quickLogCompactGrid}>
                  <section className={styles.quickLogOptionPanel}>
                    <div className={styles.quickLogPanelLabelRow}>
                    </div>
                    <div className={styles.quickLogField}>
                      <div className={styles.quickLogFieldHead}>
                        <span className={styles.label}>빠른 기록 프리셋</span>
                        <button
                          type="button"
                          onClick={openPresetModal}
                          className={styles.secondaryMiniAction}
                        >
                          프리셋 관리
                        </button>
                      </div>
                      <select
                        value={quickLogPreset}
                        onChange={(event) => setQuickLogPreset(event.target.value)}
                        className={styles.select}
                      >
                        {quickLogPresets.map((preset) => (
                          <option key={preset} value={preset}>
                            {preset}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.quickLogField}>
                      <span className={styles.label}>오늘 한 작업 시간</span>
                      <div className={styles.quickLogDurationRow}>
                        <input
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={quickLogDurationValue}
                          onChange={(event) => {
                            const onlyDigits = event.target.value.replace(/\D/g, "");
                            setQuickLogDurationValue(onlyDigits);
                          }}
                          className={`${styles.input} ${styles.quickLogDurationInput}`}
                          placeholder="30"
                        />
                        <select
                          value={quickLogDurationUnit}
                          onChange={(event) => setQuickLogDurationUnit(event.target.value as QuickLogDurationUnit)}
                          className={`${styles.select} ${styles.quickLogDurationUnitSelect}`}
                        >
                          {QUICK_LOG_DURATION_UNITS.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className={styles.quickLogSectionCaption}>
                        숫자만 입력하면 돼요. 예: `30 분`, `2 시간`
                      </span>
                    </div>
                  </section>
                  <section className={styles.quickLogMemoPanel}>
                    <div className={styles.quickLogPanelLabelRow}>
                      <strong className={styles.quickLogSectionTitle}>메모</strong>
                    </div>
                    <div className={styles.quickLogField}>
                      <textarea
                        value={quickLogMemo}
                        onChange={(event) => setQuickLogMemo(event.target.value)}
                        placeholder="예: 코수 정리 완료, 다음엔 손잡이 시작"
                        className={styles.quickLogMemoInput}
                        rows={6}
                      />
                    </div>
                  </section>
                  <section className={styles.quickLogActionPanel}>
                    <div className={styles.quickLogPanelLabelRow}>
                    </div>
                    <div className={styles.quickLogField}>
                      {quickLogPhoto ? (
                        <div className={styles.quickLogPhotoPreviewCompact}>
                          <button
                            type="button"
                            onClick={() => setIsQuickLogPhotoModalOpen(true)}
                            className={styles.quickLogPhotoPreviewButton}
                            aria-label={`${quickLogPhoto.name} 크게 보기`}
                          >
                            <img
                              src={quickLogPhoto.dataUrl}
                              alt={quickLogPhoto.name}
                              className={styles.quickLogPhotoImageCompact}
                            />
                          </button>
                          <div className={styles.quickLogPhotoMetaCompact}>
                            <strong>{quickLogPhoto.name}</strong>
                            <button
                              type="button"
                              onClick={() => setQuickLogPhoto(null)}
                              className={styles.quickLogClearButton}
                            >
                              제거
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.quickLogPhotoEmpty}>
                          <p className={styles.quickLogHintCompact}>사진 없이도 바로 기록할 수 있어요.</p>
                        </div>
                      )}
                      <div className={styles.quickLogPhotoRow}>
                        <label className={styles.quickLogPhotoLabel}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleQuickLogPhotoChange}
                            className={styles.quickLogPhotoInput}
                          />
                          사진 추가
                        </label>
                      </div>
                    </div>
                  </section>
                </div>
              </section>

              <section className={styles.quickAddPanel}>
                <div className={styles.quickAddCopy}>
                  <h3 className={styles.quickAddTitle}>직접 작품 추가</h3>
                  <p className={styles.quickAddDescription}>
                    작품명만 입력해도 서랍에 바로 저장돼요. 재료와 메모는 나중에 채워도 괜찮아요.
                  </p>
                </div>
                <div className={styles.quickAddAction}>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="예: 봄 네트백"
                    className={styles.quickAddInput}
                  />
                  <button type="button" onClick={handleSubmitWork} className={styles.primaryAction}>
                    입력
                  </button>
                </div>
              </section>

              <section className={styles.patternLinkPanel}>
                <div className={styles.patternLinkHeader}>
                  <h3 className={styles.patternLinkTitle}>도안을 검색해서 바로 작품에 연결해보세요</h3>
                  <p className={styles.patternLinkDescription}>
                    검색어를 입력하면 연결 가능한 도안이 카드로 나타나요.
                  </p>
                </div>
                <input
                  value={patternSearchText}
                  onChange={(event) => setPatternSearchText(event.target.value)}
                  placeholder="도안명, 카테고리, 난이도로 검색"
                  className={styles.searchInput}
                />

                {patternSearchText.trim() ? (
                  linkedPatternSearchResults.length > 0 ? (
                    <div className={styles.patternSearchResults}>
                      <div className={styles.patternSearchGrid}>
                        {linkedPatternSearchResults.map((pattern) => {
                          const imageUrl = pattern.image_path ? getPatternImageUrl(pattern.image_path) : "";
                          return (
                            <article key={pattern.id} className={styles.patternSearchCard}>
                              <Link href={`/patterns/${pattern.id}`} className={styles.patternSearchThumbLink}>
                                <div className={styles.patternSearchThumb}>
                                  {imageUrl ? (
                                    <Image
                                      src={imageUrl}
                                      alt={pattern.title}
                                      fill
                                      className={styles.patternSearchImage}
                                      sizes="(max-width: 920px) 50vw, (max-width: 1200px) 25vw, 18vw"
                                    />
                                  ) : (
                                    <div className={styles.patternSearchFallback} />
                                  )}
                                </div>
                              </Link>
                              <div className={styles.patternSearchBody}>
                                <Link href={`/patterns/${pattern.id}`} className={styles.patternSearchTitleLink}>
                                  <strong>{pattern.title}</strong>
                                </Link>
                                <div className={styles.patternSearchMeta}>
                                  <span className={styles.patternSearchTag}>{pattern.category ?? "기타"}</span>
                                  <span className={styles.patternSearchTag}>{pattern.level ?? "난이도 미정"}</span>
                                </div>
                                <div className={styles.patternSearchFooter}>
                                  <span className={styles.patternSearchLike}>{`♥ ${pattern.like_count ?? 0}`}</span>
                                  <Link
                                    href={`/archive?startPatternId=${pattern.id}&startPatternTitle=${encodeURIComponent(pattern.title)}&startPatternLevel=${encodeURIComponent(pattern.level ?? "")}&startPatternCategory=${encodeURIComponent(pattern.category ?? "")}`}
                                    className={styles.patternSearchAction}
                                  >
                                    도안 연결
                                  </Link>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      {patternSearchPageCount > 1 ? (
                        <div className={styles.patternSearchPagination} aria-label="도안 검색 페이지">
                          {Array.from({ length: patternSearchPageCount }, (_, index) => {
                            const pageNumber = index + 1;
                            return (
                              <button
                                key={pageNumber}
                                type="button"
                                onClick={() => setPatternSearchPage(pageNumber)}
                                className={
                                  pageNumber === patternSearchPage
                                    ? `${styles.patternSearchPageButton} ${styles.patternSearchPageButtonActive}`
                                    : styles.patternSearchPageButton
                                }
                                aria-current={pageNumber === patternSearchPage ? "page" : undefined}
                              >
                                {pageNumber}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className={styles.emptyStateCompact}>검색된 도안이 아직 없어요.</div>
                  )
                ) : null}
              </section>
            </section>
            ) : null}

            {sectionTab === "지금 하는 작업" ? (
            <section>
              <div className={styles.libraryControls}>
                <div className={styles.searchRowSingle}>
                  <input
                    value={featuredSearchText}
                    onChange={(event) => setFeaturedSearchText(event.target.value)}
                    placeholder="작품명, 메모, 연결 도안으로 검색해 보세요"
                    className={styles.searchInput}
                  />
                </div>
              </div>

              <div className={styles.activeGrid}>
                <div className={styles.focusColumn}>
                  {pagedFeaturedWorks.length > 0 ? (
                    pagedFeaturedWorks.map((work) => {
                      return (
                        <article key={work.id} className={styles.focusCard}>
                          <div className={styles.focusMedia}>
                            {work.quickLogPhotoDataUrl ? (
                              <img
                                src={work.quickLogPhotoDataUrl}
                                alt={work.quickLogPhotoName ?? work.title}
                                className={styles.focusMediaImage}
                              />
                            ) : (
                              <div className={styles.focusMediaPlaceholder}>
                                <span className={styles.focusMediaEyebrow}>
                                  {work.sourceCompanionRoomId ? "동행 작품" : work.sourcePatternCategory ?? "내 작품"}
                                </span>
                                <strong className={styles.focusMediaWord}>
                                  {(work.sourcePatternTitle ?? work.title).slice(0, 12)}
                                </strong>
                              </div>
                            )}
                            <div className={styles.focusMediaStatusRow}>
                              <span className={styles.metaPill}>{getRelativeText(work.updatedAt)}</span>
                              <span className={[styles.badge, getWorkBadgeClass(work.progress)].join(" ")}>
                                {work.progress}
                              </span>
                            </div>
                          </div>
                          <div className={styles.focusBody}>
                            <div className={styles.focusTop}>
                              <div className={styles.focusCopy}>
                                <p className={styles.focusDescription}>{getFocusSummary(work)}</p>
                              </div>
                            </div>

                            <div className={styles.focusStats}>
                              <span className={styles.infoChip}>{getRecordCountLabel(work)}</span>
                              <span className={styles.metaPill}>{work.sourcePatternCategory ?? "가방"}</span>
                              <span className={styles.metaPill}>{work.needle || "초급"}</span>
                              {work.sourcePatternTitle ? (
                                <span className={styles.metaPill}>도안 연결</span>
                              ) : null}
                            </div>

                            <div className={styles.focusBottom}>
                              <div className={styles.focusChecklist}>
                                <span className={styles.focusLabel}>다음 단계</span>
                                <strong>{getFocusLabel(work)}</strong>
                              </div>
                              <div className={styles.focusActions}>
                                <Link href={`/archive/${work.id}`} className={styles.inlineLink}>
                                  상세 보기
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleChangeProgress(work, work.progress === "중단" ? "진행 중" : work.progress)}
                                  className={styles.focusGhostAction}
                                >
                                  {work.progress === "중단" ? "다시 시작" : "상태 유지"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className={styles.emptyState}>
                      <p className={styles.emptyStateTitle}>
                        {featuredSearchText.trim() ? "검색 결과가 아직 없어요." : "진행 중인 작품이 아직 없어요."}
                      </p>
                      <p className={styles.emptyStateDescription}>
                        {featuredSearchText.trim()
                          ? "다른 검색어로 다시 찾아보거나 검색어를 지워 전체 작품을 확인해 보세요."
                          : "도안에서 바로 시작하거나 작품명을 하나만 적어서 첫 작업을 만들어보세요."}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {featuredWorksTotalPages > 1 ? (
                <div className={styles.featuredPagination}>
                  <button
                    type="button"
                    onClick={() => setFeaturedWorksPage((current) => Math.max(1, current - 1))}
                    className={styles.patternSearchPageButton}
                    disabled={safeFeaturedWorksPage === 1}
                  >
                    이전
                  </button>
                  {Array.from({ length: featuredWorksTotalPages }, (_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <button
                        key={`featured-page-${pageNumber}`}
                        type="button"
                        onClick={() => setFeaturedWorksPage(pageNumber)}
                        className={
                          safeFeaturedWorksPage === pageNumber
                            ? `${styles.patternSearchPageButton} ${styles.patternSearchPageButtonActive}`
                            : styles.patternSearchPageButton
                        }
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setFeaturedWorksPage((current) => Math.min(featuredWorksTotalPages, current + 1))}
                    className={styles.patternSearchPageButton}
                    disabled={safeFeaturedWorksPage === featuredWorksTotalPages}
                  >
                    다음
                  </button>
                </div>
              ) : null}

            </section>
            ) : null}

            {sectionTab === "멈춘 작품" ? (
            <section className={styles.sectionBlockPlain}>
              {pausedDisplayWorks.length > 0 ? (
                <div className={styles.activeGrid}>
                  <div className={styles.focusColumn}>
                  {pagedPausedWorks.map((work) => (
                    <article key={work.id} className={styles.focusCard}>
                      <div className={styles.focusMedia}>
                        {work.quickLogPhotoDataUrl ? (
                          <img
                            src={work.quickLogPhotoDataUrl}
                            alt={work.quickLogPhotoName ?? work.title}
                            className={styles.focusMediaImage}
                          />
                        ) : (
                          <div className={styles.focusMediaPlaceholder}>
                            <span className={styles.focusMediaEyebrow}>
                              {work.sourceCompanionRoomId ? "동행 작품" : work.sourcePatternCategory ?? "내 작품"}
                            </span>
                            <strong className={styles.focusMediaWord}>
                              {(work.sourcePatternTitle ?? work.title).slice(0, 12)}
                            </strong>
                          </div>
                        )}
                        <div className={styles.focusMediaStatusRow}>
                          <span className={styles.metaPill}>{getRelativeText(work.updatedAt)}</span>
                          <span className={[styles.badge, getWorkBadgeClass("중단")].join(" ")}>
                            중단
                          </span>
                        </div>
                      </div>

                      <div className={styles.focusBody}>
                        <div className={styles.focusTop}>
                          <div className={styles.focusCopy}>
                            <p className={styles.focusDescription}>{getFocusSummary(work)}</p>
                          </div>
                        </div>

                        <div className={styles.focusStats}>
                          <span className={styles.infoChip}>{getRecordCountLabel(work)}</span>
                          <span className={styles.metaPill}>{work.sourcePatternCategory ?? "가방"}</span>
                          <span className={styles.metaPill}>{work.needle || "초급"}</span>
                          {work.sourcePatternTitle ? (
                            <span className={styles.metaPill}>도안 연결</span>
                          ) : null}
                        </div>

                        <div className={styles.focusBottom}>
                          <div className={styles.focusChecklist}>
                            <span className={styles.focusLabel}>다음 단계</span>
                            <strong>{getFocusLabel(work)}</strong>
                          </div>
                          <div className={styles.focusActions}>
                            <Link href={`/archive/${work.id}`} className={styles.inlineLink}>
                              상세 보기
                            </Link>
                            {!work.sourceCompanionRoomId ? (
                              <button
                                type="button"
                                onClick={() => handleChangeProgress(work, "진행 중")}
                                className={styles.focusGhostAction}
                              >
                                다시 시작
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                  </div>
                </div>
              ) : (
                <div className={styles.emptyStateCompact}>지금은 멈춘 작품이 없어서 흐름이 좋아요.</div>
              )}

              {pausedWorksTotalPages > 1 ? (
                <div className={styles.featuredPagination}>
                  <button
                    type="button"
                    onClick={() => setPausedWorksPage((current) => Math.max(1, current - 1))}
                    className={styles.patternSearchPageButton}
                    disabled={safePausedWorksPage === 1}
                  >
                    이전
                  </button>
                  {Array.from({ length: pausedWorksTotalPages }, (_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <button
                        key={`paused-page-${pageNumber}`}
                        type="button"
                        onClick={() => setPausedWorksPage(pageNumber)}
                        className={
                          safePausedWorksPage === pageNumber
                            ? `${styles.patternSearchPageButton} ${styles.patternSearchPageButtonActive}`
                            : styles.patternSearchPageButton
                        }
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setPausedWorksPage((current) => Math.min(pausedWorksTotalPages, current + 1))}
                    className={styles.patternSearchPageButton}
                    disabled={safePausedWorksPage === pausedWorksTotalPages}
                  >
                    다음
                  </button>
                </div>
              ) : null}
            </section>
            ) : null}

            {sectionTab === "내 작품" ? (
            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeading}>
                <div className={styles.sectionHeadingCopy}>
                  <h2 className={styles.sectionTitle}>완성 작품</h2>
                  <p className={styles.sectionDescription}>
                    동행 졸업과 개인 작품 완성을 한곳에서 모아볼 수 있어요.
                  </p>
                </div>
              </div>

              <div className={styles.libraryControls}>
                <div className={styles.searchRow}>
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="작품명, 메모, 연결 도안으로 검색"
                    className={styles.searchInput}
                  />
                  <select
                    value={sortOption}
                    onChange={(event) => setSortOption(event.target.value as SortOption)}
                    className={styles.sortSelect}
                  >
                    <option value="최신순">최신순</option>
                    <option value="이름순">이름순</option>
                  </select>
                </div>
              </div>

              <div className={styles.activeGrid}>
                <div className={styles.focusColumn}>
                {pagedCompletedWorks.length > 0 ? (
                  pagedCompletedWorks.map((work) => {
                    const isGraduatedCompanion =
                      Boolean(work.sourceCompanionRoomId) &&
                      companionActivityMap.get(work.sourceCompanionRoomId ?? "") === "graduated";

                    return (
                      <article key={work.id} className={styles.focusCard}>
                        <div className={styles.focusMedia}>
                          {work.quickLogPhotoDataUrl ? (
                            <img
                              src={work.quickLogPhotoDataUrl}
                              alt={work.quickLogPhotoName ?? work.title}
                              className={styles.focusMediaImage}
                            />
                          ) : (
                            <div className={styles.focusMediaPlaceholder}>
                              <span className={styles.focusMediaEyebrow}>
                                {work.sourceCompanionRoomId ? "동행 작품" : work.sourcePatternCategory ?? "내 작품"}
                              </span>
                              <strong className={styles.focusMediaWord}>
                                {(work.sourcePatternTitle ?? work.title).slice(0, 12)}
                              </strong>
                            </div>
                          )}
                          <div className={styles.focusMediaStatusRow}>
                            <span className={styles.metaPill}>{getRelativeText(work.updatedAt)}</span>
                            <span className={[styles.badge, styles.badgeDone].join(" ")}>
                              {isGraduatedCompanion ? "졸업" : "완성"}
                            </span>
                          </div>
                        </div>

                        <div className={styles.focusBody}>
                          <div className={styles.focusTop}>
                            <div className={styles.focusCopy}>
                              <p className={styles.focusDescription}>{getFocusSummary(work)}</p>
                            </div>
                          </div>

                          <div className={styles.focusStats}>
                            <span className={styles.infoChip}>{getRecordCountLabel(work)}</span>
                            <span className={styles.metaPill}>{work.sourcePatternCategory ?? "가방"}</span>
                            <span className={styles.metaPill}>{work.needle || "초급"}</span>
                            {work.sourcePatternTitle ? (
                              <span className={styles.metaPill}>도안 연결</span>
                            ) : null}
                          </div>

                          <div className={styles.focusBottom}>
                            <div className={styles.focusChecklist}>
                              <span className={styles.focusLabel}>마지막 단계</span>
                              <strong>{isGraduatedCompanion ? "동행 마무리 완료" : "작품 완성 기록 보관"}</strong>
                            </div>
                            <div className={styles.focusActions}>
                              {work.sourcePatternId ? (
                                <Link href={`/patterns/${work.sourcePatternId}`} className={styles.inlineLink}>
                                  원본 도안
                                </Link>
                              ) : null}
                              <Link href={`/archive/${work.id}`} className={styles.inlineLink}>
                                상세 보기
                              </Link>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyStateTitle}>완성된 작품이 아직 없어요.</p>
                    <p className={styles.emptyStateDescription}>
                      동행을 졸업하거나 개인 작품을 완성하면 이 탭에서 카드로 모아볼 수 있어요.
                    </p>
                  </div>
                )}
                </div>
              </div>

              {completedWorksTotalPages > 1 ? (
                <div className={styles.featuredPagination}>
                  <button
                    type="button"
                    onClick={() => setCompletedWorksPage((current) => Math.max(1, current - 1))}
                    className={styles.patternSearchPageButton}
                    disabled={safeCompletedWorksPage === 1}
                  >
                    이전
                  </button>
                  {Array.from({ length: completedWorksTotalPages }, (_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <button
                        key={`completed-page-${pageNumber}`}
                        type="button"
                        onClick={() => setCompletedWorksPage(pageNumber)}
                        className={
                          safeCompletedWorksPage === pageNumber
                            ? `${styles.patternSearchPageButton} ${styles.patternSearchPageButtonActive}`
                            : styles.patternSearchPageButton
                        }
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setCompletedWorksPage((current) => Math.min(completedWorksTotalPages, current + 1))}
                    className={styles.patternSearchPageButton}
                    disabled={safeCompletedWorksPage === completedWorksTotalPages}
                  >
                    다음
                  </button>
                </div>
              ) : null}
            </section>
            ) : null}

            {sectionTab === "기록" ? (
            <section className={styles.sectionBlockPlain}>
              <div className={styles.historyPanel}>
                <div className={styles.historyScrollArea}>
                  {historyGroups.length > 0 ? (
                    <div className={styles.historyGroupList}>
                      {historyGroups.map((group, index) => (
                        <section key={group.key} className={styles.historyGroup}>
                          <div className={styles.historyGroupHeader}>
                            <strong>{group.label}</strong>
                            {index === 0 ? (
                              <div ref={historyCalendarRef} className={styles.historyDateWrap}>
                                <button
                                  type="button"
                                  onClick={() => setIsHistoryCalendarOpen((current) => !current)}
                                  className={styles.historyDateButton}
                                >
                                  <span>{historyDateFilter ? formatHistoryPickerLabel(historyDateFilter) : "날짜 선택"}</span>
                                </button>
                                {isHistoryCalendarOpen ? (
                                  <div className={styles.historyCalendarPopover}>
                                    <div className={styles.historyCalendarHeader}>
                                      <strong>{formatCalendarMonthLabel(historyCalendarMonth)}</strong>
                                      <div className={styles.historyCalendarNav}>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setHistoryCalendarMonth(
                                              (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                                            )
                                          }
                                          className={styles.historyCalendarNavButton}
                                          aria-label="이전 달"
                                        >
                                          {"<"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setHistoryCalendarMonth(
                                              (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                                            )
                                          }
                                          className={styles.historyCalendarNavButton}
                                          aria-label="다음 달"
                                        >
                                          {">"}
                                        </button>
                                      </div>
                                    </div>
                                    <div className={styles.historyCalendarWeekdays}>
                                      {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                                        <span key={day}>{day}</span>
                                      ))}
                                    </div>
                                    <div className={styles.historyCalendarGrid}>
                                      {historyCalendarDays.map((date) => {
                                        const isCurrentMonth = date.getMonth() === historyCalendarMonth.getMonth();
                                        const isSelected =
                                          date.getFullYear() === selectedHistoryDate.getFullYear() &&
                                          date.getMonth() === selectedHistoryDate.getMonth() &&
                                          date.getDate() === selectedHistoryDate.getDate();
                                        const isToday = formatDateInputValue(date) === getTodayDateInputValue();

                                        return (
                                          <button
                                            key={formatDateInputValue(date)}
                                            type="button"
                                            onClick={() => {
                                              setHistoryDateFilter(formatDateInputValue(date));
                                              setIsHistoryCalendarOpen(false);
                                            }}
                                            className={[
                                              styles.historyCalendarDay,
                                              isCurrentMonth ? styles.historyCalendarDayCurrent : styles.historyCalendarDayMuted,
                                              isSelected ? styles.historyCalendarDaySelected : "",
                                              !isSelected && isToday ? styles.historyCalendarDayToday : "",
                                            ]
                                              .filter(Boolean)
                                              .join(" ")}
                                          >
                                            {date.getDate()}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                          <div className={styles.timelineList}>
                            {group.items.map((item) => (
                              <Link key={item.id} href={item.href} className={styles.timelineItem}>
                                <span className={styles.timelineRail} aria-hidden="true" />
                                <span
                                  className={[
                                    styles.timelineDot,
                                    item.tone === "pattern"
                                      ? styles.timelinePattern
                                      : item.tone === "companion"
                                        ? styles.timelineCompanion
                                        : styles.timelineWork,
                                  ].join(" ")}
                                />
                                <div className={styles.timelineCopy}>
                                  <div className={styles.timelineMeta}>
                                    <span className={styles.metaPill}>{item.label}</span>
                                    <strong className={styles.timelineMetaTitle}>{item.title}</strong>
                                  </div>
                                  <p className={styles.timelineDescription}>{`${formatDate(item.date)} ${item.description}`}</p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyState}>
                      <p className={styles.emptyStateTitle}>해당 연도에는 아직 기록이 없어요.</p>
                      <p className={styles.emptyStateDescription}>
                        빠른 기록을 한 번 남기면 시간순 연혁이 여기부터 차곡차곡 쌓이기 시작해요.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </section>
            ) : null}

          </div>

          <aside className={styles.sideColumn}>
            <section className={`${styles.sidePanel} ${styles.sideSummaryPanel}`}>
              <div className={styles.sideStatsGrid}>
                <article className={styles.sideStatCard}>
                  <span className={styles.sideStatLabel}>전체 작품</span>
                  <strong className={styles.sideStatValue}>{summary.workCount}</strong>
                </article>
                <article className={styles.sideStatCard}>
                  <span className={styles.sideStatLabel}>진행 중</span>
                  <strong className={styles.sideStatValue}>{summary.activeCount}</strong>
                </article>
                <article className={styles.sideStatCard}>
                  <span className={styles.sideStatLabel}>완성 작품</span>
                  <strong className={styles.sideStatValue}>{summary.completedCount}</strong>
                </article>
                <article className={styles.sideStatCard}>
                  <span className={styles.sideStatLabel}>최근 기록</span>
                  <strong className={styles.sideStatValue}>{timelineItems[0] ? getRelativeText(timelineItems[0].date) : "-"}</strong>
                </article>
              </div>
            </section>

            <section className={styles.sidePanel}>
              <h3 className={styles.sideTitle}>보강 정보</h3>
              <div className={styles.infoList}>
                <article className={styles.infoCard}>
                  <strong>재료/비용</strong>
                  <p>처음엔 비워두고, 작업이 익숙해졌을 때 상세에서 천천히 채우도록 유도해요.</p>
                </article>
                <article className={styles.infoCard}>
                  <strong>회고/메모</strong>
                  <p>완성 시점에 짧게 남기고, 지금은 기록을 시작하는 경험에 집중하게 해요.</p>
                </article>
              </div>
            </section>

          </aside>
        </div>
      </div>
      {isPresetModalOpen ? (
        <div
          className={styles.presetModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="빠른 기록 프리셋 관리"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsPresetModalOpen(false);
              setPresetModalError("");
            }
          }}
        >
          <div className={styles.presetModalDialog}>
            <div className={styles.presetModalHeader}>
              <div>
                <h2 className={styles.presetModalTitle}>빠른 기록 프리셋 관리</h2>
                <p className={styles.presetModalDescription}>
                  자주 남기는 기록 문구를 직접 만들고, 순서를 바꿔 쓰기 쉽게 정리할 수 있어요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPresetModalOpen(false);
                  setPresetModalError("");
                }}
                className={styles.secondaryMiniAction}
              >
                닫기
              </button>
            </div>

            <div className={styles.presetModalList}>
              {presetDrafts.map((preset, index) => (
                <div key={`preset-draft-${index}`} className={styles.presetEditorRow}>
                  <span className={styles.presetEditorIndex}>{index + 1}</span>
                  <input
                    value={preset}
                    onChange={(event) => handlePresetDraftChange(index, event.target.value)}
                    placeholder="예: 손잡이 뜨기 시작"
                    className={styles.input}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePresetDraft(index)}
                    className={styles.quickLogClearButton}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>

            <div className={styles.presetModalHelperRow}>
              <button
                type="button"
                onClick={handleAddPresetDraft}
                className={styles.secondaryMiniAction}
                disabled={presetDrafts.length >= MAX_QUICK_LOG_PRESETS}
              >
                프리셋 추가
              </button>
              <button type="button" onClick={handleResetPresetDrafts} className={styles.inlineLink}>
                기본값으로 되돌리기
              </button>
            </div>

            <p className={styles.presetModalHint}>프리셋은 최대 8개까지 만들 수 있어요.</p>
            {presetModalError ? <p className={styles.presetModalError}>{presetModalError}</p> : null}

            <div className={styles.presetModalActions}>
              <button
                type="button"
                onClick={() => {
                  setIsPresetModalOpen(false);
                  setPresetModalError("");
                }}
                className={styles.secondaryLinkAction}
              >
                취소
              </button>
              <button type="button" onClick={handleSavePresetDrafts} className={styles.primaryAction}>
                저장하기
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isQuickLogPhotoModalOpen && quickLogPhoto ? (
        <div
          className={styles.photoModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="첨부 사진 크게 보기"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsQuickLogPhotoModalOpen(false);
            }
          }}
        >
          <div className={styles.photoModalDialog}>
            <button
              type="button"
              onClick={() => setIsQuickLogPhotoModalOpen(false)}
              className={styles.photoModalClose}
              aria-label="사진 닫기"
            >
              X
            </button>
            <img
              src={quickLogPhoto.dataUrl}
              alt={quickLogPhoto.name}
              className={styles.photoModalImage}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function MyWorkPage() {
  return (
    <Suspense fallback={null}>
      <MyWorkPageContent />
    </Suspense>
  );
}
