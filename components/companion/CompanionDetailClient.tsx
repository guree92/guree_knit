"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LoginRequiredModal from "@/components/auth/LoginRequiredModal";
import { getCompanionRoomById } from "@/data/companion";
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
  toCompanionThreadDbType,
  type CompanionCheckInRow,
  type CompanionNoticeRow,
  type CompanionParticipant,
  type CompanionRoom,
  type CompanionRoomRow,
  type CompanionRoomState,
  type CompanionSupplyCheckRow,
  type CompanionSupplyRow,
  type CompanionThreadCommentRow,
  type CompanionThreadRow,
} from "@/lib/companion";
import { normalizeDetailRows } from "@/lib/pattern-detail";
import { getPatternImageUrl, type PatternItem } from "@/lib/patterns";
import { createClient } from "@/lib/supabase/client";
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
  if (room.status === "\uBAA8\uC9D1\uC911") return styles.statusRecruiting;
  if (room.status === "\uC9C4\uD589\uC911") return styles.statusProgress;
  return styles.statusRecruiting;
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


function formatDateTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function splitNoticeText(notice: string) {
  const parts = notice.split(" - ");
  if (parts.length < 2) {
    return { title: "안내", content: notice };
  }

  return {
    title: parts[0],
    content: parts.slice(1).join(" - "),
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
  const [threadType] = useState<"질문">("질문");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");
  const [threadInput, setThreadInput] = useState("");
  const [checkInTitle, setCheckInTitle] = useState("");
  const [checkInContent, setCheckInContent] = useState("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [threadCommentInputs, setThreadCommentInputs] = useState<Record<string, string>>({});
  const [openThreadComments, setOpenThreadComments] = useState<Record<string, boolean>>({});
  const [questionPage, setQuestionPage] = useState(1);
  const [supplyCheckedCounts, setSupplyCheckedCounts] = useState<Record<string, number>>({});
  const [participantSupplyProgress, setParticipantSupplyProgress] = useState<
    Array<{ userId: string; name: string; checkedCount: number }>
  >([]);

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

      const { data: roomRow } = await supabase.from("companion_rooms").select("*").eq("id", roomId).maybeSingle();

      if (roomRow) {
        const dbRoomRow = roomRow as CompanionRoomRow;
        const [
          profilesResult,
          participantsResult,
          noticesResult,
          suppliesResult,
          threadsResult,
          threadCommentsResult,
          checkInsResult,
        ] = await Promise.all([
          dbRoomRow.host_user_id
            ? supabase.from("profiles").select("id, nickname").eq("id", dbRoomRow.host_user_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase.from("companion_participants").select("*").eq("room_id", roomId).order("joined_at", { ascending: true }),
          supabase.from("companion_notices").select("*").eq("room_id", roomId).order("created_at", { ascending: false }),
          supabase.from("companion_supplies").select("*").eq("room_id", roomId).order("sort_order", { ascending: true }),
          supabase.from("companion_threads").select("*").eq("room_id", roomId).order("created_at", { ascending: false }),
          supabase
            .from("companion_thread_comments")
            .select("id, thread_id, author_user_id, content, created_at, companion_threads!inner(room_id)")
            .eq("companion_threads.room_id", roomId)
            .order("created_at", { ascending: true }),
          supabase.from("companion_checkins").select("*").eq("room_id", roomId).order("created_at", { ascending: false }),
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
        const threadCommentRows =
          (((threadCommentsResult.data ?? []) as CompanionThreadCommentRow[]) ?? []);

        const authorIds = Array.from(
          new Set([
            ...participantRows.map((row) => row.user_id),
            ...threadRows.map((row) => row.author_user_id),
            ...threadCommentRows.map((row) => row.author_user_id),
            ...checkInRows.map((row) => row.author_user_id),
            ...noticeRows.map((row) => row.author_user_id),
          ].filter(Boolean))
        );

        let nicknameMap = new Map<string, string | null>();

        if (authorIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, nickname").in("id", authorIds);
          nicknameMap = new Map(
            ((profiles ?? []) as Array<{ id: string; nickname: string | null }>).map((profile) => [
              profile.id,
              profile.nickname,
            ])
          );
        }

        let checkedSupplyIds = new Set<string>();
        let nextSupplyCheckedCounts: Record<string, number> = {};
        let nextParticipantSupplyProgress: Array<{ userId: string; name: string; checkedCount: number }> = [];

        if (supplyRows.length > 0) {
          const { data: checkedRows } = await supabase
            .from("companion_supply_checks")
            .select("supply_id, user_id")
            .in(
              "supply_id",
              supplyRows.map((row) => row.id)
            );

          const normalizedCheckedRows = ((checkedRows ?? []) as CompanionSupplyCheckRow[]) ?? [];

          if (currentUserId) {
            checkedSupplyIds = new Set(
              normalizedCheckedRows.filter((row) => row.user_id === currentUserId).map((row) => row.supply_id)
            );
          }

          const participantUserIds = new Set(
            participantRows.filter((participant) => participant.role === "participant").map((participant) => participant.user_id)
          );
          const supplyCountMap = new Map<string, Set<string>>();
          const participantProgressMap = new Map<string, Set<string>>();

          normalizedCheckedRows.forEach((row) => {
            if (!participantUserIds.has(row.user_id)) return;

            const checkedUsers = supplyCountMap.get(row.supply_id) ?? new Set<string>();
            checkedUsers.add(row.user_id);
            supplyCountMap.set(row.supply_id, checkedUsers);

            const checkedSupplies = participantProgressMap.get(row.user_id) ?? new Set<string>();
            checkedSupplies.add(row.supply_id);
            participantProgressMap.set(row.user_id, checkedSupplies);
          });

          nextSupplyCheckedCounts = Object.fromEntries(
            supplyRows.map((supply) => [supply.id, supplyCountMap.get(supply.id)?.size ?? 0])
          );

          nextParticipantSupplyProgress = participantRows
            .filter((participant) => participant.role === "participant")
            .map((participant) => ({
              userId: participant.user_id,
              name: nicknameMap.get(participant.user_id) ?? "참여자",
              checkedCount: participantProgressMap.get(participant.user_id)?.size ?? 0,
            }));
        }

        const room = mapCompanionRoom(dbRoomRow, {
          hostName:
            (profilesResult.data as { id: string; nickname: string | null } | null)?.nickname ??
            (dbRoomRow.host_user_id ? nicknameMap.get(dbRoomRow.host_user_id) ?? "진행자" : "진행자"),
        });

        if (dbRoomRow.pattern_id) {
          const { data: patternRow } = await supabase.from("patterns").select("*").eq("id", dbRoomRow.pattern_id).maybeSingle();
          setLinkedPattern((patternRow as PatternItem | null) ?? null);
        }

        const participants: CompanionParticipant[] = participantRows.map((participant) => ({
          id: participant.id,
          name: nicknameMap.get(participant.user_id) ?? "참여자",
          role: participant.role === "host" ? "진행자" : "참여중",
        }));
        const commentsByThreadId = new Map<
          string,
          Array<{ id: string; author: string; content: string; createdAt: string }>
        >();

        threadCommentRows.forEach((comment) => {
          const existing = commentsByThreadId.get(comment.thread_id) ?? [];
          existing.push({
            id: comment.id,
            author: nicknameMap.get(comment.author_user_id) ?? "참여자",
            content: comment.content,
            createdAt: comment.created_at,
          });
          commentsByThreadId.set(comment.thread_id, existing);
        });

        setCurrentRoom({
          ...room,
          participantCount: participants.length,
        });
        setSupplyCheckedCounts(nextSupplyCheckedCounts);
        setParticipantSupplyProgress(nextParticipantSupplyProgress);
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
            comments: commentsByThreadId.get(thread.id) ?? [],
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
        const customRooms = deserializeCompanionRooms(window.localStorage.getItem(customCompanionRoomsStorageKey));
        const localRoom = customRooms.find((item) => item.id === roomId) ?? getCompanionRoomById(roomId) ?? null;

        if (localRoom) {
          const storageKey = getCompanionRoomStateStorageKey(localRoom.id);
          const fallback = createDefaultCompanionRoomState(localRoom);
          setCurrentRoom(localRoom);
          setLinkedPattern(null);
          setSupplyCheckedCounts({});
          setParticipantSupplyProgress([]);
          setRoomState(deserializeCompanionRoomState(window.localStorage.getItem(storageKey), fallback));
        } else {
          setCurrentRoom(null);
          setSupplyCheckedCounts({});
          setParticipantSupplyProgress([]);
          setRoomState(null);
        }
      } else {
        setCurrentRoom(null);
        setSupplyCheckedCounts({});
        setParticipantSupplyProgress([]);
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
  const visiblePanel = activePanel === "pattern" || canAccessMemberPanels ? activePanel : "overview";
  const isRecruitingOpen = currentRoom ? isCompanionRecruitingOpen(currentRoom) : false;
  const overviewNotices = roomState?.notices ?? [];
  const questionThreads = (roomState?.threads ?? []).filter((thread) => thread.type === "질문");
  const sortedQuestionThreads = [...questionThreads].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
  const totalQuestionPages = Math.max(1, Math.ceil(sortedQuestionThreads.length / 3));
  const currentQuestionPage = Math.min(questionPage, totalQuestionPages);
  const pagedQuestionThreads = sortedQuestionThreads.slice((currentQuestionPage - 1) * 3, currentQuestionPage * 3);

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
        summaryRows: [
          { label: "난이도", value: linkedPattern.level },
          { label: "카테고리", value: linkedPattern.category },
          {
            label: "태그",
            value: linkedPattern.tags?.length ? linkedPattern.tags.map((tag) => `#${tag}`).join(", ") : "-",
          },
          { label: "작성자", value: linkedPattern.author_nickname ?? "-" },
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
        actionHref: `/patterns/${linkedPattern.id}`,
        actionLabel: "도안 상세 보기",
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
        summaryRows: [
          { label: "난이도", value: pattern.level },
          { label: "카테고리", value: pattern.category },
          { label: "태그", value: pattern.tags.length ? pattern.tags.map((tag) => `#${tag}`).join(", ") : "-" },
          { label: "형태", value: "동행 전용 도안" },
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
        actionHref: null as string | null,
        actionLabel: null as string | null,
      };
    }

    if (currentRoom.patternSourceType === "external") {
      return {
        title: currentRoom.patternName,
        description: "외부 링크로 연결된 도안이에요. 원문 페이지에서 자세한 안내와 파일을 확인할 수 있어요.",
        imageUrl: currentRoom.patternExternalImagePath ? getPatternImageUrl(currentRoom.patternExternalImagePath) : "",
        summaryRows: [
          { label: "도안명", value: currentRoom.patternName || "-" },
          { label: "연결 방식", value: "외부 링크" },
          { label: "모집 상태", value: currentRoom.status },
          { label: "난이도", value: currentRoom.level },
        ],
        prepRows: [] as Array<{ label: string; value: string }>,
        policyRows: [] as Array<{ label: string; value: string }>,
        detailRows: [] as Array<{ id: string; rowNumber: number; instruction: string }>,
        actionHref: currentRoom.patternExternalUrl ?? null,
        actionLabel: "외부 도안 열기",
      };
    }

    return null;
  }, [currentRoom, linkedPattern]);

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
        const { error } = await supabase.from("companion_participants").delete().eq("room_id", currentRoom.id).eq("user_id", user.id);
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
        type: toCompanionThreadDbType(threadType),
        content: threadInput.trim(),
      });

      if (error) {
        alert(error.message);
        return;
      }

      setThreadInput("");
      setQuestionPage(1);
      setReloadToken((current) => current + 1);
      return;
    }

    persistLocalState({
      ...roomState,
      threads: [
        {
          id: `${currentRoom.id}-thread-${Date.now()}`,
          type: threadType,
          author: currentUserName ?? "게스트",
          content: threadInput.trim(),
          createdAt: new Date().toISOString(),
          comments: [],
        },
        ...roomState.threads,
      ],
    });
    setThreadInput("");
    setQuestionPage(1);
  }

  async function handleThreadCommentSubmit(threadId: string) {
    if (!currentRoom || !roomState) return;

    const nextContent = threadCommentInputs[threadId]?.trim();
    if (!nextContent) return;

    if (isDbRoom) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("로그인 후 댓글을 남길 수 있어요.");
        router.push(`/login?returnTo=%2Fcompanion%2F${currentRoom.id}`);
        return;
      }

      const { error } = await supabase.from("companion_thread_comments").insert({
        thread_id: threadId,
        author_user_id: user.id,
        content: nextContent,
      });

      if (error) {
        alert(error.message);
        return;
      }

      setThreadCommentInputs((current) => ({ ...current, [threadId]: "" }));
      setOpenThreadComments((current) => ({ ...current, [threadId]: true }));
      setReloadToken((current) => current + 1);
      return;
    }

    persistLocalState({
      ...roomState,
      threads: roomState.threads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              comments: [
                ...(thread.comments ?? []),
                {
                  id: `${threadId}-comment-${Date.now()}`,
                  author: currentUserName ?? "게스트",
                  content: nextContent,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : thread
      ),
    });
    setThreadCommentInputs((current) => ({ ...current, [threadId]: "" }));
    setOpenThreadComments((current) => ({ ...current, [threadId]: true }));
  }

  async function handleNoticeSubmit() {
    if (!currentRoom || !roomState || !noticeTitle.trim() || !noticeContent.trim()) return;

    if (!isHost) {
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
      <section className={styles.feedbackCard}>
        <p className={styles.sectionDescription}>동행방을 불러오는 중이에요...</p>
      </section>
    );
  }

  if (!currentRoom || !roomState) {
    return (
      <section className={styles.feedbackCard}>
        <h1 className={styles.sectionTitle}>동행방을 찾을 수 없어요</h1>
        <p className={styles.sectionDescription}>요청하신 동행방이 없거나 아직 불러오지 못했어요.</p>
        <Link href="/companion" className={styles.submitButton}>
          목록으로
        </Link>
      </section>
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
        <div className={styles.workspace}>
          <div className={styles.mainColumn}>
            <section className={`${styles.hero} ${styles.heroCompact}`}>
              <div className={`${styles.actionRow} ${styles.heroTopActions}`}>
                {isHost ? (
                  <Link href={`/companion/${currentRoom.id}/edit`} className={styles.ghostButton}>
                    수정
                  </Link>
                ) : null}
                <button type="button" onClick={handleJoinToggle} className={styles.submitButton}>
                  {isJoined ? "\uCC38\uC5EC \uCDE8\uC18C" : isRecruitingOpen ? "\uCC38\uC5EC \uC2E0\uCCAD" : "\uC815\uC6D0 \uB9C8\uAC10"}
                </button>
                <button
                  type="button"
                  onClick={() => setActivePanel("pattern")}
                  className={styles.ghostButton}
                >
                  연결 도안 보기
                </button>
                <Link href="/companion" className={styles.secondaryAction}>
                  목록으로
                </Link>
              </div>

              <div className={styles.heroBody}>
                <span className={styles.eyebrow}>Companion Archive</span>

                <h1 className={styles.heroTitle}>{currentRoom.title}</h1>

                <div className={styles.heroMeta}>
                  <span className={`${styles.pill} ${getStatusClassName(currentRoom)}`}>{currentRoom.status}</span>
                  <span className={`${styles.pill} ${styles.pillMuted}`}>{currentRoom.patternName}</span>
                  <span className={`${styles.pill} ${styles.pillMuted}`}>@{currentRoom.hostName}</span>
                  <span className={`${styles.pill} ${styles.pillMuted}`}>{formatCompanionSchedule(currentRoom)}</span>
                </div>
              </div>
            </section>

            <div className={`${styles.compactIntroGrid} ${styles.sectionSpanFull}`}>
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>동행방 정보</h2>
                </div>

                <div className={styles.summaryList}>
                  <div className={styles.summaryRow}>
                    <span>진행자</span>
                    <span className={styles.summaryValue}>@{currentRoom.hostName}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>일정</span>
                    <span className={styles.summaryValue}>{formatCompanionSchedule(currentRoom)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>{"\uBAA8\uC9D1 \uC0C1\uD0DC"}</span>
                    <span className={styles.summaryValue}>{isRecruitingOpen ? "\uBAA8\uC9D1\uC911" : "\uC9C4\uD589\uC911"}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>난이도</span>
                    <span className={styles.summaryValue}>{currentRoom.level}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>인원</span>
                    <span className={styles.summaryValue}>
                      {formatCompanionMembers(currentRoom)} / 정원 {currentRoom.capacity}명
                    </span>
                  </div>
                </div>
              </section>

              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>동행방 안내</h2>
                </div>

                <div className={`${styles.descriptionCard} ${styles.descriptionCardWide}`}>
                  <p className={styles.descriptionText}>{currentRoom.summary}</p>
                </div>

                {currentRoom.tags.length > 0 ? (
                  <div className={styles.tagList}>
                    {currentRoom.tags.map((tag) => (
                      <span key={tag} className={styles.tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </section>
            </div>

            <section className={`${styles.sectionCard} ${styles.sectionSpanFull} ${styles.commentsSection}`}>
              <div className={styles.tabRow}>
                <button
                  type="button"
                  className={visiblePanel === "overview" ? styles.tabActive : styles.tabButton}
                  onClick={() => setActivePanel("overview")}
                >
                  안내
                </button>
                <button
                  type="button"
                  className={visiblePanel === "pattern" ? styles.tabActive : styles.tabButton}
                  onClick={() => setActivePanel("pattern")}
                >
                  도안
                </button>
                {canAccessMemberPanels ? (
                  <>
                    <button
                      type="button"
                      className={visiblePanel === "supplies" ? styles.tabActive : styles.tabButton}
                      onClick={() => setActivePanel("supplies")}
                    >
                      준비물
                    </button>
                    <button
                      type="button"
                      className={visiblePanel === "qna" ? styles.tabActive : styles.tabButton}
                      onClick={() => setActivePanel("qna")}
                    >
                      질문
                    </button>
                    <button
                      type="button"
                      className={visiblePanel === "checkin" ? styles.tabActive : styles.tabButton}
                      onClick={() => setActivePanel("checkin")}
                    >
                      기록
                    </button>
                  </>
                ) : null}
              </div>

              {visiblePanel === "overview" ? (
                <>
                  <div className={styles.sectionHead}>
                    <h2 className={styles.sectionTitle}>공지</h2>
                    <p className={styles.sectionDescription}>등록된 안내 {overviewNotices.length}개</p>
                  </div>

                  {isHost ? (
                    <div className={styles.composer}>
                      <label className={styles.label}>공지 작성</label>
                      <input
                        value={noticeTitle}
                        onChange={(event) => setNoticeTitle(event.target.value)}
                        placeholder="공지 제목"
                        className={styles.input}
                      />
                      <textarea
                        value={noticeContent}
                        onChange={(event) => setNoticeContent(event.target.value)}
                        placeholder="참여자에게 안내할 공지 내용을 적어주세요."
                        rows={4}
                        className={styles.textarea}
                    />
                    <div className={styles.composerFooter}>
                      <button type="button" onClick={() => void handleNoticeSubmit()} className={styles.submitButton}>
                        공지 등록
                      </button>
                      </div>
                    </div>
                  ) : null}

                  <div className={styles.commentList}>
                    {overviewNotices.length > 0 ? (
                      overviewNotices.map((notice, index) => {
                        const item = splitNoticeText(notice);

                        return (
                          <article key={`${notice}-${index}`} className={styles.commentCard}>
                            <div className={styles.commentHead}>
                              <div className={styles.commentMeta}>
                                <span className={styles.commentAuthor}>{item.title}</span>
                                <span className={styles.commentDate}>공지 {index + 1}</span>
                              </div>
                            </div>
                            <p className={styles.commentBody}>{item.content}</p>
                          </article>
                        );
                      })
                    ) : (
                      <div className={styles.emptyState}>
                        <p className={styles.emptyStateTitle}>아직 공지가 없어요</p>
                        <p className={styles.emptyStateDescription}>첫 안내를 남겨 동행 흐름을 정리해 보세요.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : null}

              {visiblePanel === "pattern" ? (
                <>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>연결 도안</h2>
                  </div>

                  {patternPreview ? (
                    <>
                      <div className={styles.compactIntroGrid}>
                        <div className={styles.introMain}>
                          <div className={styles.imageStage}>
                            <div className={styles.imageWrap}>
                              {patternPreview.imageUrl ? (
                                <Image
                                  src={patternPreview.imageUrl}
                                  alt={patternPreview.title}
                                  fill
                                  sizes="(max-width: 920px) 100vw, 46vw"
                                />
                              ) : (
                                <div className={styles.imageFallback}>사진없음</div>
                              )}
                            </div>
                          </div>

                          <div className={styles.descriptionCard}>
                            <p className={styles.descriptionText}>{patternPreview.description}</p>
                          </div>
                        </div>

                        <div className={styles.introSide}>
                          <div className={styles.infoStack}>
                            <section className={styles.sectionCard}>
                              <div className={styles.sectionHeader}>
                                <h3 className={styles.sectionTitle}>도안</h3>
                              </div>
                              <div className={styles.summaryList}>
                                {patternPreview.summaryRows.map((row) => (
                                  <div key={row.label} className={styles.summaryRow}>
                                    <span>{row.label}</span>
                                    <span className={styles.summaryValue}>{row.value}</span>
                                  </div>
                                ))}
                              </div>
                            </section>

                            {patternPreview.prepRows.length > 0 ? (
                              <section className={styles.sectionCard}>
                                <div className={styles.sectionHeader}>
                                  <h3 className={styles.sectionTitle}>제작 준비</h3>
                                </div>
                                <div className={styles.prepGrid}>
                                  {patternPreview.prepRows.map((row) => (
                                    <div key={`compact-${row.label}`} className={styles.summaryRow}>
                                      <span>{row.label}</span>
                                      <span className={styles.summaryValue}>{row.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            ) : null}

                            {patternPreview.policyRows.length > 0 ? (
                              <section className={styles.sectionCard}>
                                <div className={styles.sectionHeader}>
                                  <h3 className={styles.sectionTitle}>이용 범위</h3>
                                </div>
                                <div className={styles.policyGrid}>
                                  {patternPreview.policyRows.map((row, index) => (
                                    <div
                                      key={`${row.label}-${index}`}
                                      className={index === 0 ? styles.summaryRow : styles.policyRow}
                                    >
                                      <span className={index === 0 ? undefined : styles.fieldLabel}>{row.label}</span>
                                      {index === 0 ? (
                                        <span className={styles.summaryValue}>{row.value}</span>
                                      ) : (
                                        <span
                                          className={`${styles.policyState} ${
                                            row.value === "O" ? styles.policyAllowed : styles.policyDenied
                                          }`}
                                        >
                                          {row.value}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                  {patternPreview.actionHref && patternPreview.actionLabel ? (
                                    <div className={styles.summaryRow}>
                                      <span>링크</span>
                                      <Link
                                        href={patternPreview.actionHref}
                                        target={patternPreview.actionHref.startsWith("http") ? "_blank" : undefined}
                                        rel={patternPreview.actionHref.startsWith("http") ? "noreferrer" : undefined}
                                        className={styles.secondaryLinkAction}
                                      >
                                        {patternPreview.actionLabel}
                                      </Link>
                                    </div>
                                  ) : null}
                                </div>
                              </section>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {!(currentRoom.patternSourceType === "custom" && !canAccessMemberPanels) ? (
                        <section className={`${styles.sectionCard} ${styles.sectionSpanFull} ${styles.sheetCard}`}>
                          <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>도안 세부 내용</h2>
                          </div>

                          {patternPreview.detailRows.length ? (
                            <div className={styles.detailList}>
                              {patternPreview.detailRows.map((row) => (
                                <div key={row.id} className={styles.detailItem}>
                                  <div className={styles.detailMeta}>
                                    <span className={styles.detailIndex}>{row.rowNumber}단</span>
                                    <span className={styles.detailPreview}>
                                      {row.instruction.length > 28
                                        ? `${row.instruction.slice(0, 28)}...`
                                        : row.instruction}
                                    </span>
                                  </div>
                                  <p className={styles.detailText}>{row.instruction || "-"}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className={styles.emptyState}>
                              <p className={styles.emptyStateTitle}>등록된 세부 내용이 아직 없어요</p>
                              <p className={styles.emptyStateDescription}>
                                작성자가 아직 행별 설명을 입력하지 않았거나, 공개된 상세 내용이 없어요.
                              </p>
                            </div>
                          )}
                        </section>
                      ) : null}
                    </>
                  ) : (
                    <div className={styles.emptyState}>
                      <p className={styles.emptyStateTitle}>아직 연결된 도안 정보가 없어요</p>
                      <p className={styles.emptyStateDescription}>이 동행방에는 아직 상세 도안이 연결되지 않았어요.</p>
                    </div>
                  )}
                </>
              ) : null}

              {visiblePanel === "supplies" ? (
                <>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>준비물</h2>
                  <p className={styles.sectionDescription}>체크리스트 {roomState.supplies.length}개</p>
                </div>

                {canAccessMemberPanels ? (
                  <>
                    {isHost && participantSupplyProgress.length > 0 ? (
                      <div className={styles.supplyProgressList}>
                        {participantSupplyProgress.map((participant) => (
                          <div key={participant.userId} className={styles.supplyProgressRow}>
                            <span className={styles.supplyProgressName}>{participant.name}</span>
                            <strong className={styles.supplyProgressValue}>
                              {participant.checkedCount}/{roomState.supplies.length}
                            </strong>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className={styles.commentList}>
                      {roomState.supplies.map((supply) => (
                        <label key={supply.id} className={supply.checked ? styles.replyCardChecked : styles.replyCard}>
                          <div className={styles.supplyRow}>
                            <input
                              type="checkbox"
                              checked={supply.checked}
                              onChange={() => void handleSupplyToggle(supply.id)}
                              className={styles.checkbox}
                            />
                            <div>
                              <div className={styles.commentAuthor}>{supply.label}</div>
                              <p className={styles.commentBody}>{supply.checked ? "준비 완료" : "아직 확인 전"}</p>
                              {isHost && participantSupplyProgress.length > 0 ? (
                                <p className={styles.supplyCountText}>
                                  참여자 {supplyCheckedCounts[supply.id] ?? 0} / {participantSupplyProgress.length}명 완료
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyStateTitle}>참여 후 열리는 공간이에요</p>
                    <p className={styles.emptyStateDescription}>이 동행방에 참여하면 준비물 체크리스트를 사용할 수 있어요.</p>
                  </div>
                )}
                </>
              ) : null}

              {visiblePanel === "qna" ? (
                <>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>질문</h2>
                  <p className={styles.sectionDescription}>등록된 질문 {questionThreads.length}개</p>
                </div>

                {canAccessMemberPanels ? (
                  <>
                    <div className={styles.inlineQuestionComposer}>
                      <textarea
                        value={threadInput}
                        onChange={(event) => setThreadInput(event.target.value)}
                        placeholder="질문 내용을 적어보세요."
                        rows={4}
                        className={styles.textarea}
                      />
                      <div className={`${styles.composerFooter} ${styles.composerFooterEnd}`}>
                        <button type="button" onClick={() => void handleThreadSubmit()} className={styles.submitButton}>
                          질문 등록
                        </button>
                      </div>
                    </div>

                    <div className={styles.commentList}>
                      {pagedQuestionThreads.map((thread) => {
                          const commentCount = thread.comments?.length ?? 0;
                          const isCommentOpen = openThreadComments[thread.id] ?? false;

                          return (
                          <article key={thread.id} className={styles.commentCard}>
                            <div className={styles.commentHead}>
                              <div className={styles.commentMeta}>
                                <span className={styles.commentAuthor}>@{thread.author}</span>
                                <span className={styles.commentDate}>{formatDateTimeLabel(thread.createdAt)}</span>
                              </div>
                              <div className={styles.commentActions}>
                                <span className={`${styles.pill} ${styles.categoryQuestion}`}>
                                  {thread.type}
                                </span>
                              </div>
                            </div>
                            <p className={styles.commentBody}>{thread.content}</p>

                            <div className={styles.threadCommentToggleRow}>
                              <button
                                type="button"
                                className={styles.threadCommentToggle}
                                onClick={() =>
                                  setOpenThreadComments((current) => ({
                                    ...current,
                                    [thread.id]: !isCommentOpen,
                                  }))
                                }
                              >
                                {isCommentOpen
                                  ? "댓글 숨기기"
                                  : commentCount > 0
                                    ? `댓글 ${commentCount}개 보기`
                                    : "댓글 쓰기"}
                              </button>
                            </div>

                            {isCommentOpen ? (
                              <div className={styles.threadCommentSection}>
                                {commentCount ? (
                                  <div className={styles.threadCommentList}>
                                    {(thread.comments ?? []).map((comment) => (
                                      <div key={comment.id} className={styles.threadCommentItem}>
                                        <div className={styles.threadCommentMeta}>
                                          <span className={styles.commentAuthor}>@{comment.author}</span>
                                          <span className={styles.commentDate}>
                                            {formatDateTimeLabel(comment.createdAt)}
                                          </span>
                                        </div>
                                        <p className={styles.threadCommentBody}>{comment.content}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}

                                <div className={styles.threadCommentComposer}>
                                  <input
                                    value={threadCommentInputs[thread.id] ?? ""}
                                    onChange={(event) =>
                                      setThreadCommentInputs((current) => ({
                                        ...current,
                                        [thread.id]: event.target.value,
                                      }))
                                    }
                                    placeholder="댓글을 남겨보세요."
                                    className={styles.input}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void handleThreadCommentSubmit(thread.id)}
                                    className={styles.secondaryAction}
                                  >
                                    댓글 등록
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </article>
                        )})}
                    </div>

                    {sortedQuestionThreads.length > 3 ? (
                      <div className={styles.questionPagination}>
                        <button
                          type="button"
                          className={styles.questionPageButton}
                          onClick={() => setQuestionPage((current) => Math.max(1, current - 1))}
                          disabled={currentQuestionPage === 1}
                        >
                          이전
                        </button>
                        <span className={styles.questionPageLabel}>
                          {currentQuestionPage} / {totalQuestionPages}
                        </span>
                        <button
                          type="button"
                          className={styles.questionPageButton}
                          onClick={() => setQuestionPage((current) => Math.min(totalQuestionPages, current + 1))}
                          disabled={currentQuestionPage === totalQuestionPages}
                        >
                          다음
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyStateTitle}>참여 후 열리는 공간이에요</p>
                    <p className={styles.emptyStateDescription}>참여자만 질문을 남길 수 있어요.</p>
                  </div>
                )}
                </>
              ) : null}

              {visiblePanel === "checkin" ? (
                <>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>진행 기록</h2>
                  <p className={styles.sectionDescription}>체크인 {roomState.checkIns.length}개</p>
                </div>

                {canAccessMemberPanels ? (
                  <>
                    <div className={styles.composer}>
                      <label className={styles.label}>체크인 입력</label>
                      <input
                        value={checkInTitle}
                        onChange={(event) => setCheckInTitle(event.target.value)}
                        placeholder="예: 2주차 진행 기록"
                        className={styles.input}
                      />
                      <textarea
                        value={checkInContent}
                        onChange={(event) => setCheckInContent(event.target.value)}
                        placeholder="이번 주 진행 상황과 메모를 적어주세요."
                        rows={4}
                        className={styles.textarea}
                      />
                      <div className={styles.composerFooter}>
                        <p className={styles.hintText}>체크인은 순서대로 쌓여 진행 흐름을 보여줘요.</p>
                        <button type="button" onClick={() => void handleCheckInSubmit()} className={styles.submitButton}>
                          체크인 추가
                        </button>
                      </div>
                    </div>

                    <div className={styles.commentList}>
                      {roomState.checkIns.map((checkIn) => (
                        <article key={checkIn.id} className={styles.commentCard}>
                          <div className={styles.commentHead}>
                            <div className={styles.commentMeta}>
                              <span className={styles.commentAuthor}>{checkIn.title}</span>
                              <span className={styles.commentDate}>{formatDateTimeLabel(checkIn.createdAt)}</span>
                            </div>
                            <div className={styles.commentActions}>
                              <span className={`${styles.pill} ${styles.pillMuted}`}>@{checkIn.author}</span>
                            </div>
                          </div>
                          <p className={styles.commentBody}>{checkIn.content}</p>
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyStateTitle}>참여 후 열리는 공간이에요</p>
                    <p className={styles.emptyStateDescription}>동행에 참여하면 진행 기록을 함께 남길 수 있어요.</p>
                  </div>
                )}
                </>
              ) : null}
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={`${styles.sectionCard} ${styles.previewCard}`}>
              <div className={styles.previewHead}>
                <h3 className={styles.previewTitle}>참여자</h3>
              </div>
              <div className={styles.detailList}>
                {roomState.participants.map((participant) => (
                  <div key={participant.id} className={styles.detailItem}>
                    <div className={styles.detailMeta}>
                      <span className={styles.detailIndex}>{participant.name}</span>
                    </div>
                    <p className={styles.detailText}>{participant.role}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className={`${styles.sectionCard} ${styles.previewCard}`}>
              <div className={styles.previewHead}>
                <h3 className={styles.previewTitle}>운영 요약</h3>
              </div>
              <div className={styles.summaryList}>
                <div className={styles.summaryRow}>
                  <span>준비물 체크</span>
                  <span className={styles.summaryValue}>
                    {roomState.supplies.filter((supply) => supply.checked).length} / {roomState.supplies.length}
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span>질문</span>
                  <span className={styles.summaryValue}>{questionThreads.length}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>체크인</span>
                  <span className={styles.summaryValue}>{roomState.checkIns.length}</span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
