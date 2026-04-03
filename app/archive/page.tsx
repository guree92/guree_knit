"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/client";
import {
  getEffectiveCompanionParticipantActivityStatus,
  isCompanionParticipantCounted,
  mapCompanionRoom,
  type CompanionParticipantActivityStatus,
  type CompanionParticipantRole,
  type CompanionRoom,
  type CompanionRoomRow,
} from "@/lib/companion";
import {
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
type SectionTab = "시작" | "지금 하는 작업" | "내 작품" | "기록";
type QuickLogPreset = "한 단 완료" | "실 교체" | "수정 진행" | "오늘은 여기까지";
type QuickLogDuration = "10분" | "30분" | "1시간+";

type MyCompanionItem = CompanionRoom & {
  myRole: "진행자" | "참여자";
  myActivity: CompanionParticipantActivityStatus;
  joinedAt: string | null;
  isArchived: boolean;
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

const DRAFT_STORAGE_KEY = "knit_my_work_draft";
const PATTERN_SEARCH_PAGE_SIZE = 10;
const QUICK_LOG_PRESETS: QuickLogPreset[] = ["한 단 완료", "실 교체", "수정 진행", "오늘은 여기까지"];
const QUICK_LOG_DURATIONS: QuickLogDuration[] = ["10분", "30분", "1시간+"];
const SECTION_TAB_LABELS: Record<SectionTab, string> = {
  시작: "시작",
  "지금 하는 작업": "진행중",
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
  return work.checklist[work.checklist.length - 1] ?? "다음 단계를 정리해볼까요?";
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

export default function MyWorkPage() {
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
  const [searchText, setSearchText] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("최신순");
  const [isCompanionLoading, setIsCompanionLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activityNotice, setActivityNotice] = useState("");
  const [quickLogTargetId, setQuickLogTargetId] = useState("");
  const [quickLogPreset, setQuickLogPreset] = useState<QuickLogPreset>("한 단 완료");
  const [quickLogDuration, setQuickLogDuration] = useState<QuickLogDuration>("30분");
  const [quickLogPhoto, setQuickLogPhoto] = useState<{ name: string; dataUrl: string } | null>(null);
  const [quickLogMemo, setQuickLogMemo] = useState("");

  useEffect(() => {
    const localItems = readStoredWorkItems();
    setWorks(mergeStoredAndSeedWorkItems(localItems, seedWorkItems));

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

      const [{ data: roomRows, error: roomError }, { data: allParticipantRows, error: allParticipantError }] =
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
        ]);

      if (isCancelled) return;

      if (roomError || allParticipantError) {
        console.error(roomError ?? allParticipantError);
        setCompanions([]);
        setIsCompanionLoading(false);
        return;
      }

      const companionRoomRows = (roomRows ?? []) as CompanionRoomRow[];
      const participantRows = (allParticipantRows ?? []) as MyParticipantRow[];

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
          .filter((row) => row.role !== "waiting")
          .map((row) => [row.room_id, row] as const)
      );

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

        return {
          ...mapped,
          myRole: participantLike.role === "host" ? "진행자" : "참여자",
          myActivity: effectiveActivity,
          joinedAt: participantLike.joined_at,
          isArchived: effectiveActivity === "graduated",
        };
      });

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

  const activeWorks = useMemo(
    () => works.filter((work) => work.progress === "진행 중"),
    [works]
  );

  const pausedWorks = useMemo(
    () => works.filter((work) => work.progress === "중단"),
    [works]
  );

  const completedWorks = useMemo(
    () => works.filter((work) => work.progress === "완성"),
    [works]
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
      if (libraryTab === "전체") return true;
      if (libraryTab === "도안 연결") return Boolean(work.sourcePatternId);
      return work.progress === libraryTab;
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
  }, [libraryTab, searchText, sortOption, works]);

  const featuredWorks = useMemo(
    () => [...activeWorks, ...pausedWorks].slice(0, 3),
    [activeWorks, pausedWorks]
  );

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
    const workTimeline = works.map((work) => ({
      id: `work-${work.id}`,
      date: work.lastQuickLogAt ?? work.updatedAt,
      title: work.title,
      description:
        work.lastQuickLogAt === work.updatedAt
          ? work.lastQuickLogSummary
            ? `${formatDate(work.updatedAt)}에 ${work.lastQuickLogSummary} 기록을 남겼어요.`
            : `${formatDate(work.updatedAt)}에 작업 기록이 남겨졌어요.`
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
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [companions, works]);

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

    const today = getTodayKey();
    const quickLogSummary = [quickLogPreset, quickLogDuration, quickLogPhoto ? `사진 ${quickLogPhoto.name}` : null]
      .filter(Boolean)
      .join(" · ");
    const checklistEntry = `${today} ${quickLogPreset}`;
    const nextChecklist = [checklistEntry, ...target.checklist.filter((item) => item !== checklistEntry)];
    const quickLogLead = [quickLogPreset, `${quickLogDuration} 작업`, quickLogPhoto ? "사진 추가" : null]
      .filter(Boolean)
      .join(", ");
    const memoSuffix = quickLogMemo.trim() ? ` 메모: ${quickLogMemo.trim()}` : "";
    const updated: StoredWorkItem = {
      ...target,
      updatedAt: today,
      lastQuickLogAt: today,
      lastQuickLogSummary: quickLogSummary,
      note: `${quickLogPreset} 기록을 남겼어요. ${quickLogDuration} 동안 작업했어요.${quickLogPhoto ? " 사진도 함께 남겼어요." : ""}${memoSuffix} ${target.note}`.trim(),
      detail: `${quickLogLead} 기록을 남겼어요.${memoSuffix} ${target.detail}`.trim(),
      checklist: nextChecklist.slice(0, 5),
      quickLogPhotoDataUrl: quickLogPhoto?.dataUrl,
      quickLogPhotoName: quickLogPhoto?.name,
      source: "local",
    };

    upsertLocalWork(updated);
    setQuickLogPreset("한 단 완료");
    setQuickLogDuration("30분");
    setQuickLogPhoto(null);
    setQuickLogMemo("");
    setActivityNotice(`${target.title}에 ${quickLogSummary} 기록을 남겼어요.`);
    setSectionTab("기록");
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
                {(["시작", "지금 하는 작업", "내 작품", "기록"] as SectionTab[]).map((tab) => (
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
              <section className={styles.quickLogPanel}>
                <div className={styles.quickLogPanelHeader}>
                  <div className={styles.quickLogPanelCopy}>
                    <span className={styles.startCardTone}>오늘 기록</span>
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
                      <strong className={styles.quickLogSectionTitle}>기록 옵션</strong>
                      <span className={styles.quickLogSectionCaption}>오늘 한 작업 내용을 빠르게 선택해요.</span>
                    </div>
                    <div className={styles.quickLogField}>
                      <span className={styles.label}>빠른 기록 프리셋</span>
                      <div className={styles.quickLogChipRow}>
                        {QUICK_LOG_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setQuickLogPreset(preset)}
                            className={quickLogPreset === preset ? styles.quickLogChipActive : styles.quickLogChip}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={styles.quickLogField}>
                      <span className={styles.label}>오늘 한 작업 시간</span>
                      <div className={styles.quickLogChipRow}>
                        {QUICK_LOG_DURATIONS.map((duration) => (
                          <button
                            key={duration}
                            type="button"
                            onClick={() => setQuickLogDuration(duration)}
                            className={quickLogDuration === duration ? styles.quickLogChipActive : styles.quickLogChip}
                          >
                            {duration}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>
                  <section className={styles.quickLogMemoPanel}>
                    <div className={styles.quickLogPanelLabelRow}>
                      <strong className={styles.quickLogSectionTitle}>메모</strong>
                      <span className={styles.quickLogSectionCaption}>선택사항이에요. 오늘 한 작업을 짧게 남겨요.</span>
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
                      <strong className={styles.quickLogSectionTitle}>첨부 및 저장</strong>
                      <span className={styles.quickLogSectionCaption}>사진을 함께 남기거나 바로 기록해요.</span>
                    </div>
                    <div className={styles.quickLogField}>
                      <div className={styles.quickLogPhotoRow}>
                        <span className={styles.label}>사진 먼저 추가</span>
                        <label className={styles.quickLogPhotoLabel}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleQuickLogPhotoChange}
                            className={styles.quickLogPhotoInput}
                          />
                          사진 선택
                        </label>
                      </div>
                      {quickLogPhoto ? (
                        <div className={styles.quickLogPhotoPreviewCompact}>
                          <img
                            src={quickLogPhoto.dataUrl}
                            alt={quickLogPhoto.name}
                            className={styles.quickLogPhotoImageCompact}
                          />
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
                          <p className={styles.quickLogHintCompact}>선택한 사진은 오늘 기록과 함께 바로 저장돼요.</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </section>

              <div className={styles.activeGrid}>
                <div className={styles.focusColumn}>
                  {featuredWorks.length > 0 ? (
                    featuredWorks.map((work) => {
                      const percent = getWorkPercent(work);
                      return (
                        <article key={work.id} className={styles.focusCard}>
                          <div className={styles.focusTop}>
                            <div>
                              <div className={styles.focusMeta}>
                                <span className={styles.metaPill}>{getRelativeText(work.updatedAt)}</span>
                                {work.sourcePatternTitle ? (
                                  <span className={styles.metaPill}>도안 연결</span>
                                ) : null}
                              </div>
                              <h3 className={styles.focusTitle}>{work.title}</h3>
                              <p className={styles.focusDescription}>{work.note}</p>
                            </div>
                            <span className={[styles.badge, getWorkBadgeClass(work.progress)].join(" ")}>
                              {work.progress}
                            </span>
                          </div>

                          <div className={styles.progressBlock}>
                            <div className={styles.progressLabelRow}>
                              <span>현재 진척</span>
                              <strong>{percent}%</strong>
                            </div>
                            <div className={styles.progressRail}>
                              <span className={styles.progressFill} style={{ width: `${percent}%` }} />
                            </div>
                          </div>

                          <div className={styles.focusBottom}>
                            <div className={styles.focusChecklist}>
                              <span className={styles.focusLabel}>다음 단계</span>
                              <strong>{getFocusLabel(work)}</strong>
                            </div>
                            <div className={styles.focusActions}>
                              <button
                                type="button"
                                onClick={() => handleChangeProgress(work, work.progress === "중단" ? "진행 중" : work.progress)}
                                className={styles.secondaryMiniAction}
                              >
                                {work.progress === "중단" ? "다시 시작" : "상태 유지"}
                              </button>
                              <Link href={`/archive/${work.id}`} className={styles.secondaryMiniAction}>
                                상세 보기
                              </Link>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className={styles.emptyState}>
                      <p className={styles.emptyStateTitle}>진행 중인 작품이 아직 없어요.</p>
                      <p className={styles.emptyStateDescription}>
                        도안에서 바로 시작하거나 작품명을 하나만 적어서 첫 작업을 만들어보세요.
                      </p>
                    </div>
                  )}
                </div>

                <div className={styles.snapshotColumn}>
                  <section className={styles.snapshotPanel}>
                    <div className={styles.snapshotHeader}>
                      <h3 className={styles.snapshotTitle}>동행 스냅샷</h3>
                      <Link href="/companion/mine" className={styles.inlineLink}>
                        나와의 동행
                      </Link>
                    </div>
                    {!isLoggedIn ? (
                      <div className={styles.emptyStateCompact}>
                        로그인 후 참여한 동행을 작품서랍에서 요약으로 함께 볼 수 있어요.
                      </div>
                    ) : isCompanionLoading ? (
                      <div className={styles.emptyStateCompact}>동행 스냅샷을 불러오는 중이에요.</div>
                    ) : activeCompanions.length > 0 ? (
                      <div className={styles.snapshotList}>
                        {activeCompanions.slice(0, 3).map((room) => (
                          <Link key={room.id} href={`/companion/${room.id}`} className={styles.snapshotCard}>
                            <div className={styles.snapshotTop}>
                              <span className={styles.metaPill}>{room.myRole}</span>
                              <span className={[styles.badge, getActivityBadgeClass(room.myActivity)].join(" ")}>
                                {getActivityLabel(room.myActivity)}
                              </span>
                            </div>
                            <strong className={styles.snapshotCardTitle}>{room.title}</strong>
                            <p className={styles.snapshotCardDescription}>{room.patternName}</p>
                            <div className={styles.snapshotMeta}>
                              <span>{room.status}</span>
                              <span>{room.participantCount}/{room.capacity}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.emptyStateCompact}>연결해 볼 진행 중 동행이 아직 없어요.</div>
                    )}
                  </section>

                  <section className={styles.snapshotPanel}>
                    <div className={styles.snapshotHeader}>
                      <h3 className={styles.snapshotTitle}>멈춘 작품 다시 보기</h3>
                    </div>
                    {pausedWorks.length > 0 ? (
                      <div className={styles.reviveList}>
                        {pausedWorks.slice(0, 2).map((work) => (
                          <article key={work.id} className={styles.reviveCard}>
                            <strong>{work.title}</strong>
                            <p>{work.note}</p>
                            <button
                              type="button"
                              onClick={() => handleChangeProgress(work, "진행 중")}
                              className={styles.secondaryMiniAction}
                            >
                              다시 시작
                            </button>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.emptyStateCompact}>지금은 멈춘 작품이 없어서 흐름이 좋아요.</div>
                    )}
                  </section>
                </div>
              </div>
            </section>
            ) : null}

            {sectionTab === "내 작품" ? (
            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeading}>
                <div className={styles.sectionHeadingCopy}>
                  <h2 className={styles.sectionTitle}>내 작품 목록</h2>
                  <p className={styles.sectionDescription}>
                    전체 작품을 탐색하고 상태를 바꾸거나, 도안에서 시작한 작업만 따로 모아서 볼 수
                    있어요.
                  </p>
                </div>
              </div>

              <div className={styles.libraryControls}>
                <div className={styles.chipRow}>
                  {(["전체", "진행 중", "완성", "중단", "도안 연결"] as LibraryTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setLibraryTab(tab)}
                      className={libraryTab === tab ? styles.filterChipActive : styles.filterChip}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className={styles.searchRow}>
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="작품명, 실, 메모, 연결 도안으로 검색"
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

              <div className={styles.libraryGrid}>
                {filteredWorks.length > 0 ? (
                  filteredWorks.map((work) => (
                    <article key={work.id} className={styles.workCard}>
                      <div className={styles.workCardTop}>
                        <div className={styles.workCardCopy}>
                          <div className={styles.workCardMeta}>
                            <span className={styles.metaPill}>업데이트 {getRelativeText(work.updatedAt)}</span>
                            {work.sourcePatternCategory ? (
                              <span className={styles.metaPill}>{work.sourcePatternCategory}</span>
                            ) : null}
                          </div>
                          <h3 className={styles.workCardTitle}>{work.title}</h3>
                          <p className={styles.workCardDescription}>{work.detail}</p>
                        </div>
                        <span className={[styles.badge, getWorkBadgeClass(work.progress)].join(" ")}>
                          {work.progress}
                        </span>
                      </div>

                      <div className={styles.workCardInfo}>
                        <span className={styles.infoChip}>실 {work.yarn}</span>
                        <span className={styles.infoChip}>바늘 {work.needle}</span>
                        {work.sourcePatternTitle ? (
                          <span className={styles.infoChip}>원본 {work.sourcePatternTitle}</span>
                        ) : null}
                      </div>

                      <div className={styles.workCardBottom}>
                        <select
                          value={work.progress}
                          onChange={(event) => handleChangeProgress(work, event.target.value as WorkProgress)}
                          className={styles.inlineSelect}
                        >
                          <option value="진행 중">진행 중</option>
                          <option value="완성">완성</option>
                          <option value="중단">중단</option>
                        </select>
                        {work.sourcePatternId ? (
                          <Link href={`/patterns/${work.sourcePatternId}`} className={styles.inlineLink}>
                            원본 도안
                          </Link>
                        ) : null}
                        <Link href={`/archive/${work.id}`} className={styles.secondaryMiniAction}>
                          상세 보기
                        </Link>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyStateTitle}>조건에 맞는 작품이 아직 없어요.</p>
                    <p className={styles.emptyStateDescription}>
                      검색어를 줄이거나 새 작품을 추가해서 서랍을 채워보세요.
                    </p>
                  </div>
                )}
              </div>
            </section>
            ) : null}

            {sectionTab === "기록" ? (
            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeading}>
                <div className={styles.sectionHeadingCopy}>
                  <h2 className={styles.sectionTitle}>기록</h2>
                  <p className={styles.sectionDescription}>
                    작품 업데이트와 동행 스냅샷을 시간순으로 쌓아두고, 언제든 흐름을 되돌아볼 수
                    있어요.
                  </p>
                </div>
              </div>

              <div className={styles.timelineList}>
                {timelineItems.map((item) => (
                  <Link key={item.id} href={item.href} className={styles.timelineItem}>
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
                        <span>{formatDate(item.date)}</span>
                      </div>
                      <strong className={styles.timelineTitle}>{item.title}</strong>
                      <p className={styles.timelineDescription}>{item.description}</p>
                    </div>
                  </Link>
                ))}
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
    </main>
  );
}
