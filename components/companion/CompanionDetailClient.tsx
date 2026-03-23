"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { getCompanionRoomById } from "@/data/companion";
import LoginRequiredModal from "@/components/auth/LoginRequiredModal";
import { normalizeDetailRows } from "@/lib/pattern-detail";
import {
  createDefaultCompanionRoomState,
  customCompanionRoomsStorageKey,
  deserializeCompanionRoomState,
  deserializeCompanionRooms,
  formatCompanionMembers,
  formatCompanionSchedule,
  getCompanionRoomStateStorageKey,
  isCompanionRecruitingOpen,
  mapCompanionRoom,
  mapCompanionThreadType,
  serializeCompanionRoomState,
  type CompanionCheckInRow,
  type CompanionNoticeRow,
  type CompanionParticipant,
  type CompanionRoom,
  type CompanionRoomRow,
  type CompanionRoomState,
  type CompanionSupplyCheckRow,
  type CompanionSupplyRow,
  type CompanionThreadRow,
} from "@/lib/companion";
import { createClient } from "@/lib/supabase/client";
import { getPatternImageUrl, type PatternItem } from "@/lib/patterns";
import styles from "@/app/companion/[id]/page.module.css";

const copyrightPolicyRows = [
  { key: "copyright_hobby_only", label: "취미 제작" },
  { key: "copyright_color_variation", label: "색상 변형" },
  { key: "copyright_size_variation", label: "사이즈 변형" },
  { key: "copyright_commercial_use", label: "상업적 사용" },
  { key: "copyright_redistribution", label: "도안 재배포" },
  { key: "copyright_modification_resale", label: "수정본 판매" },
] as const;

function getStatusClassName(room: CompanionRoom) {
  if (room.status === "모집중") return styles.statusRecruiting;
  if (room.status === "곧 시작") return styles.statusSoon;
  if (room.status === "진행중") return styles.statusProgress;

  return styles.statusDone;
}

function parsePatternSize(sizeText: string) {
  const widthMatch = sizeText.match(/가로\s*(\d+)/);
  const heightMatch = sizeText.match(/세로\s*(\d+)/);
  const gaugeStitchesMatch = sizeText.match(/게이지\s*:\s*(\d+)코/);
  const gaugeRowsMatch = sizeText.match(/x\s*(\d+)단/);

  return {
    sizeText:
      widthMatch || heightMatch
        ? `가로 ${widthMatch?.[1] ?? "0"}cm x 세로 ${heightMatch?.[1] ?? "0"}cm`
        : "",
    gaugeText:
      gaugeStitchesMatch || gaugeRowsMatch
        ? `${gaugeStitchesMatch?.[1] ?? "0"}코 x ${gaugeRowsMatch?.[1] ?? "0"}단`
        : "",
  };
}

