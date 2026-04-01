"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { workItems, type WorkProgress } from "@/data/my-work";
import styles from "./my-work-page.module.css";
import heroHeaderImage from "../../Image/headerlogo.png";

type DrawerTab = "진행중" | "보관함" | "동행기록";
type SortOption = "최신순" | "이름순";
type RoleFilter = "전체" | "진행자" | "참여자";
type RoomStatusFilter = "전체" | "모집중" | "진행중";
type ActivityFilter = "전체" | "활동중" | "쉬는중" | "졸업";

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

const seedWorkItems: StoredWorkItem[] = workItems.map((item) => ({
  ...item,
  source: "seed",
}));

export default function MyWorkPage() {
  const [supabase] = useState(() => createClient());
  const [works, setWorks] = useState<StoredWorkItem[]>(() => {
    const localItems = readStoredWorkItems();
    return mergeStoredAndSeedWorkItems(localItems, seedWorkItems);
  });
  const [companions, setCompanions] = useState<MyCompanionItem[]>([]);
  const [activeTab, setActiveTab] = useState<DrawerTab>("진행중");
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState<WorkProgress>("진행 중");
  const [yarn, setYarn] = useState("");
  const [note, setNote] = useState("");
  const [searchText, setSearchText] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("최신순");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("전체");
  const [roomStatusFilter, setRoomStatusFilter] = useState<RoomStatusFilter>("전체");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("전체");
  const [isCompanionLoading, setIsCompanionLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  const activeWorks = useMemo(
    () => works.filter((work) => work.progress !== "완성"),
    [works]
  );

  const archivedWorks = useMemo(
    () => works.filter((work) => work.progress === "완성"),
    [works]
  );

  const activeCompanions = useMemo(
    () => companions.filter((item) => !item.isArchived),
    [companions]
  );

  const archivedCompanions = useMemo(
    () => companions.filter((item) => item.isArchived),
    [companions]
  );

  const searchedWorks = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const source =
      activeTab === "보관함" ? archivedWorks : activeTab === "진행중" ? activeWorks : works;

    return source.filter((item) => {
      if (!keyword) return true;
      return [item.title, item.yarn, item.note, item.detail].join(" ").toLowerCase().includes(keyword);
    });
  }, [activeTab, activeWorks, archivedWorks, searchText, works]);

  const searchedCompanions = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    let source =
      activeTab === "보관함"
        ? archivedCompanions
        : activeTab === "진행중"
          ? activeCompanions
          : companions;

    if (activeTab === "동행기록") {
      source = source.filter((item) => {
        const rolePass = roleFilter === "전체" || item.myRole === roleFilter;
        const statusPass = roomStatusFilter === "전체" || item.status === roomStatusFilter;
        const activityPass =
          activityFilter === "전체" || getActivityLabel(item.myActivity) === activityFilter;
        return rolePass && statusPass && activityPass;
      });
    }

    return source.filter((item) => {
      if (!keyword) return true;
      return [item.title, item.patternName, item.hostName, item.summary, ...(item.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [
    activeCompanions,
    activeTab,
    activityFilter,
    archivedCompanions,
    companions,
    roleFilter,
    roomStatusFilter,
    searchText,
  ]);

  const sortedWorks = useMemo(() => {
    const base = [...searchedWorks];
    return base.sort((a, b) => {
      if (sortOption === "이름순") {
        return a.title.localeCompare(b.title, "ko");
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [searchedWorks, sortOption]);

  const sortedCompanions = useMemo(() => {
    const base = [...searchedCompanions];
    return base.sort((a, b) => {
      if (sortOption === "이름순") {
        return a.title.localeCompare(b.title, "ko");
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [searchedCompanions, sortOption]);

  const summary = useMemo(() => {
    const completedWorkCount = works.filter((item) => item.progress === "완성").length;
    const activeCompanionCount = companions.filter((item) => !item.isArchived).length;
    const graduatedCompanionCount = companions.filter((item) => item.isArchived).length;

    return {
      workCount: works.length,
      completedWorkCount,
      activeCompanionCount,
      graduatedCompanionCount,
    };
  }, [companions, works]);

  const recruitingCompanions = useMemo(
    () => companions.filter((item) => !item.isArchived && item.status === "모집중").slice(0, 4),
    [companions]
  );

  const recentUpdates = useMemo(() => {
    const workUpdates = works.map((work) => ({
      id: `work-${work.id}`,
      title: work.title,
      kind: "작품",
      date: work.updatedAt,
      href: `/my-work/${work.id}`,
      status: work.progress,
    }));

    const companionUpdates = companions.map((room) => ({
      id: `companion-${room.id}`,
      title: room.title,
      kind: "동행",
      date: room.createdAt,
      href: `/companion/${room.id}`,
      status: getActivityLabel(room.myActivity),
    }));

    return [...workUpdates, ...companionUpdates]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [companions, works]);

  function resetForm() {
    setTitle("");
    setProgress("진행 중");
    setYarn("");
    setNote("");
  }

  function handleCancelAdd() {
    setIsAdding(false);
    resetForm();
  }

  function upsertLocalWork(item: StoredWorkItem) {
    const nextLocalItems = readStoredWorkItems();
    const index = nextLocalItems.findIndex((stored) => stored.id === item.id);
    const localItem = { ...item, source: "local" as const };

    if (index >= 0) {
      nextLocalItems[index] = localItem;
    } else {
      nextLocalItems.unshift(localItem);
    }

    writeStoredWorkItems(nextLocalItems);
    setWorks(mergeStoredAndSeedWorkItems(nextLocalItems, seedWorkItems));
  }

  function handleSubmitWork() {
    const trimmedTitle = title.trim();
    const trimmedYarn = yarn.trim();
    const trimmedNote = note.trim();

    if (!trimmedTitle || !trimmedYarn || !trimmedNote) {
      alert("작품명, 사용 실, 메모를 모두 입력해 주세요.");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
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
      checklist: ["새 작품 생성", "다음 단계 계획 세우기"],
      source: "local",
    };

    upsertLocalWork(newWork);
    setActiveTab("진행중");
    handleCancelAdd();
  }

  function handleChangeProgress(work: StoredWorkItem, nextProgress: WorkProgress) {
    const updated: StoredWorkItem = {
      ...work,
      progress: nextProgress,
      updatedAt: new Date().toISOString().slice(0, 10),
      source: "local",
    };
    upsertLocalWork(updated);
  }

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
                    내 작품 기록과 참여 동행을 한 번에 모아보고, 완성한 작품과 졸업한 동행까지
                    보관하는 개인 아카이브예요.
                  </p>
                </div>
                <div className={`${styles.heroActions} ${styles.heroActionsInline}`}>
                  <button
                    type="button"
                    onClick={() => setIsAdding((prev) => !prev)}
                    className={styles.primaryAction}
                  >
                    {isAdding ? "추가 닫기" : "작품 추가"}
                  </button>
                </div>
              </div>
            </section>

            <section className={styles.toolbarCard}>
          <div className={styles.tabRow}>
            {(["진행중", "보관함", "동행기록"] as DrawerTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={activeTab === tab ? styles.tabButtonActive : styles.tabButton}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className={styles.searchRow}>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="작품명, 실 이름, 동행 제목으로 검색"
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

          {activeTab === "동행기록" ? (
            <div className={styles.filterRow}>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                className={styles.filterSelect}
              >
                <option value="전체">역할 전체</option>
                <option value="진행자">진행자</option>
                <option value="참여자">참여자</option>
              </select>
              <select
                value={roomStatusFilter}
                onChange={(event) => setRoomStatusFilter(event.target.value as RoomStatusFilter)}
                className={styles.filterSelect}
              >
                <option value="전체">방 상태 전체</option>
                <option value="모집중">모집중</option>
                <option value="진행중">진행중</option>
              </select>
              <select
                value={activityFilter}
                onChange={(event) => setActivityFilter(event.target.value as ActivityFilter)}
                className={styles.filterSelect}
              >
                <option value="전체">참여 상태 전체</option>
                <option value="활동중">활동중</option>
                <option value="쉬는중">쉬는중</option>
                <option value="졸업">졸업</option>
              </select>
            </div>
          ) : null}
            </section>

        <section className={styles.actionRow}>
          <Link href="/companion/new" className={styles.secondaryAction}>
            동행 만들기
          </Link>
          <Link href="/companion" className={styles.secondaryAction}>
            동행 둘러보기
          </Link>
        </section>

        {isAdding ? (
          <section className={styles.formCard}>
            <div className={styles.formGrid}>
              <label className={styles.labelBlock}>
                <span className={styles.label}>작품명</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="예: 리본 머플러"
                  className={styles.input}
                />
              </label>
              <label className={styles.labelBlock}>
                <span className={styles.label}>상태</span>
                <select
                  value={progress}
                  onChange={(event) => setProgress(event.target.value as WorkProgress)}
                  className={styles.select}
                >
                  <option value="진행 중">진행 중</option>
                  <option value="완성">완성</option>
                  <option value="중단">중단</option>
                </select>
              </label>
            </div>
            <label className={styles.labelBlock}>
              <span className={styles.label}>사용 실</span>
              <input
                value={yarn}
                onChange={(event) => setYarn(event.target.value)}
                placeholder="예: 코튼 실 / 메리노 혼방"
                className={styles.input}
              />
            </label>
            <label className={styles.labelBlock}>
              <span className={styles.label}>메모</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="작업 중 기억할 내용을 남겨 주세요."
                rows={4}
                className={styles.textarea}
              />
            </label>
            <div className={styles.formActionRow}>
              <button type="button" onClick={handleSubmitWork} className={styles.primaryAction}>
                등록하기
              </button>
              <button type="button" onClick={handleCancelAdd} className={styles.secondaryAction}>
                취소
              </button>
            </div>
          </section>
        ) : null}

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              {activeTab === "진행중"
                ? "진행 중인 작품과 동행"
                : activeTab === "보관함"
                  ? "보관된 기록"
                  : "참여 동행 기록"}
            </h2>
            <p className={styles.sectionDescription}>
              {activeTab === "진행중"
                ? "지금 진행하는 작업 흐름을 빠르게 확인할 수 있어요."
                : activeTab === "보관함"
                  ? "완성 작품과 졸업한 동행을 모아보는 아카이브예요."
                  : "내 역할/상태 기준으로 동행 기록을 정리해요."}
            </p>
          </div>

          <div className={styles.boardGrid}>
            <div className={styles.column}>
              <h3 className={styles.columnTitle}>작품</h3>
              {sortedWorks.length > 0 ? (
                sortedWorks.map((work) => (
                  <article key={work.id} className={styles.itemCard}>
                    <div className={styles.itemTop}>
                      <div>
                        <h4 className={styles.itemTitle}>{work.title}</h4>
                        <p className={styles.itemMeta}>업데이트 {formatDate(work.updatedAt)}</p>
                      </div>
                      <span className={[styles.badge, getWorkBadgeClass(work.progress)].join(" ")}>
                        {work.progress}
                      </span>
                    </div>
                    <p className={styles.itemDescription}>{work.note}</p>
                    <div className={styles.itemBottom}>
                      <span className={styles.metaChip}>실 {work.yarn}</span>
                      <select
                        value={work.progress}
                        onChange={(event) => handleChangeProgress(work, event.target.value as WorkProgress)}
                        className={styles.inlineSelect}
                      >
                        <option value="진행 중">진행 중</option>
                        <option value="완성">완성</option>
                        <option value="중단">중단</option>
                      </select>
                      <Link href={`/my-work/${work.id}`} className={styles.linkAction}>
                        상세
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <div className={styles.emptyCard}>표시할 작품이 없어요.</div>
              )}
            </div>

            <div className={styles.column}>
              <h3 className={styles.columnTitle}>동행</h3>
              {!isLoggedIn ? (
                <div className={styles.emptyCard}>
                  로그인 후 참여한 동행을 작품서랍에서 함께 볼 수 있어요.
                  <Link href="/login?returnTo=%2Fmy-work" className={styles.linkInline}>
                    로그인하기
                  </Link>
                </div>
              ) : isCompanionLoading ? (
                <div className={styles.emptyCard}>동행 기록을 불러오는 중이에요.</div>
              ) : sortedCompanions.length > 0 ? (
                sortedCompanions.map((room) => (
                  <article key={room.id} className={styles.itemCard}>
                    <div className={styles.itemTop}>
                      <div>
                        <h4 className={styles.itemTitle}>{room.title}</h4>
                        <p className={styles.itemMeta}>
                          {room.myRole} · {formatDate(room.joinedAt)}
                        </p>
                      </div>
                      <span className={[styles.badge, getActivityBadgeClass(room.myActivity)].join(" ")}>
                        {getActivityLabel(room.myActivity)}
                      </span>
                    </div>
                    <p className={styles.itemDescription}>{room.summary}</p>
                    <div className={styles.itemBottom}>
                      <span className={styles.metaChip}>{room.status}</span>
                      <span className={styles.metaChip}>{room.patternName}</span>
                      <Link href={`/companion/${room.id}`} className={styles.linkAction}>
                        이동
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <div className={styles.emptyCard}>조건에 맞는 동행 기록이 없어요.</div>
              )}
            </div>
          </div>
        </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.sidePanel}>
              <h3 className={styles.sideTitle}>서랍 요약</h3>
              <div className={styles.sideStatList}>
                <div className={styles.sideStatRow}>
                  <span>전체 작품</span>
                  <strong>{summary.workCount}</strong>
                </div>
                <div className={styles.sideStatRow}>
                  <span>완성 작품</span>
                  <strong>{summary.completedWorkCount}</strong>
                </div>
                <div className={styles.sideStatRow}>
                  <span>진행 동행</span>
                  <strong>{summary.activeCompanionCount}</strong>
                </div>
                <div className={styles.sideStatRow}>
                  <span>졸업 동행</span>
                  <strong>{summary.graduatedCompanionCount}</strong>
                </div>
              </div>
            </section>

            <section className={styles.sidePanel}>
              <h3 className={styles.sideTitle}>모집중 동행</h3>
              <div className={styles.sideList}>
                {recruitingCompanions.length > 0 ? (
                  recruitingCompanions.map((room) => (
                    <Link key={room.id} href={`/companion/${room.id}`} className={styles.sideListItem}>
                      <div className={styles.sideListTop}>
                        <span className={styles.sideListBadge}>모집중</span>
                        <span className={styles.sideListMeta}>
                          {room.participantCount}/{room.capacity}
                        </span>
                      </div>
                      <p className={styles.sideListTitle}>{room.title}</p>
                    </Link>
                  ))
                ) : (
                  <p className={styles.sideEmpty}>현재 모집중인 내 동행이 없어요.</p>
                )}
              </div>
            </section>

            <section className={styles.sidePanel}>
              <h3 className={styles.sideTitle}>최근 업데이트</h3>
              <div className={styles.sideList}>
                {recentUpdates.length > 0 ? (
                  recentUpdates.map((item) => (
                    <Link key={item.id} href={item.href} className={styles.sideListItem}>
                      <div className={styles.sideListTop}>
                        <span className={styles.sideListKind}>{item.kind}</span>
                        <span className={styles.sideListMeta}>{formatDate(item.date)}</span>
                      </div>
                      <p className={styles.sideListTitle}>{item.title}</p>
                      <p className={styles.sideListStatus}>{item.status}</p>
                    </Link>
                  ))
                ) : (
                  <p className={styles.sideEmpty}>최근 업데이트가 없어요.</p>
                )}
              </div>
            </section>

            <section className={styles.sidePanel}>
              <h3 className={styles.sideTitle}>빠른 실행</h3>
              <div className={styles.sideActionList}>
                <button type="button" onClick={() => setIsAdding(true)} className={styles.primaryAction}>
                  작품 추가
                </button>
                <Link href="/companion/new" className={styles.secondaryAction}>
                  동행 만들기
                </Link>
                <Link href="/companion/mine" className={styles.secondaryAction}>
                  나와의 동행
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