export default function CompanionDetailClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const roomId = params.id;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<CompanionRoom | null>(null);
  const [linkedPattern, setLinkedPattern] = useState<PatternItem | null>(null);
  const [roomState, setRoomState] = useState<CompanionRoomState | null>(null);
  const [hasLoadedRooms, setHasLoadedRooms] = useState(false);
  const [isStateReady, setIsStateReady] = useState(false);
  const [isDbRoom, setIsDbRoom] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [activePanel, setActivePanel] = useState<"overview" | "pattern" | "supplies" | "qna" | "checkin">(
    "overview"
  );
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");
  const [threadInput, setThreadInput] = useState("");
  const [checkInTitle, setCheckInTitle] = useState("");
  const [checkInContent, setCheckInContent] = useState("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id ?? null);
      setCurrentUserName(
        (user?.user_metadata?.nickname as string | undefined) ??
          (user?.user_metadata?.name as string | undefined) ??
          user?.email?.split("@")[0] ??
          null
      );
    }

    void loadUser();
  }, [supabase]);

  useEffect(() => {
    async function loadRoomDetail() {
      setIsStateReady(false);
      setLinkedPattern(null);

      const { data: roomRow } = await supabase
        .from("companion_rooms")
        .select("*")
        .eq("id", roomId)
        .maybeSingle();

      if (roomRow) {
        const dbRoomRow = roomRow as CompanionRoomRow;
        const [
          profilesResult,
          participantsResult,
          noticesResult,
          suppliesResult,
          threadsResult,
          checkInsResult,
        ] = await Promise.all([
          dbRoomRow.host_user_id
            ? supabase.from("profiles").select("id, nickname").eq("id", dbRoomRow.host_user_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from("companion_participants")
            .select("*")
            .eq("room_id", roomId)
            .order("joined_at", { ascending: true }),
          supabase
            .from("companion_notices")
            .select("*")
            .eq("room_id", roomId)
            .order("created_at", { ascending: false }),
          supabase
            .from("companion_supplies")
            .select("*")
            .eq("room_id", roomId)
            .order("sort_order", { ascending: true }),
          supabase
            .from("companion_threads")
            .select("*")
            .eq("room_id", roomId)
            .order("created_at", { ascending: false }),
          supabase
            .from("companion_checkins")
            .select("*")
            .eq("room_id", roomId)
            .order("created_at", { ascending: false }),
        ]);

        const participantRows =
          (((participantsResult.data ?? []) as Array<{
            id: string;
            room_id: string;
            user_id: string;
            role: "host" | "participant";
          }>) ?? []);
        const threadRows = ((threadsResult.data ?? []) as CompanionThreadRow[]) ?? [];
        const checkInRows = ((checkInsResult.data ?? []) as CompanionCheckInRow[]) ?? [];
        const noticeRows = ((noticesResult.data ?? []) as CompanionNoticeRow[]) ?? [];
        const supplyRows = ((suppliesResult.data ?? []) as CompanionSupplyRow[]) ?? [];

        const authorIds = Array.from(
          new Set([
            ...participantRows.map((row) => row.user_id),
            ...threadRows.map((row) => row.author_user_id),
            ...checkInRows.map((row) => row.author_user_id),
            ...noticeRows.map((row) => row.author_user_id),
          ].filter(Boolean))
        );

        let nicknameMap = new Map<string, string | null>();

        if (authorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, nickname")
            .in("id", authorIds);

          nicknameMap = new Map(
            ((profiles ?? []) as Array<{ id: string; nickname: string | null }>).map((profile) => [
              profile.id,
              profile.nickname,
            ])
          );
        }

        let checkedSupplyIds = new Set<string>();

        if (currentUserId && supplyRows.length > 0) {
          const { data: checkedRows } = await supabase
            .from("companion_supply_checks")
            .select("supply_id, user_id")
            .eq("user_id", currentUserId)
            .in(
              "supply_id",
              supplyRows.map((row) => row.id)
            );

          checkedSupplyIds = new Set(
            ((((checkedRows ?? []) as CompanionSupplyCheckRow[]) ?? []).map((row) => row.supply_id))
          );
        }

        const room = mapCompanionRoom(dbRoomRow, {
          hostName:
            (profilesResult.data as { id: string; nickname: string | null } | null)?.nickname ??
            (dbRoomRow.host_user_id ? nicknameMap.get(dbRoomRow.host_user_id) ?? "진행자" : "진행자"),
        });

        if (dbRoomRow.pattern_id) {
          const { data: patternRow } = await supabase
            .from("patterns")
            .select("*")
            .eq("id", dbRoomRow.pattern_id)
            .maybeSingle();

          setLinkedPattern((patternRow as PatternItem | null) ?? null);
        }

        const participants: CompanionParticipant[] = participantRows.map((participant) => ({
          id: participant.id,
          name: nicknameMap.get(participant.user_id) ?? "참여자",
          role: participant.role === "host" ? "진행자" : "참여중",
        }));

        setCurrentRoom({
          ...room,
          participantCount: participants.length,
        });
        setRoomState({
          participants,
          notices: noticeRows.map((notice) => `${notice.title} - ${notice.content}`),
          supplies: supplyRows.map((supply) => ({
            id: supply.id,
            label: supply.label,
            checked: checkedSupplyIds.has(supply.id),
          })),
          threads: threadRows.map((thread) => ({
            id: thread.id,
            type: mapCompanionThreadType(thread.type),
            author: nicknameMap.get(thread.author_user_id) ?? "참여자",
            content: thread.content,
            createdAt: thread.created_at,
          })),
          checkIns: checkInRows.map((checkIn) => ({
            id: checkIn.id,
            title: checkIn.title,
            content: checkIn.content,
            author: nicknameMap.get(checkIn.author_user_id) ?? "참여자",
            createdAt: checkIn.created_at,
          })),
        });
        setIsDbRoom(true);
        setHasLoadedRooms(true);
        setIsStateReady(true);
        return;
      }

      if (typeof window !== "undefined") {
        const customRooms = deserializeCompanionRooms(
          window.localStorage.getItem(customCompanionRoomsStorageKey)
        );
        const localRoom =
          customRooms.find((item) => item.id === roomId) ?? getCompanionRoomById(roomId) ?? null;

        if (localRoom) {
          const storageKey = getCompanionRoomStateStorageKey(localRoom.id);
          const fallback = createDefaultCompanionRoomState(localRoom);
          setCurrentRoom(localRoom);
          setLinkedPattern(null);
          setRoomState(
            deserializeCompanionRoomState(window.localStorage.getItem(storageKey), fallback)
          );
        } else {
          setCurrentRoom(null);
          setRoomState(null);
        }
      } else {
        setCurrentRoom(null);
        setRoomState(null);
      }

      setIsDbRoom(false);
      setHasLoadedRooms(true);
      setIsStateReady(true);
    }

    void loadRoomDetail();
  }, [currentUserId, reloadToken, roomId, supabase]);

  function persistLocalState(nextState: CompanionRoomState) {
    if (!currentRoom || typeof window === "undefined") return;

    window.localStorage.setItem(
      getCompanionRoomStateStorageKey(currentRoom.id),
      serializeCompanionRoomState(nextState)
    );
    setRoomState(nextState);
    setCurrentRoom({
      ...currentRoom,
      participantCount: nextState.participants.length,
    });
  }

  const isJoined = useMemo(() => {
    if (!roomState || !currentUserName) return false;

    return roomState.participants.some((participant) => participant.name === currentUserName);
  }, [currentUserName, roomState]);
  const isHost = Boolean(currentUserId && currentRoom?.hostUserId && currentRoom.hostUserId === currentUserId);
  const canAccessMemberPanels = isJoined || isHost;
  const visiblePanel =
    activePanel === "pattern" || canAccessMemberPanels ? activePanel : "overview";
  const isRecruitingOpen = currentRoom ? isCompanionRecruitingOpen(currentRoom.recruitUntil) : false;
  const patternPreview = useMemo(() => {
    if (!currentRoom) return null;

    if (currentRoom.patternSourceType === "site" && linkedPattern) {
      const parsedSize = parsePatternSize(linkedPattern.size || "");
      const detailRows = normalizeDetailRows(linkedPattern.detail_rows, linkedPattern.detail_content).filter(
        (row) => row.instruction
      );

      return {
        title: linkedPattern.title,
        description: linkedPattern.description || "설명이 아직 등록되지 않았어요.",
        imageUrl: linkedPattern.image_path ? getPatternImageUrl(linkedPattern.image_path) : "",
        heroMeta: [
          { label: linkedPattern.level, tone: "level" as const },
          { label: linkedPattern.category, tone: "category" as const },
          { label: `작성자 ${linkedPattern.author_nickname ?? "닉네임 없음"}`, tone: "muted" as const },
        ],
        overviewRows: [
          { label: "난이도", value: linkedPattern.level },
          { label: "카테고리", value: linkedPattern.category },
          {
            label: "태그",
            value: linkedPattern.tags?.length ? linkedPattern.tags.map((tag) => `#${tag}`).join(", ") : "-",
          },
        ],
        prepRows: [
          { label: "사용 실", value: linkedPattern.yarn || "-" },
          { label: "바늘", value: linkedPattern.needle || "-" },
          { label: "총량", value: linkedPattern.total_yarn_amount || "-" },
          { label: "소요 시간", value: linkedPattern.duration || "-" },
          { label: "완성 크기", value: parsedSize.sizeText || "-" },
          { label: "게이지", value: parsedSize.gaugeText || "-" },
        ],
        policyRows: [
          { label: "원작자", value: linkedPattern.copyright_source || "-" },
          ...copyrightPolicyRows.map((policy) => ({
            label: policy.label,
            value: linkedPattern[policy.key] ? "O" : "X",
          })),
        ],
        detailRows,
        linkHref: `/patterns/${linkedPattern.id}`,
        linkLabel: "도안 상세 보기",
        externalUrl: null as string | null,
        externalLabel: null as string | null,
      };
    }

    if (currentRoom.patternSourceType === "custom" && currentRoom.customPatternData) {
      const pattern = currentRoom.customPatternData;
      const parsedSize = parsePatternSize(pattern.size || "");
      const detailRows = normalizeDetailRows(pattern.detailRows ?? null, pattern.detailContent ?? null).filter(
        (row) => row.instruction
      );

      return {
        title: pattern.title,
        description: pattern.description || "설명이 아직 등록되지 않았어요.",
        imageUrl: pattern.imagePath ? getPatternImageUrl(pattern.imagePath) : "",
        heroMeta: [
          { label: pattern.level, tone: "level" as const },
          { label: pattern.category, tone: "category" as const },
          { label: "동행 전용 도안", tone: "muted" as const },
        ],
        overviewRows: [
          { label: "난이도", value: pattern.level },
          { label: "카테고리", value: pattern.category },
          { label: "태그", value: pattern.tags.length ? pattern.tags.map((tag) => `#${tag}`).join(", ") : "-" },
        ],
        prepRows: [
          { label: "사용 실", value: pattern.yarn || "-" },
          { label: "바늘", value: pattern.needle || "-" },
          { label: "총량", value: pattern.totalYarnAmount || "-" },
          { label: "소요 시간", value: pattern.duration || "-" },
          { label: "완성 크기", value: parsedSize.sizeText || "-" },
          { label: "게이지", value: parsedSize.gaugeText || "-" },
        ],
        policyRows: [
          { label: "원작자", value: pattern.copyrightSource || "-" },
          { label: "취미 제작", value: pattern.copyrightHobbyOnly ? "O" : "X" },
          { label: "색상 변형", value: pattern.copyrightColorVariation ? "O" : "X" },
          { label: "사이즈 변형", value: pattern.copyrightSizeVariation ? "O" : "X" },
          { label: "상업적 사용", value: pattern.copyrightCommercialUse ? "O" : "X" },
          { label: "도안 재배포", value: pattern.copyrightRedistribution ? "O" : "X" },
          { label: "수정본 판매", value: pattern.copyrightModificationResale ? "O" : "X" },
        ],
        detailRows,
        linkHref: null as string | null,
        linkLabel: null as string | null,
        externalUrl: null as string | null,
        externalLabel: null as string | null,
      };
    }

    if (currentRoom.patternSourceType === "external") {
      return {
        title: currentRoom.patternName,
        description: "외부 링크로 연결된 도안이에요. 원문 페이지에서 자세한 안내와 파일을 확인할 수 있어요.",
        imageUrl: "",
        heroMeta: [
          { label: currentRoom.level, tone: "level" as const },
          { label: "외부 링크", tone: "category" as const },
          { label: "동행 전용 연결", tone: "muted" as const },
        ],
        overviewRows: [
          { label: "도안명", value: currentRoom.patternName || "-" },
          { label: "연결 방식", value: "외부 링크" },
          { label: "모집 상태", value: currentRoom.status },
        ],
        prepRows: [] as Array<{ label: string; value: string }>,
        policyRows: [] as Array<{ label: string; value: string }>,
        detailRows: [] as Array<{ id: string; rowNumber: number; instruction: string }>,
        linkHref: null as string | null,
        linkLabel: null as string | null,
        externalUrl: currentRoom.patternExternalUrl ?? null,
        externalLabel: "외부 도안 열기",
      };
    }

    return null;
  }, [currentRoom, linkedPattern]);

  const filteredThreads = useMemo(() => {
    if (!roomState) return [];

    return roomState.threads
      .filter((thread) => thread.type === "질문")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [roomState]);

  async function handleJoinToggle() {
    if (!currentRoom || !roomState) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !currentUserName) {
      setIsLoginModalOpen(true);
      return;
    }

    if (currentRoom.hostUserId && currentRoom.hostUserId === user.id) {
      alert("진행자는 자신의 방에서 나갈 수 없어요.");
      return;
    }

    if (isDbRoom) {
      if (!isJoined && !isRecruitingOpen) {
        alert("모집 기간이 지나서 더 이상 참가 신청할 수 없어요.");
        return;
      }

      if (isJoined) {
        const { error } = await supabase
          .from("companion_participants")
          .delete()
          .eq("room_id", currentRoom.id)
          .eq("user_id", user.id);

        if (error) {
          alert(error.message);
          return;
        }
      } else {
        const { error } = await supabase.from("companion_participants").insert({
          room_id: currentRoom.id,
          user_id: user.id,
          role: "participant",
        });

        if (error) {
          alert(error.message);
          return;
        }
      }

      setReloadToken((current) => current + 1);
      return;
    }

    if (!isJoined && !isRecruitingOpen) {
      alert("모집 기간이 지나서 더 이상 참가 신청할 수 없어요.");
      return;
    }

    const nextParticipants = isJoined
      ? roomState.participants.filter((participant) => participant.name !== currentUserName)
      : [
          ...roomState.participants,
          {
            id: `${currentRoom.id}-${user.id}`,
            name: currentUserName,
            role: "참여중" as const,
          },
        ];

    persistLocalState({
      ...roomState,
      participants: nextParticipants,
    });
  }

  async function handleSupplyToggle(supplyId: string) {
    if (!currentRoom || !roomState) return;

    const currentSupply = roomState.supplies.find((supply) => supply.id === supplyId);
    if (!currentSupply) return;

    if (isDbRoom) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("로그인 후 준비물 체크를 사용할 수 있어요.");
        router.push(`/login?returnTo=%2Fcompanion%2F${currentRoom.id}`);
        return;
      }

      if (currentSupply.checked) {
        const { error } = await supabase
          .from("companion_supply_checks")
          .delete()
          .eq("supply_id", supplyId)
          .eq("user_id", user.id);

        if (error) {
          alert(error.message);
          return;
        }
      } else {
        const { error } = await supabase.from("companion_supply_checks").insert({
          supply_id: supplyId,
          user_id: user.id,
        });

        if (error) {
          alert(error.message);
          return;
        }
      }

      setRoomState({
        ...roomState,
        supplies: roomState.supplies.map((supply) =>
          supply.id === supplyId ? { ...supply, checked: !supply.checked } : supply
        ),
      });
      return;
    }

    persistLocalState({
      ...roomState,
      supplies: roomState.supplies.map((supply) =>
        supply.id === supplyId ? { ...supply, checked: !supply.checked } : supply
      ),
    });
  }

  async function handleThreadSubmit() {
    if (!currentRoom || !roomState || !threadInput.trim()) return;

    if (isDbRoom) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("로그인 후 글을 남길 수 있어요.");
        router.push(`/login?returnTo=%2Fcompanion%2F${currentRoom.id}`);
        return;
      }

      const { error } = await supabase.from("companion_threads").insert({
        room_id: currentRoom.id,
        author_user_id: user.id,
        type: "question",
        content: threadInput.trim(),
      });

      if (error) {
        alert(error.message);
        return;
      }

      setThreadInput("");
      setReloadToken((current) => current + 1);
      return;
    }

    persistLocalState({
      ...roomState,
      threads: [
        {
          id: `${currentRoom.id}-thread-${Date.now()}`,
          type: "질문",
          author: currentUserName ?? "게스트",
          content: threadInput.trim(),
          createdAt: new Date().toISOString(),
        },
        ...roomState.threads,
      ],
    });
    setThreadInput("");
  }

  async function handleNoticeSubmit() {
    if (!currentRoom || !roomState || !noticeTitle.trim() || !noticeContent.trim()) return;

    if (!isHost) {
      alert("공지 작성은 진행자만 사용할 수 있어요.");
      return;
    }

    if (isDbRoom) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("로그인 후 공지를 작성할 수 있어요.");
        router.push(`/login?returnTo=%2Fcompanion%2F${currentRoom.id}`);
        return;
      }

      const { error } = await supabase.from("companion_notices").insert({
        room_id: currentRoom.id,
        author_user_id: user.id,
        title: noticeTitle.trim(),
        content: noticeContent.trim(),
        is_pinned: true,
      });

      if (error) {
        alert(error.message);
        return;
      }

      setNoticeTitle("");
      setNoticeContent("");
      setReloadToken((current) => current + 1);
      return;
    }

    persistLocalState({
      ...roomState,
      notices: [`${noticeTitle.trim()} - ${noticeContent.trim()}`, ...roomState.notices],
    });
    setNoticeTitle("");
    setNoticeContent("");
  }

  async function handleCheckInSubmit() {
    if (!currentRoom || !roomState || !checkInTitle.trim() || !checkInContent.trim()) return;

    if (isDbRoom) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("로그인 후 체크인을 남길 수 있어요.");
        router.push(`/login?returnTo=%2Fcompanion%2F${currentRoom.id}`);
        return;
      }

      const { error } = await supabase.from("companion_checkins").insert({
        room_id: currentRoom.id,
        author_user_id: user.id,
        title: checkInTitle.trim(),
        content: checkInContent.trim(),
      });

      if (error) {
        alert(error.message);
        return;
      }

      setCheckInTitle("");
      setCheckInContent("");
      setReloadToken((current) => current + 1);
      return;
    }

    persistLocalState({
      ...roomState,
      checkIns: [
        {
          id: `${currentRoom.id}-checkin-${Date.now()}`,
          title: checkInTitle.trim(),
          content: checkInContent.trim(),
          author: currentUserName ?? "게스트",
          createdAt: new Date().toISOString(),
        },
        ...roomState.checkIns,
      ],
    });
    setCheckInTitle("");
    setCheckInContent("");
  }

  if (!hasLoadedRooms || !isStateReady) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.eyebrow}>Companion Room</span>
        <h1 className={styles.emptyTitle}>동행방을 불러오는 중이에요</h1>
        <p className={styles.emptyDescription}>상세 정보를 준비하고 있어요.</p>
      </div>
    );
  }

  if (!currentRoom || !roomState) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.eyebrow}>Companion Room</span>
        <h1 className={styles.emptyTitle}>동행방을 찾을 수 없어요</h1>
        <p className={styles.emptyDescription}>
          삭제되었거나 아직 이 기기에서 불러오지 못한 방일 수 있어요.
        </p>
        <Link href="/companion" className={styles.primaryAction}>
          동행 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <>
      <LoginRequiredModal
        open={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        title="참여 신청은 로그인 후 사용할 수 있어요"
        description="로그인하면 이 동행방에 참여 신청하고 이후 일정도 바로 확인할 수 있어요."
      />
      <div className={styles.shell}>
        <section className={styles.hero}>
        <div className={styles.heroHeader}>
          <div>
            <div className={styles.topRow}>
              <span className={getStatusClassName(currentRoom)}>{currentRoom.status}</span>
              <span className={styles.patternName}>{currentRoom.patternName}</span>
            </div>
            <h1 className={styles.title}>{currentRoom.title}</h1>
            <p className={styles.description}>{currentRoom.summary}</p>
          </div>

          <div className={styles.heroActions}>
            <button type="button" className={styles.primaryAction} onClick={handleJoinToggle}>
              {isJoined ? "참여 취소" : isRecruitingOpen ? "참여 신청" : "모집 마감"}
            </button>
            <Link href="/companion" className={styles.secondaryAction}>
              목록 보기
            </Link>
          </div>
        </div>

        <div className={styles.infoGrid}>
          <article className={styles.infoCard}>
            <span className={styles.infoLabel}>진행자</span>
            <strong>{currentRoom.hostName}</strong>
          </article>
          <article className={styles.infoCard}>
            <span className={styles.infoLabel}>일정</span>
            <strong>{formatCompanionSchedule(currentRoom)}</strong>
          </article>
          <article className={styles.infoCard}>
            <span className={styles.infoLabel}>모집 마감</span>
            <strong>{currentRoom.recruitUntil}</strong>
          </article>
          <article className={styles.infoCard}>
            <span className={styles.infoLabel}>참여 인원</span>
            <strong>{formatCompanionMembers(currentRoom)}</strong>
          </article>
        </div>

        <div className={styles.tagList}>
          {currentRoom.tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              #{tag}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.workspace}>
        <div className={styles.mainColumn}>
          <section className={styles.sectionCard}>
            <div className={styles.panelTabRow}>
              <button
                type="button"
                className={visiblePanel === "overview" ? styles.indexTabActive : styles.indexTab}
                onClick={() => setActivePanel("overview")}
              >
                안내
              </button>
              <button
                type="button"
                className={visiblePanel === "pattern" ? styles.indexTabActive : styles.indexTab}
                onClick={() => setActivePanel("pattern")}
              >
                연결 도안
              </button>
              {canAccessMemberPanels ? (
                <>
                  <button
                    type="button"
                    className={visiblePanel === "supplies" ? styles.indexTabActive : styles.indexTab}
                    onClick={() => setActivePanel("supplies")}
                  >
                    준비물
                  </button>
                  <button
                    type="button"
                    className={visiblePanel === "qna" ? styles.indexTabActive : styles.indexTab}
                    onClick={() => setActivePanel("qna")}
                  >
                    질의응답
                  </button>
                  <button
                    type="button"
                    className={visiblePanel === "checkin" ? styles.indexTabActive : styles.indexTab}
                    onClick={() => setActivePanel("checkin")}
                  >
                    진행 기록
                  </button>
                </>
              ) : null}
            </div>
            {!canAccessMemberPanels ? (
              <p className={styles.panelLockMessage}>
                이 동행방에 참여한 뒤에만 `준비물`, `질의응답`, `진행 기록`을 볼 수 있어요.
              </p>
            ) : null}

            {visiblePanel === "overview" ? (
              <div className={styles.panelStack}>
                <section className={styles.innerSection}>
                  <div className={styles.sectionHead}>
                    <span className={styles.sectionEyebrow}>Pinned Notice</span>
                    <h2 className={styles.sectionTitle}>공지와 진행 안내</h2>
                  </div>
                  {isHost ? (
                    <div className={styles.composer}>
                      <input
                        className={styles.input}
                        value={noticeTitle}
                        onChange={(event) => setNoticeTitle(event.target.value)}
                        placeholder="공지 제목"
                      />
                      <textarea
                        className={styles.textarea}
                        value={noticeContent}
                        onChange={(event) => setNoticeContent(event.target.value)}
                        placeholder="참여자에게 안내할 공지 내용을 적어주세요."
                      />
                      <button type="button" className={styles.secondaryAction} onClick={() => void handleNoticeSubmit()}>
                        공지 등록
                      </button>
                    </div>
                  ) : null}
                  <ul className={styles.noticeList}>
                    {roomState.notices.map((notice) => (
                      <li key={notice} className={styles.noticeItem}>
                        {notice}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            ) : null}

            {visiblePanel === "pattern" ? (
              <div className={styles.panelStack}>
                <section className={styles.innerSection}>
                  <div className={styles.sectionHead}>
                    <span className={styles.sectionEyebrow}>Linked Pattern</span>
                    <h2 className={styles.sectionTitle}>연결된 도안 정보</h2>
                  </div>
                  {patternPreview ? (
                    <div className={styles.patternStudio}>
                      <section className={styles.patternHero}>
                        <div className={styles.patternHeroBody}>
                          <span className={styles.eyebrow}>Pattern Studio</span>
                          <h3 className={styles.patternHeroTitle}>{patternPreview.title}</h3>
                          <div className={styles.patternHeroMeta}>
                            {patternPreview.heroMeta.map((item) => (
                              <span
                                key={`${item.tone}-${item.label}`}
                                className={
                                  item.tone === "level"
                                    ? `${styles.patternPill} ${styles.patternPillLevel}`
                                    : item.tone === "category"
                                      ? `${styles.patternPill} ${styles.patternPillCategory}`
                                      : `${styles.patternPill} ${styles.patternPillMuted}`
                                }
                              >
                                {item.label}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className={styles.patternHeroActions}>
                          {patternPreview.linkHref && patternPreview.linkLabel ? (
                            <Link href={patternPreview.linkHref} className={styles.secondaryAction}>
                              {patternPreview.linkLabel}
                            </Link>
                          ) : null}
                          {patternPreview.externalUrl && patternPreview.externalLabel ? (
                            <Link
                              href={patternPreview.externalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.secondaryAction}
                            >
                              {patternPreview.externalLabel}
                            </Link>
                          ) : null}
                        </div>
                      </section>

                      <section className={styles.patternIntroCard}>
                        <div className={styles.patternCompactIntroGrid}>
                          <div className={styles.patternIntroMain}>
                            <div className={styles.patternImageStage}>
                              <div className={styles.patternImageWrap}>
                                {patternPreview.imageUrl ? (
                                  <Image
                                    src={patternPreview.imageUrl}
                                    alt={patternPreview.title}
                                    fill
                                    sizes="(max-width: 920px) 100vw, 46vw"
                                  />
                                ) : (
                                  <div className={styles.patternImageFallback} />
                                )}
                              </div>
                            </div>

                            <div className={styles.patternDescriptionCard}>
                              <p className={styles.patternDescriptionText}>
                                {patternPreview.description}
                              </p>
                            </div>
                          </div>

                          <div className={styles.patternIntroSide}>
                            <div className={styles.patternInfoStack}>
                              <section className={styles.patternSectionCard}>
                                <div className={styles.sectionHead}>
                                  <span className={styles.sectionEyebrow}>Story</span>
                                  <h3 className={styles.sectionTitle}>도안 소개</h3>
                                </div>
                                <div className={styles.patternSummaryList}>
                                  {patternPreview.overviewRows.map((row) => (
                                    <div key={row.label} className={styles.patternSummaryRow}>
                                      <span>{row.label}</span>
                                      <span className={styles.patternSummaryValue}>{row.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </section>

                              {patternPreview.prepRows.length ? (
                                <section className={styles.patternSectionCard}>
                                  <div className={styles.sectionHead}>
                                    <span className={styles.sectionEyebrow}>Material</span>
                                    <h3 className={styles.sectionTitle}>제작 준비</h3>
                                  </div>
                                  <div className={styles.patternPrepGrid}>
                                    {patternPreview.prepRows.map((row) => (
                                      <div key={row.label} className={styles.patternSummaryRow}>
                                        <span>{row.label}</span>
                                        <span className={styles.patternSummaryValue}>{row.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                </section>
                              ) : null}

                              {patternPreview.policyRows.length ? (
                                <section className={styles.patternSectionCard}>
                                  <div className={styles.sectionHead}>
                                    <span className={styles.sectionEyebrow}>Policy</span>
                                    <h3 className={styles.sectionTitle}>이용 범위</h3>
                                  </div>
                                  <div className={styles.patternPolicyGrid}>
                                    {patternPreview.policyRows.map((row, index) => (
                                      <div
                                        key={`${row.label}-${index}`}
                                        className={index === 0 ? styles.patternSummaryRow : styles.patternPolicyRow}
                                      >
                                        <span>{row.label}</span>
                                        <span
                                          className={
                                            index === 0
                                              ? styles.patternSummaryValue
                                              : row.value === "O"
                                                ? `${styles.patternPolicyState} ${styles.patternPolicyAllowed}`
                                                : `${styles.patternPolicyState} ${styles.patternPolicyDenied}`
                                          }
                                        >
                                          {row.value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </section>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </section>

                      {patternPreview.detailRows.length ? (
                        <section className={styles.patternSectionCard}>
                          <div className={styles.sectionHead}>
                            <span className={styles.sectionEyebrow}>Pattern Sheet</span>
                            <h3 className={styles.sectionTitle}>도안 세부 내용</h3>
                          </div>
                          <div className={styles.patternDetailList}>
                            {patternPreview.detailRows.map((row) => (
                              <div key={row.id} className={styles.patternDetailItem}>
                                <div className={styles.patternDetailMeta}>
                                  <span className={styles.patternDetailIndex}>{row.rowNumber}단</span>
                                  <span className={styles.patternDetailPreview}>
                                    {row.instruction.length > 28
                                      ? `${row.instruction.slice(0, 28)}...`
                                      : row.instruction}
                                  </span>
                                </div>
                                <p className={styles.patternDetailText}>{row.instruction}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                      ) : null}
                    </div>
                  ) : (
                    <p className={styles.panelLockMessage}>아직 연결된 도안 정보가 없어요.</p>
                  )}
                </section>
              </div>
            ) : null}

            {visiblePanel === "supplies" && canAccessMemberPanels ? (
              <div className={styles.panelStack}>
                <section className={styles.innerSection}>
                  <div className={styles.sectionHead}>
                    <span className={styles.sectionEyebrow}>Supplies</span>
                    <h2 className={styles.sectionTitle}>준비물 체크리스트</h2>
                  </div>
                  <div className={styles.supplyList}>
                    {roomState.supplies.map((supply) => (
                      <label
                        key={supply.id}
                        className={supply.checked ? styles.supplyChecked : styles.supplyItem}
                      >
                        <input
                          type="checkbox"
                          checked={supply.checked}
                          onChange={() => void handleSupplyToggle(supply.id)}
                        />
                        <span>{supply.label}</span>
                      </label>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {visiblePanel === "qna" && canAccessMemberPanels ? (
              <div className={styles.panelStack}>
                <section className={styles.innerSection}>
                  <div className={styles.sectionHead}>
                    <span className={styles.sectionEyebrow}>Thread</span>
                    <h2 className={styles.sectionTitle}>질의응답 섹션</h2>
                  </div>
                  <div className={styles.composer}>
                    <textarea
                      className={styles.textarea}
                      value={threadInput}
                      onChange={(event) => setThreadInput(event.target.value)}
                      placeholder="질문 내용을 적어보세요."
                    />
                    <button type="button" className={styles.secondaryAction} onClick={() => void handleThreadSubmit()}>
                        질문 등록
                    </button>
                  </div>
                  <div className={styles.threadList}>
                    {filteredThreads.map((thread) => (
                      <article key={thread.id} className={styles.threadCard}>
                        <div className={styles.threadMeta}>
                          <strong>{thread.author}</strong>
                          <span>{new Date(thread.createdAt).toLocaleString("ko-KR")}</span>
                        </div>
                        <p>{thread.content}</p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {visiblePanel === "checkin" && canAccessMemberPanels ? (
              <div className={styles.panelStack}>
                <section className={styles.innerSection}>
                  <div className={styles.sectionHead}>
                    <span className={styles.sectionEyebrow}>Check-In</span>
                    <h2 className={styles.sectionTitle}>진행 기록</h2>
                  </div>
                  <div className={styles.checkInComposer}>
                    <input
                      className={styles.input}
                      value={checkInTitle}
                      onChange={(event) => setCheckInTitle(event.target.value)}
                      placeholder="예: 2주차 진행 기록"
                    />
                    <textarea
                      className={styles.textarea}
                      value={checkInContent}
                      onChange={(event) => setCheckInContent(event.target.value)}
                      placeholder="이번 주 진행 상황과 메모를 적어주세요."
                    />
                    <button type="button" className={styles.secondaryAction} onClick={() => void handleCheckInSubmit()}>
                      체크인 추가
                    </button>
                  </div>
                  <div className={styles.timelineList}>
                    {roomState.checkIns.map((checkIn) => (
                      <article key={checkIn.id} className={styles.timelineCard}>
                        <div className={styles.threadMeta}>
                          <strong>{checkIn.title}</strong>
                          <span>{checkIn.author}</span>
                        </div>
                        <p>{checkIn.content}</p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.sideCard}>
            <span className={styles.sectionEyebrow}>Participants</span>
            <h2 className={styles.sideTitle}>참여자 목록</h2>
            <div className={styles.participantList}>
              {roomState.participants.map((participant) => (
                <div key={participant.id} className={styles.participantCard}>
                  <strong>{participant.name}</strong>
                  <span>{participant.role}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.sideCard}>
            <span className={styles.sectionEyebrow}>Room Status</span>
            <h2 className={styles.sideTitle}>운영 요약</h2>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryBox}>
                <span>체크 완료</span>
                <strong>
                  {roomState.supplies.filter((supply) => supply.checked).length} / {roomState.supplies.length}
                </strong>
              </div>
              <div className={styles.summaryBox}>
                <span>질문 글</span>
                <strong>
                  {roomState.threads.filter((thread) => thread.type === "질문").length}
                </strong>
              </div>
              <div className={styles.summaryBox}>
                <span>인증 글</span>
                <strong>
                  {roomState.threads.filter((thread) => thread.type === "인증").length}
                </strong>
              </div>
              <div className={styles.summaryBox}>
                <span>체크인</span>
                <strong>{roomState.checkIns.length}</strong>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
    </>
  );
}
