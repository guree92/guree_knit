"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LoginRequiredModal from "@/components/auth/LoginRequiredModal";
import { getCompanionRoomById } from "@/data/companion";
import {
  createDefaultCompanionRoomState,
  customCompanionRoomsStorageKey,
  deserializeCompanionRoomState,
  deserializeCompanionRooms,
  formatCompanionSchedule,
  getCompanionRoomStateStorageKey,
  mapCompanionRoom,
  type CompanionCheckInRow,
  type CompanionNoticeRow,
  type CompanionRoom,
  type CompanionRoomRow,
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

type ActivePanel = "notice" | "pattern" | "supplies" | "questions" | "progress" | "resting" | "graduated";
type DetailParticipant = { id: string; userId: string; name: string; role: "host" | "participant" };
type DetailNotice = { id: string; title: string; content: string; author: string; createdAt: string };
type DetailSupply = { id: string; label: string; checkedBy: string[] };
type DetailReply = { id: string; author: string; content: string; createdAt: string };
type DetailQuestion = { id: string; author: string; content: string; createdAt: string; replies: DetailReply[] };
type ProgressPost = { id: string; title: string; content: string; createdAt: string };
type ProgressBoard = { id: string; userId: string; name: string; lastActivityAt: string; graduatedAt: string | null; posts: ProgressPost[] };
type DetailState = { participants: DetailParticipant[]; notices: DetailNotice[]; supplies: DetailSupply[]; questions: DetailQuestion[]; boards: ProgressBoard[] };
type BoardMetaRecord = Record<string, { lastActivityAt?: string; graduatedAt?: string | null }>;

function getStatusClassName(status: string) {
  if (status === "모집중") return styles.statusRecruiting;
  if (status === "진행중") return styles.statusProgress;
  return styles.statusSoon;
}
function getBoardStatus(board: ProgressBoard) {
  if (board.graduatedAt) return "graduated" as const;
  const lastActivity = new Date(board.lastActivityAt).getTime();
  if (!Number.isNaN(lastActivity) && Date.now() - lastActivity > 1000 * 60 * 60 * 24 * 7) return "resting" as const;
  return "active" as const;
}
function getBoardStatusLabel(status: ReturnType<typeof getBoardStatus>) {
  if (status === "active") return "진행중";
  if (status === "resting") return "휴식";
  return "졸업";
}
function getBoardStatusTone(status: ReturnType<typeof getBoardStatus>) {
  if (status === "active") return styles.statusRecruiting;
  if (status === "resting") return styles.statusSoon;
  return styles.statusDone;
}
function getPatternSourceLabel(room: CompanionRoom) {
  if (room.patternSourceType === "site") return "사이트 도안";
  if (room.patternSourceType === "custom") return "내 도안 직접 입력";
  if (room.patternSourceType === "external") return "외부 링크 연결";
  return "미선택";
}
function formatDateTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
function parsePatternSize(sizeText: string) {
  const widthMatch = sizeText.match(/가로\s*(\d+)/);
  const heightMatch = sizeText.match(/세로\s*(\d+)/);
  const gaugeStitchesMatch = sizeText.match(/게이지\s*:\s*(\d+)코/);
  const gaugeRowsMatch = sizeText.match(/x\s*(\d+)단/);
  return {
    sizeText: widthMatch || heightMatch ? `가로 ${widthMatch?.[1] ?? "0"}cm x 세로 ${heightMatch?.[1] ?? "0"}cm` : "",
    gaugeText: gaugeStitchesMatch || gaugeRowsMatch ? `${gaugeStitchesMatch?.[1] ?? "0"}코 x ${gaugeRowsMatch?.[1] ?? "0"}단` : "",
  };
}
function parseLegacyNotice(notice: string, index: number, room: CompanionRoom): DetailNotice {
  const parts = notice.split(" - ");
  return {
    id: `legacy-notice-${index}`,
    title: parts.length > 1 ? parts[0] : `공지 ${index + 1}`,
    content: parts.length > 1 ? parts.slice(1).join(" - ") : notice,
    author: room.hostName,
    createdAt: room.createdAt,
  };
}
function getLatestTimestamp(values: Array<string | null | undefined>, fallback: string) {
  const valid = values.map((value) => (value ? new Date(value).getTime() : Number.NaN)).filter((value) => Number.isFinite(value)) as number[];
  return valid.length ? new Date(Math.max(...valid)).toISOString() : fallback;
}
function getBoardMetaStorageKey(roomId: string) { return `knit_companion_room_board_meta:${roomId}`; }
function getDetailStateStorageKey(roomId: string) { return `knit_companion_room_detail_state:${roomId}`; }
function readBoardMeta(roomId: string) {
  if (typeof window === "undefined") return {} as BoardMetaRecord;
  try { const raw = window.localStorage.getItem(getBoardMetaStorageKey(roomId)); return raw ? JSON.parse(raw) as BoardMetaRecord : {}; } catch { return {}; }
}
function writeBoardMeta(roomId: string, nextMeta: BoardMetaRecord) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getBoardMetaStorageKey(roomId), JSON.stringify(nextMeta));
}
function readLocalDetailState(roomId: string) {
  if (typeof window === "undefined") return null;
  try { const raw = window.localStorage.getItem(getDetailStateStorageKey(roomId)); return raw ? JSON.parse(raw) as DetailState : null; } catch { return null; }
}
function writeLocalDetailState(roomId: string, state: DetailState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getDetailStateStorageKey(roomId), JSON.stringify(state));
}
function convertLegacyState(room: CompanionRoom): DetailState {
  const fallback = createDefaultCompanionRoomState(room);
  const legacy = typeof window === "undefined" ? fallback : deserializeCompanionRoomState(window.localStorage.getItem(getCompanionRoomStateStorageKey(room.id)), fallback);
  const participants: DetailParticipant[] = legacy.participants.map((participant) => ({ id: participant.id, userId: participant.id, name: participant.name, role: participant.role === "진행자" ? "host" : "participant" }));
  const postsByAuthor = new Map<string, ProgressPost[]>();
  legacy.checkIns.forEach((checkIn) => {
    const existing = postsByAuthor.get(checkIn.author) ?? [];
    existing.push({ id: checkIn.id, title: checkIn.title, content: checkIn.content, createdAt: checkIn.createdAt });
    postsByAuthor.set(checkIn.author, existing);
  });
  return {
    participants,
    notices: legacy.notices.map((notice, index) => parseLegacyNotice(notice, index, room)),
    supplies: legacy.supplies.map((supply) => ({ id: supply.id, label: supply.label, checkedBy: [] })),
    questions: legacy.threads.filter((thread) => thread.type === "질문").map((thread) => ({ id: thread.id, author: thread.author, content: thread.content, createdAt: thread.createdAt, replies: (thread.comments ?? []).map((comment) => ({ id: comment.id, author: comment.author, content: comment.content, createdAt: comment.createdAt })) })),
    boards: participants.filter((participant) => participant.role === "participant").map((participant) => ({ id: `board-${participant.userId}`, userId: participant.userId, name: participant.name, lastActivityAt: (postsByAuthor.get(participant.name) ?? [])[0]?.createdAt ?? room.createdAt, graduatedAt: null, posts: (postsByAuthor.get(participant.name) ?? []).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()) })),
  };
}

export default function CompanionDetailClient() {
  const params = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);
  const roomId = params.id;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<CompanionRoom | null>(null);
  const [linkedPattern, setLinkedPattern] = useState<PatternItem | null>(null);
  const [detailState, setDetailState] = useState<DetailState | null>(null);
  const [hasLoadedRooms, setHasLoadedRooms] = useState(false);
  const [isStateReady, setIsStateReady] = useState(false);
  const [isDbRoom, setIsDbRoom] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [activePanel, setActivePanel] = useState<ActivePanel>("notice");
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");
  const [supplyInput, setSupplyInput] = useState("");
  const [questionInput, setQuestionInput] = useState("");
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [progressTitle, setProgressTitle] = useState("");
  const [progressContent, setProgressContent] = useState("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [graduationTargetId, setGraduationTargetId] = useState<string | null>(null);
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
      setCurrentUserName((user?.user_metadata?.nickname as string | undefined) ?? (user?.user_metadata?.name as string | undefined) ?? user?.email?.split("@")[0] ?? null);
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
        const [profilesResult, participantsResult, noticesResult, suppliesResult, threadsResult, threadCommentsResult, checkInsResult] = await Promise.all([
          dbRoomRow.host_user_id ? supabase.from("profiles").select("id, nickname").eq("id", dbRoomRow.host_user_id).maybeSingle() : Promise.resolve({ data: null }),
          supabase.from("companion_participants").select("*").eq("room_id", roomId).order("joined_at", { ascending: true }),
          supabase.from("companion_notices").select("*").eq("room_id", roomId).order("created_at", { ascending: false }),
          supabase.from("companion_supplies").select("*").eq("room_id", roomId).order("sort_order", { ascending: true }),
          supabase.from("companion_threads").select("*").eq("room_id", roomId).order("created_at", { ascending: false }),
          supabase.from("companion_thread_comments").select("id, thread_id, author_user_id, content, created_at, companion_threads!inner(room_id)").eq("companion_threads.room_id", roomId).order("created_at", { ascending: true }),
          supabase.from("companion_checkins").select("*").eq("room_id", roomId).order("created_at", { ascending: false }),
        ]);
        const participantRows = (((participantsResult.data ?? []) as Array<{ id: string; room_id: string; user_id: string; role: "host" | "participant" }>) ?? []);
        const threadRows = ((threadsResult.data ?? []) as CompanionThreadRow[]) ?? [];
        const checkInRows = ((checkInsResult.data ?? []) as CompanionCheckInRow[]) ?? [];
        const noticeRows = ((noticesResult.data ?? []) as CompanionNoticeRow[]) ?? [];
        const supplyRows = ((suppliesResult.data ?? []) as CompanionSupplyRow[]) ?? [];
        const threadCommentRows = (((threadCommentsResult.data ?? []) as CompanionThreadCommentRow[]) ?? []);
        const authorIds = Array.from(new Set([...
          participantRows.map((row) => row.user_id),
          ...threadRows.map((row) => row.author_user_id),
          ...threadCommentRows.map((row) => row.author_user_id),
          ...checkInRows.map((row) => row.author_user_id),
          ...noticeRows.map((row) => row.author_user_id),
          dbRoomRow.host_user_id ?? undefined,
        ].filter(Boolean))) as string[];
        let nicknameMap = new Map<string, string | null>();
        if (authorIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, nickname").in("id", authorIds);
          nicknameMap = new Map(((profiles ?? []) as Array<{ id: string; nickname: string | null }>).map((profile) => [profile.id, profile.nickname]));
        }
        const room = mapCompanionRoom(dbRoomRow, { hostName: (profilesResult.data as { id: string; nickname: string | null } | null)?.nickname ?? (dbRoomRow.host_user_id ? nicknameMap.get(dbRoomRow.host_user_id) ?? "진행자" : "진행자") });
        if (dbRoomRow.pattern_id) {
          const { data: patternRow } = await supabase.from("patterns").select("*").eq("id", dbRoomRow.pattern_id).maybeSingle();
          setLinkedPattern((patternRow as PatternItem | null) ?? null);
        }
        const { data: checkedRows } = supplyRows.length ? await supabase.from("companion_supply_checks").select("supply_id, user_id").in("supply_id", supplyRows.map((supply) => supply.id)) : { data: [] };
        const checkedBySupply = new Map<string, string[]>();
        (((checkedRows ?? []) as CompanionSupplyCheckRow[]) ?? []).forEach((row) => {
          const existing = checkedBySupply.get(row.supply_id) ?? [];
          existing.push(row.user_id);
          checkedBySupply.set(row.supply_id, existing);
        });
        const commentsByThreadId = new Map<string, DetailReply[]>();
        threadCommentRows.forEach((comment) => {
          const existing = commentsByThreadId.get(comment.thread_id) ?? [];
          existing.push({ id: comment.id, author: nicknameMap.get(comment.author_user_id) ?? "참여자", content: comment.content, createdAt: comment.created_at });
          commentsByThreadId.set(comment.thread_id, existing);
        });
        const boardMeta = readBoardMeta(room.id);
        const participants: DetailParticipant[] = [{ id: `${room.id}-host`, userId: room.hostUserId ?? `${room.id}-host`, name: room.hostName, role: "host" }, ...participantRows.filter((participant) => participant.role === "participant").map((participant) => ({ id: participant.id, userId: participant.user_id, name: nicknameMap.get(participant.user_id) ?? "참여자", role: "participant" as const }))];
        const boards: ProgressBoard[] = participants.filter((participant) => participant.role === "participant").map((participant) => {
          const posts = checkInRows.filter((checkIn) => checkIn.author_user_id === participant.userId).map((checkIn) => ({ id: checkIn.id, title: checkIn.title, content: checkIn.content, createdAt: checkIn.created_at })).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
          const meta = boardMeta[participant.userId] ?? {};
          return { id: `${room.id}-board-${participant.userId}`, userId: participant.userId, name: participant.name, lastActivityAt: getLatestTimestamp([meta.lastActivityAt, posts[0]?.createdAt, room.createdAt], room.createdAt), graduatedAt: meta.graduatedAt ?? null, posts };
        });
        setCurrentRoom(room);
        setDetailState({
          participants,
          notices: noticeRows.map((notice) => ({ id: notice.id, title: notice.title, content: notice.content, author: nicknameMap.get(notice.author_user_id) ?? room.hostName, createdAt: notice.created_at })),
          supplies: supplyRows.map((supply) => ({ id: supply.id, label: supply.label, checkedBy: checkedBySupply.get(supply.id) ?? [] })),
          questions: threadRows.filter((thread) => thread.type === "question").map((thread) => ({ id: thread.id, author: nicknameMap.get(thread.author_user_id) ?? "참여자", content: thread.content, createdAt: thread.created_at, replies: commentsByThreadId.get(thread.id) ?? [] })),
          boards,
        });
        setIsDbRoom(true); setHasLoadedRooms(true); setIsStateReady(true); return;
      }
      if (typeof window !== "undefined") {
        const customRooms = deserializeCompanionRooms(window.localStorage.getItem(customCompanionRoomsStorageKey));
        const localRoom = customRooms.find((item) => item.id === roomId) ?? getCompanionRoomById(roomId) ?? null;
        if (localRoom) {
          const storedDetail = readLocalDetailState(localRoom.id);
          const nextState = storedDetail ?? convertLegacyState(localRoom);
          if (!storedDetail) writeLocalDetailState(localRoom.id, nextState);
          setCurrentRoom(localRoom);
          setDetailState(nextState);
        } else { setCurrentRoom(null); setDetailState(null); }
      } else { setCurrentRoom(null); setDetailState(null); }
      setIsDbRoom(false); setHasLoadedRooms(true); setIsStateReady(true);
    }
    void loadRoomDetail();
  }, [roomId, supabase, reloadToken]);

  function persistLocalDetail(nextState: DetailState) {
    if (!currentRoom) return;
    setDetailState(nextState);
    writeLocalDetailState(currentRoom.id, nextState);
  }
  function updateBoardMeta(userId: string, patch: { lastActivityAt?: string; graduatedAt?: string | null }) {
    if (!currentRoom || !isDbRoom) return;
    const currentMeta = readBoardMeta(currentRoom.id);
    writeBoardMeta(currentRoom.id, { ...currentMeta, [userId]: { ...(currentMeta[userId] ?? {}), ...patch } });
  }

  const isHost = Boolean(currentRoom && ((currentRoom.hostUserId && currentUserId && currentRoom.hostUserId === currentUserId) || (!currentRoom.hostUserId && currentUserName && currentRoom.hostName === currentUserName)));
  const joinedBoard = useMemo(() => {
    if (!detailState) return null;
    return detailState.boards.find((board) => currentUserId && board.userId === currentUserId) ?? detailState.boards.find((board) => currentUserName && board.name === currentUserName) ?? null;
  }, [currentUserId, currentUserName, detailState]);
  const isJoined = Boolean(joinedBoard);
  const canAccessMemberPanels = isHost || isJoined;
  const canViewProgressPanels = isHost || isJoined;
  const visiblePanel = (activePanel === "supplies" && !canAccessMemberPanels) || ((["progress", "resting", "graduated"] as ActivePanel[]).includes(activePanel) && !canViewProgressPanels) ? "notice" : activePanel;
  const activeBoards = useMemo(() => (detailState?.boards ?? []).filter((board) => getBoardStatus(board) === "active"), [detailState]);
  const restingBoards = useMemo(() => (detailState?.boards ?? []).filter((board) => getBoardStatus(board) === "resting"), [detailState]);
  const graduatedBoards = useMemo(() => (detailState?.boards ?? []).filter((board) => getBoardStatus(board) === "graduated"), [detailState]);
  const activeParticipantCount = activeBoards.length;
  const isRecruitingOpen = currentRoom ? activeParticipantCount < currentRoom.capacity : false;
  const participantSupplyProgress = useMemo(() => (detailState?.boards ?? []).map((board) => ({ userId: board.userId, name: board.name, status: getBoardStatus(board), checkedCount: (detailState?.supplies ?? []).filter((supply) => supply.checkedBy.includes(board.userId)).length })), [detailState]);
  const boardGroups = useMemo(() => ({ progress: activeBoards, resting: restingBoards, graduated: graduatedBoards }), [activeBoards, restingBoards, graduatedBoards]);
  const currentBoards = useMemo(() => boardGroups[visiblePanel as "progress" | "resting" | "graduated"] ?? [], [boardGroups, visiblePanel]);
  const selectedBoard = currentBoards.find((board) => board.id === selectedBoardId) ?? currentBoards[0] ?? null;

  const patternPreview = useMemo(() => {
    if (!currentRoom) return null;
    if (currentRoom.patternSourceType === "site" && linkedPattern) {
      const parsedSize = parsePatternSize(linkedPattern.size || "");
      const detailRows = normalizeDetailRows(linkedPattern.detail_rows, linkedPattern.detail_content).filter((row) => row.instruction);
      return {
        title: linkedPattern.title,
        description: linkedPattern.description || "설명이 아직 등록되지 않았어요.",
        imageUrl: linkedPattern.image_path ? getPatternImageUrl(linkedPattern.image_path) : "",
        summaryRows: [{ label: "난이도", value: linkedPattern.level }, { label: "카테고리", value: linkedPattern.category }, { label: "태그", value: linkedPattern.tags?.length ? linkedPattern.tags.map((tag) => `#${tag}`).join(", ") : "-" }, { label: "작성자", value: linkedPattern.author_nickname ?? "-" }],
        prepRows: [{ label: "사용 실", value: linkedPattern.yarn || "-" }, { label: "바늘", value: linkedPattern.needle || "-" }, { label: "총량", value: linkedPattern.total_yarn_amount || "-" }, { label: "소요 시간", value: linkedPattern.duration || "-" }, { label: "완성 크기", value: parsedSize.sizeText || "-" }, { label: "게이지", value: parsedSize.gaugeText || "-" }],
        policyRows: [{ label: "원작자", value: linkedPattern.copyright_source || "-" }, ...copyrightPolicyRows.map((policy) => ({ label: policy.label, value: linkedPattern[policy.key] ? "O" : "X" }))],
        detailRows, actionHref: `/patterns/${linkedPattern.id}`, actionLabel: "도안 상세 보기",
      };
    }
    if (currentRoom.patternSourceType === "custom" && currentRoom.customPatternData) {
      const pattern = currentRoom.customPatternData;
      const parsedSize = parsePatternSize(pattern.size || "");
      const detailRows = normalizeDetailRows(pattern.detailRows ?? null, pattern.detailContent ?? null).filter((row) => row.instruction);
      return {
        title: pattern.title, description: pattern.description || "설명이 아직 등록되지 않았어요.", imageUrl: pattern.imagePath ? getPatternImageUrl(pattern.imagePath) : "",
        summaryRows: [{ label: "난이도", value: pattern.level }, { label: "카테고리", value: pattern.category }, { label: "태그", value: pattern.tags.length ? pattern.tags.map((tag) => `#${tag}`).join(", ") : "-" }, { label: "형태", value: "동행 전용 도안" }],
        prepRows: [{ label: "사용 실", value: pattern.yarn || "-" }, { label: "바늘", value: pattern.needle || "-" }, { label: "총량", value: pattern.totalYarnAmount || "-" }, { label: "소요 시간", value: pattern.duration || "-" }, { label: "완성 크기", value: parsedSize.sizeText || "-" }, { label: "게이지", value: parsedSize.gaugeText || "-" }],
        policyRows: [{ label: "원작자", value: pattern.copyrightSource || "-" }, { label: "취미 제작", value: pattern.copyrightHobbyOnly ? "O" : "X" }, { label: "색상 변형", value: pattern.copyrightColorVariation ? "O" : "X" }, { label: "사이즈 변형", value: pattern.copyrightSizeVariation ? "O" : "X" }, { label: "상업적 사용", value: pattern.copyrightCommercialUse ? "O" : "X" }, { label: "도안 재배포", value: pattern.copyrightRedistribution ? "O" : "X" }, { label: "수정본 판매", value: pattern.copyrightModificationResale ? "O" : "X" }],
        detailRows, actionHref: null as string | null, actionLabel: null as string | null,
      };
    }
    if (currentRoom.patternSourceType === "external") {
      return { title: currentRoom.patternName, description: "외부 링크로 연결된 도안이에요. 원문 페이지에서 자세한 안내와 파일을 확인할 수 있어요.", imageUrl: currentRoom.patternExternalImagePath ? getPatternImageUrl(currentRoom.patternExternalImagePath) : "", summaryRows: [{ label: "도안명", value: currentRoom.patternName || "-" }, { label: "연결 방식", value: "외부 링크" }, { label: "모집 상태", value: currentRoom.status }, { label: "난이도", value: currentRoom.level }], prepRows: [] as Array<{ label: string; value: string }>, policyRows: [] as Array<{ label: string; value: string }>, detailRows: [] as Array<{ id: string; rowNumber: number; instruction: string }>, actionHref: currentRoom.patternExternalUrl ?? null, actionLabel: "외부 도안 열기" };
    }
    return null;
  }, [currentRoom, linkedPattern]);

  async function ensureSignedIn() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !currentUserName) { setIsLoginModalOpen(true); return null; }
    return user;
  }
  async function handleJoinToggle() {
    if (!currentRoom || !detailState) return;
    const user = await ensureSignedIn();
    if (!user || !currentUserName) return;
    if (isHost) { alert("진행자는 자신의 동행방에서 나갈 수 없어요."); return; }
    if (!isJoined && !isRecruitingOpen) { alert("현재 정원이 가득 차 있어요."); return; }
    if (isDbRoom) {
      if (isJoined) {
        const { error } = await supabase.from("companion_participants").delete().eq("room_id", currentRoom.id).eq("user_id", user.id);
        if (error) { alert(error.message); return; }
      } else {
        const { error } = await supabase.from("companion_participants").insert({ room_id: currentRoom.id, user_id: user.id, role: "participant" });
        if (error) { alert(error.message); return; }
        updateBoardMeta(user.id, { lastActivityAt: new Date().toISOString(), graduatedAt: null });
      }
      setReloadToken((current) => current + 1); return;
    }
    const viewerId = currentUserId ?? currentUserName; if (!viewerId) return;
    if (isJoined) {
      persistLocalDetail({ ...detailState, participants: detailState.participants.filter((participant) => participant.userId !== viewerId), boards: detailState.boards.filter((board) => board.userId !== viewerId), supplies: detailState.supplies.map((supply) => ({ ...supply, checkedBy: supply.checkedBy.filter((userId) => userId !== viewerId) })) });
      return;
    }
    persistLocalDetail({ ...detailState, participants: [...detailState.participants, { id: `${currentRoom.id}-${viewerId}`, userId: viewerId, name: currentUserName, role: "participant" }], boards: [{ id: `${currentRoom.id}-board-${viewerId}`, userId: viewerId, name: currentUserName, lastActivityAt: new Date().toISOString(), graduatedAt: null, posts: [] }, ...detailState.boards] });
  }
  async function handleNoticeSubmit() {
    if (!currentRoom || !detailState || !isHost || !noticeTitle.trim() || !noticeContent.trim()) return;
    if (isDbRoom) {
      const user = await ensureSignedIn(); if (!user) return;
      const { error } = await supabase.from("companion_notices").insert({ room_id: currentRoom.id, author_user_id: user.id, title: noticeTitle.trim(), content: noticeContent.trim(), is_pinned: true });
      if (error) { alert(error.message); return; }
      setNoticeTitle(""); setNoticeContent(""); setReloadToken((current) => current + 1); return;
    }
    persistLocalDetail({ ...detailState, notices: [{ id: `${currentRoom.id}-notice-${Date.now()}`, title: noticeTitle.trim(), content: noticeContent.trim(), author: currentRoom.hostName, createdAt: new Date().toISOString() }, ...detailState.notices] });
    setNoticeTitle(""); setNoticeContent("");
  }
  async function handleSupplyAdd() {
    if (!currentRoom || !detailState || !isHost || !supplyInput.trim()) return;
    if (isDbRoom) {
      const { error } = await supabase.from("companion_supplies").insert({ room_id: currentRoom.id, label: supplyInput.trim(), sort_order: detailState.supplies.length + 1 });
      if (error) { alert(error.message); return; }
      setSupplyInput(""); setReloadToken((current) => current + 1); return;
    }
    persistLocalDetail({ ...detailState, supplies: [...detailState.supplies, { id: `${currentRoom.id}-supply-${Date.now()}`, label: supplyInput.trim(), checkedBy: [] }] });
    setSupplyInput("");
  }
  async function handleSupplyRemove(supplyId: string) {
    if (!currentRoom || !detailState || !isHost) return;
    if (isDbRoom) {
      const { error } = await supabase.from("companion_supplies").delete().eq("id", supplyId);
      if (error) { alert(error.message); return; }
      setReloadToken((current) => current + 1); return;
    }
    persistLocalDetail({ ...detailState, supplies: detailState.supplies.filter((supply) => supply.id !== supplyId) });
  }
  async function handleSupplyToggle(supplyId: string) {
    if (!currentRoom || !detailState || !canAccessMemberPanels || isHost) return;
    const user = await ensureSignedIn(); if (!user) return;
    const currentSupply = detailState.supplies.find((supply) => supply.id === supplyId); if (!currentSupply) return;
    const isChecked = currentSupply.checkedBy.includes(user.id);
    if (isDbRoom) {
      if (isChecked) {
        const { error } = await supabase.from("companion_supply_checks").delete().eq("supply_id", supplyId).eq("user_id", user.id);
        if (error) { alert(error.message); return; }
      } else {
        const { error } = await supabase.from("companion_supply_checks").insert({ supply_id: supplyId, user_id: user.id });
        if (error) { alert(error.message); return; }
      }
      setReloadToken((current) => current + 1); return;
    }
    persistLocalDetail({ ...detailState, supplies: detailState.supplies.map((supply) => supply.id === supplyId ? { ...supply, checkedBy: isChecked ? supply.checkedBy.filter((userId) => userId !== user.id) : [...supply.checkedBy, user.id] } : supply) });
  }
  async function handleQuestionSubmit() {
    if (!currentRoom || !detailState || !questionInput.trim()) return;
    const user = await ensureSignedIn(); if (!user || !currentUserName) return;
    if (isDbRoom) {
      const { error } = await supabase.from("companion_threads").insert({ room_id: currentRoom.id, author_user_id: user.id, type: "question", content: questionInput.trim() });
      if (error) { alert(error.message); return; }
      setQuestionInput(""); setReloadToken((current) => current + 1); return;
    }
    persistLocalDetail({ ...detailState, questions: [{ id: `${currentRoom.id}-question-${Date.now()}`, author: currentUserName, content: questionInput.trim(), createdAt: new Date().toISOString(), replies: [] }, ...detailState.questions] });
    setQuestionInput("");
  }
  async function handleReplySubmit(questionId: string) {
    if (!currentRoom || !detailState) return;
    const reply = replyInputs[questionId]?.trim(); if (!reply) return;
    const user = await ensureSignedIn(); if (!user || !currentUserName) return;
    if (isDbRoom) {
      const { error } = await supabase.from("companion_thread_comments").insert({ thread_id: questionId, author_user_id: user.id, content: reply });
      if (error) { alert(error.message); return; }
      setReplyInputs((current) => ({ ...current, [questionId]: "" })); setReloadToken((current) => current + 1); return;
    }
    persistLocalDetail({ ...detailState, questions: detailState.questions.map((question) => question.id === questionId ? { ...question, replies: [...question.replies, { id: `${questionId}-reply-${Date.now()}`, author: currentUserName, content: reply, createdAt: new Date().toISOString() }] } : question) });
    setReplyInputs((current) => ({ ...current, [questionId]: "" }));
  }
  async function handleProgressSubmit(board: ProgressBoard) {
    if (!currentRoom || !detailState || !progressTitle.trim() || !progressContent.trim()) return;
    const viewerOwnsBoard = (currentUserId && board.userId === currentUserId) || (currentUserName && board.name === currentUserName); if (!viewerOwnsBoard) return;
    const user = await ensureSignedIn(); if (!user) return;
    if (isDbRoom) {
      const { error } = await supabase.from("companion_checkins").insert({ room_id: currentRoom.id, author_user_id: user.id, title: progressTitle.trim(), content: progressContent.trim() });
      if (error) { alert(error.message); return; }
      updateBoardMeta(board.userId, { lastActivityAt: new Date().toISOString(), graduatedAt: null });
      setProgressTitle(""); setProgressContent(""); setReloadToken((current) => current + 1); return;
    }
    persistLocalDetail({ ...detailState, boards: detailState.boards.map((item) => item.id === board.id ? { ...item, lastActivityAt: new Date().toISOString(), posts: [{ id: `${item.id}-post-${Date.now()}`, title: progressTitle.trim(), content: progressContent.trim(), createdAt: new Date().toISOString() }, ...item.posts] } : item) });
    setProgressTitle(""); setProgressContent("");
  }
  function handleReactivate(board: ProgressBoard) {
    if (!currentRoom || !detailState) return;
    const viewerOwnsBoard = (currentUserId && board.userId === currentUserId) || (currentUserName && board.name === currentUserName); if (!viewerOwnsBoard) return;
    if (activeParticipantCount >= currentRoom.capacity) { alert("정원이 가득 차 있어 휴면 해제를 할 수 없어요."); return; }
    if (isDbRoom) { updateBoardMeta(board.userId, { lastActivityAt: new Date().toISOString(), graduatedAt: null }); setReloadToken((current) => current + 1); return; }
    persistLocalDetail({ ...detailState, boards: detailState.boards.map((item) => item.id === board.id ? { ...item, lastActivityAt: new Date().toISOString(), graduatedAt: null } : item) });
  }
  function openGraduationModal(board: ProgressBoard) {
    const viewerOwnsBoard = (currentUserId && board.userId === currentUserId) || (currentUserName && board.name === currentUserName);
    if (viewerOwnsBoard) setGraduationTargetId(board.id);
  }
  function confirmGraduation() {
    if (!currentRoom || !detailState || !graduationTargetId) return;
    const targetBoard = detailState.boards.find((board) => board.id === graduationTargetId); if (!targetBoard) { setGraduationTargetId(null); return; }
    if (isDbRoom) { updateBoardMeta(targetBoard.userId, { graduatedAt: new Date().toISOString(), lastActivityAt: targetBoard.lastActivityAt }); setGraduationTargetId(null); setReloadToken((current) => current + 1); return; }
    persistLocalDetail({ ...detailState, boards: detailState.boards.map((board) => board.id === graduationTargetId ? { ...board, graduatedAt: new Date().toISOString() } : board) }); setGraduationTargetId(null);
  }

  if (!hasLoadedRooms || !isStateReady) return <section className={styles.feedbackCard}><p className={styles.sectionDescription}>동행방을 불러오는 중이에요...</p></section>;
  if (!currentRoom || !detailState) return <section className={styles.feedbackCard}><h1 className={styles.sectionTitle}>동행방을 찾을 수 없어요</h1><p className={styles.sectionDescription}>요청하신 동행방이 없거나 아직 불러오지 못했어요.</p><Link href="/companion" className={styles.submitButton}>목록으로</Link></section>;
  const questionList = [...detailState.questions].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  return (
    <>
      <LoginRequiredModal open={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} title="로그인 후 동행방 기능을 사용할 수 있어요" description="로그인하면 참여 신청, 준비물 체크, 질문 작성, 진행 기록 등록까지 바로 이어서 할 수 있어요." />
      <div className={styles.shell}><div className={styles.workspace}><div className={styles.mainColumn}>
        <section className={`${styles.hero} ${styles.heroCompact}`}>
          <div className={styles.heroBody}>
            <h1 className={styles.heroTitle}>{currentRoom.title}</h1>
            <div className={styles.heroMeta}>
              <span className={`${styles.pill} ${getStatusClassName(currentRoom.status)}`}>{currentRoom.status}</span>
              <span className={`${styles.pill} ${styles.pillMuted}`}>{currentRoom.patternName}</span>
              <span className={`${styles.pill} ${styles.pillMuted}`}>@{currentRoom.hostName}</span>
              <span className={`${styles.pill} ${styles.pillMuted}`}>{formatCompanionSchedule(currentRoom)}</span>
              <span className={`${styles.pill} ${styles.pillMuted}`}>참여 {activeParticipantCount}/{currentRoom.capacity}</span>
            </div>
          </div>
          <div className={styles.heroActions}><div className={styles.actionRow}>
            <button type="button" onClick={handleJoinToggle} className={styles.submitButton}>{isJoined ? "참여 취소" : isRecruitingOpen ? "참여 신청" : "정원 마감"}</button>
            <span aria-hidden="true" className={styles.heroActionDivider} />
            <button type="button" onClick={() => setActivePanel("pattern")} className={styles.ghostButton}>연결 도안 보기</button>
            {isHost ? <Link href={`/companion/${currentRoom.id}/edit`} className={styles.ghostButton}>동행방 수정</Link> : null}
            <Link href="/companion" className={styles.secondaryAction}>목록으로</Link>
          </div>{!isRecruitingOpen && !isJoined ? <span className={styles.hintText}>현재 진행 인원이 정원에 도달해 참여 신청이 닫혀 있어요.</span> : null}</div>
        </section>
        <section className={`${styles.sectionCard} ${styles.sectionSpanFull} ${styles.commentsSection}`}>
          <div className={styles.tabRow}>
            <button type="button" className={visiblePanel === "notice" ? styles.tabActive : styles.tabButton} onClick={() => setActivePanel("notice")}>공지</button>
            <button type="button" className={visiblePanel === "pattern" ? styles.tabActive : styles.tabButton} onClick={() => setActivePanel("pattern")}>도안</button>
            {canAccessMemberPanels ? <button type="button" className={visiblePanel === "supplies" ? styles.tabActive : styles.tabButton} onClick={() => setActivePanel("supplies")}>준비물</button> : null}
            <button type="button" className={visiblePanel === "questions" ? styles.tabActive : styles.tabButton} onClick={() => setActivePanel("questions")}>질문</button>
            {canViewProgressPanels ? <><button type="button" className={visiblePanel === "progress" ? styles.tabActive : styles.tabButton} onClick={() => setActivePanel("progress")}>진행</button><button type="button" className={visiblePanel === "resting" ? styles.tabActive : styles.tabButton} onClick={() => setActivePanel("resting")}>휴식</button><button type="button" className={visiblePanel === "graduated" ? styles.tabActive : styles.tabButton} onClick={() => setActivePanel("graduated")}>졸업</button></> : null}
          </div>
          {visiblePanel === "notice" ? <><div className={styles.sectionHead}><div><h2 className={styles.sectionTitle}>공지</h2><p className={styles.sectionDescription}>모든 사람이 볼 수 있고, 진행자만 공지를 작성할 수 있어요.</p></div><span className={`${styles.pill} ${styles.pillMuted}`}>{detailState.notices.length}개</span></div>{isHost ? <div className={styles.composer}><label className={styles.label}>공지 작성</label><input value={noticeTitle} onChange={(event) => setNoticeTitle(event.target.value)} placeholder="공지 제목" className={styles.input} /><textarea value={noticeContent} onChange={(event) => setNoticeContent(event.target.value)} placeholder="참여자에게 안내할 공지 내용을 적어주세요." rows={4} className={styles.textarea} /><div className={styles.composerFooter}><button type="button" onClick={() => void handleNoticeSubmit()} className={styles.submitButton}>공지 등록</button></div></div> : null}<div className={styles.commentList}>{detailState.notices.length > 0 ? detailState.notices.map((notice) => <article key={notice.id} className={styles.commentCard}><div className={styles.commentHead}><div className={styles.commentMeta}><span className={styles.commentAuthor}>{notice.title}</span><span className={styles.commentDate}>{formatDateTimeLabel(notice.createdAt)}</span></div></div><p className={styles.commentBody}>{notice.content}</p></article>) : <div className={styles.emptyState}><p className={styles.emptyStateTitle}>아직 등록된 공지가 없어요</p><p className={styles.emptyStateDescription}>진행자가 첫 안내를 등록하면 이곳에서 모두가 확인할 수 있어요.</p></div>}</div></> : null}
          {visiblePanel === "pattern" ? <><div className={styles.sectionHead}><div><h2 className={styles.sectionTitle}>연결 도안</h2><p className={styles.sectionDescription}>도안 정보는 누구나 바로 확인할 수 있어요.</p></div></div>{patternPreview ? <><div className={styles.compactIntroGrid}><div className={styles.introMain}><div className={styles.imageStage}><div className={styles.imageWrap}>{patternPreview.imageUrl ? <Image src={patternPreview.imageUrl} alt={patternPreview.title} fill sizes="(max-width: 920px) 100vw, 46vw" /> : <div className={styles.imageFallback}>사진 없음</div>}</div></div><div className={styles.descriptionCard}><p className={styles.descriptionText}>{patternPreview.description}</p></div></div><div className={styles.introSide}><div className={styles.infoStack}><section className={styles.sectionCard}><div className={styles.summaryList}>{patternPreview.summaryRows.map((row) => <div key={row.label} className={styles.summaryRow}><span>{row.label}</span><span className={styles.summaryValue}>{row.value}</span></div>)}</div></section>{patternPreview.prepRows.length > 0 ? <section className={styles.sectionCard}><div className={styles.prepGrid}>{patternPreview.prepRows.map((row) => <div key={row.label} className={styles.summaryRow}><span>{row.label}</span><span className={styles.summaryValue}>{row.value}</span></div>)}</div></section> : null}{patternPreview.policyRows.length > 0 ? <section className={styles.sectionCard}><div className={styles.policyGrid}>{patternPreview.policyRows.map((row, index) => <div key={`${row.label}-${index}`} className={index === 0 ? styles.summaryRow : styles.policyRow}><span className={index === 0 ? undefined : styles.fieldLabel}>{row.label}</span>{index === 0 ? <span className={styles.summaryValue}>{row.value}</span> : <span className={`${styles.policyState} ${row.value === "O" ? styles.policyAllowed : styles.policyDenied}`}>{row.value}</span>}</div>)}{patternPreview.actionHref && patternPreview.actionLabel ? <div className={styles.summaryRow}><span>링크</span><Link href={patternPreview.actionHref} target={patternPreview.actionHref.startsWith("http") ? "_blank" : undefined} rel={patternPreview.actionHref.startsWith("http") ? "noreferrer" : undefined} className={styles.secondaryLinkAction}>{patternPreview.actionLabel}</Link></div> : null}</div></section> : null}</div></div></div><section className={`${styles.sectionCard} ${styles.sheetCard}`}><div className={styles.sectionHead}><div><h3 className={styles.sectionTitle}>도안 세부 내용</h3><p className={styles.sectionDescription}>행별 설명과 사용 범위를 함께 볼 수 있어요.</p></div></div>{patternPreview.detailRows.length > 0 ? <div className={styles.detailList}>{patternPreview.detailRows.map((row) => <div key={row.id} className={styles.detailItem}><div className={styles.detailMeta}><span className={styles.detailIndex}>{row.rowNumber}단</span><span className={styles.detailPreview}>{row.instruction.length > 28 ? `${row.instruction.slice(0, 28)}...` : row.instruction}</span></div><p className={styles.detailText}>{row.instruction}</p></div>)}</div> : <div className={styles.emptyState}><p className={styles.emptyStateTitle}>세부 설명이 아직 없어요</p><p className={styles.emptyStateDescription}>작성자가 상세 행 설명을 입력하면 여기에 표시됩니다.</p></div>}</section></> : <div className={styles.emptyState}><p className={styles.emptyStateTitle}>연결된 도안 정보가 없어요</p><p className={styles.emptyStateDescription}>이 동행방은 아직 상세 도안을 연결하지 않았어요.</p></div>}</> : null}
          {visiblePanel === "supplies" ? <><div className={styles.sectionHead}><div><h2 className={styles.sectionTitle}>준비물</h2><p className={styles.sectionDescription}>참여자만 확인할 수 있고, 진행자는 목록을 수정할 수 있어요.</p></div><span className={`${styles.pill} ${styles.pillMuted}`}>{detailState.supplies.length}개</span></div>{isHost ? <div className={styles.composer}><label className={styles.label}>준비물 항목 추가</label><div className={styles.inlineActionGroup}><input value={supplyInput} onChange={(event) => setSupplyInput(event.target.value)} placeholder="예: 줄자, 단수링, 표시핀" className={styles.input} /><button type="button" onClick={() => void handleSupplyAdd()} className={styles.smallButton}>추가</button></div></div> : null}{isHost ? <div className={styles.summaryList}>{participantSupplyProgress.map((participant) => <div key={participant.userId} className={styles.summaryRow}><span>{participant.name} <span className={`${styles.pill} ${getBoardStatusTone(participant.status)}`}>{getBoardStatusLabel(participant.status)}</span></span><span className={styles.summaryValue}>{participant.checkedCount}/{detailState.supplies.length || 0}</span></div>)}</div> : null}<div className={styles.commentList}>{detailState.supplies.length > 0 ? detailState.supplies.map((supply) => { const isChecked = Boolean(currentUserId && supply.checkedBy.includes(currentUserId)); return <article key={supply.id} className={styles.supplyCard}><div className={styles.supplyCardHead}><label className={styles.supplyToggleRow}>{!isHost ? <input type="checkbox" checked={isChecked} onChange={() => void handleSupplyToggle(supply.id)} className={styles.checkboxInput} /> : null}<span className={styles.supplyLabel}>{supply.label}</span></label>{isHost ? <button type="button" onClick={() => void handleSupplyRemove(supply.id)} className={styles.textButtonDanger}>삭제</button> : null}</div><p className={styles.sectionDescription}>{isHost ? (participantSupplyProgress.length > 0 ? participantSupplyProgress.map((participant) => `${participant.name} ${participant.checkedCount}/${detailState.supplies.length || 0}`).join(" · ") : "아직 참여자가 없어요.") : `체크한 참여자 ${supply.checkedBy.length}명`}</p></article>; }) : <div className={styles.emptyState}><p className={styles.emptyStateTitle}>등록된 준비물이 없어요</p><p className={styles.emptyStateDescription}>진행자가 첫 준비물 항목을 추가하면 참여자가 바로 체크할 수 있어요.</p></div>}</div></> : null}
          {visiblePanel === "questions" ? <><div className={styles.sectionHead}><div><h2 className={styles.sectionTitle}>질문</h2><p className={styles.sectionDescription}>질문 글 아래에 댓글을 달아 한 단계까지 답변을 이어갈 수 있어요.</p></div><span className={`${styles.pill} ${styles.pillMuted}`}>{questionList.length}개</span></div><div className={styles.composer}><label className={styles.label}>질문 작성</label><textarea value={questionInput} onChange={(event) => setQuestionInput(event.target.value)} placeholder="도안, 일정, 재료에 대해 궁금한 점을 남겨보세요." rows={4} className={styles.textarea} /><div className={styles.composerFooter}><button type="button" onClick={() => void handleQuestionSubmit()} className={styles.submitButton}>질문 등록</button></div></div><div className={styles.commentList}>{questionList.length > 0 ? questionList.map((question) => <article key={question.id} className={styles.commentCard}><div className={styles.commentHead}><div className={styles.commentMeta}><span className={styles.commentAuthor}>@{question.author}</span><span className={styles.commentDate}>{formatDateTimeLabel(question.createdAt)}</span></div></div><p className={styles.commentBody}>{question.content}</p><div className={styles.replyList}>{question.replies.map((reply) => <div key={reply.id} className={styles.replyCard}><div className={styles.commentMeta}><span className={styles.commentAuthor}>@{reply.author}</span><span className={styles.commentDate}>{formatDateTimeLabel(reply.createdAt)}</span></div><p className={styles.commentBody}>{reply.content}</p></div>)}</div><div className={styles.inlineForm}><label className={styles.label}>답글 입력</label><textarea value={replyInputs[question.id] ?? ""} onChange={(event) => setReplyInputs((current) => ({ ...current, [question.id]: event.target.value }))} placeholder="한 단계까지만 답글을 이어갈 수 있어요." rows={3} className={styles.inlineTextarea} /><div className={styles.inlineActions}><button type="button" onClick={() => void handleReplySubmit(question.id)} className={styles.smallButton}>답글 등록</button></div></div></article>) : <div className={styles.emptyState}><p className={styles.emptyStateTitle}>아직 질문이 없어요</p><p className={styles.emptyStateDescription}>첫 질문을 남기면 진행자와 참여자가 함께 답변을 이어갈 수 있어요.</p></div>}</div></> : null}
          {["progress", "resting", "graduated"].includes(visiblePanel) ? <><div className={styles.sectionHead}><div><h2 className={styles.sectionTitle}>{visiblePanel === "progress" ? "진행" : visiblePanel === "resting" ? "휴식" : "졸업"}</h2><p className={styles.sectionDescription}>{visiblePanel === "progress" ? "참여자마다 카드가 생성되고, 본인만 자신의 진행 기록을 등록할 수 있어요." : visiblePanel === "resting" ? "1주일 넘게 기록이 없으면 자동으로 이 칸으로 이동하고 정원에서도 빠져요." : "완료 후 졸업을 누른 참여자 카드가 이동하며 다시 진행으로 돌아갈 수 없어요."}</p></div><span className={`${styles.pill} ${styles.pillMuted}`}>{currentBoards.length}명</span></div><div className={styles.boardColumns}><div className={styles.boardRail}>{currentBoards.length > 0 ? currentBoards.map((board) => { const status = getBoardStatus(board); return <button key={board.id} type="button" className={`${styles.boardCard} ${selectedBoard?.id === board.id ? styles.boardCardActive : ""}`} onClick={() => setSelectedBoardId(board.id)}><div className={styles.boardCardHead}><strong className={styles.boardName}>{board.name}</strong><span className={`${styles.pill} ${getBoardStatusTone(status)}`}>{getBoardStatusLabel(status)}</span></div><p className={styles.boardMetaText}>최근 활동 {formatDateTimeLabel(board.lastActivityAt)}</p><p className={styles.boardMetaText}>기록 {board.posts.length}개</p></button>; }) : <div className={styles.emptyState}><p className={styles.emptyStateTitle}>해당 상태의 참여자가 아직 없어요</p><p className={styles.emptyStateDescription}>참여자가 생기면 이곳에 카드가 만들어집니다.</p></div>}</div><div className={styles.boardPanel}>{selectedBoard ? <><div className={styles.boardPanelHead}><div><h3 className={styles.sectionTitle}>{selectedBoard.name}님의 보드</h3><p className={styles.sectionDescription}>최근 활동 {formatDateTimeLabel(selectedBoard.lastActivityAt)}</p></div><div className={styles.inlineActionGroup}><span className={`${styles.pill} ${getBoardStatusTone(getBoardStatus(selectedBoard))}`}>{getBoardStatusLabel(getBoardStatus(selectedBoard))}</span>{getBoardStatus(selectedBoard) === "resting" && ((currentUserId && selectedBoard.userId === currentUserId) || (currentUserName && selectedBoard.name === currentUserName)) ? <button type="button" onClick={() => handleReactivate(selectedBoard)} className={styles.smallButton}>휴면 해제</button> : null}{getBoardStatus(selectedBoard) === "active" && ((currentUserId && selectedBoard.userId === currentUserId) || (currentUserName && selectedBoard.name === currentUserName)) ? <button type="button" onClick={() => openGraduationModal(selectedBoard)} className={styles.dangerButton}>졸업</button> : null}</div></div>{getBoardStatus(selectedBoard) === "resting" ? <div className={styles.infoNote}>최근 1주일 동안 기록이 없어 휴식 상태로 이동했어요. 정원이 비어 있으면 휴면 해제로 다시 진행 칸으로 돌아올 수 있어요.</div> : null}{getBoardStatus(selectedBoard) === "graduated" ? <div className={styles.infoNote}>이 참여자는 졸업 상태예요. 졸업 후에는 다시 진행 상태로 변경할 수 없어요.</div> : null}{getBoardStatus(selectedBoard) === "active" && ((currentUserId && selectedBoard.userId === currentUserId) || (currentUserName && selectedBoard.name === currentUserName)) ? <div className={styles.composer}><label className={styles.label}>내 진행 기록 작성</label><input value={progressTitle} onChange={(event) => setProgressTitle(event.target.value)} placeholder="기록 제목" className={styles.input} /><textarea value={progressContent} onChange={(event) => setProgressContent(event.target.value)} placeholder="오늘 어디까지 진행했는지 적어보세요." rows={4} className={styles.textarea} /><div className={styles.composerFooter}><button type="button" onClick={() => void handleProgressSubmit(selectedBoard)} className={styles.submitButton}>진행 기록 등록</button></div></div> : null}<div className={styles.boardTimeline}>{selectedBoard.posts.length > 0 ? selectedBoard.posts.map((post) => <article key={post.id} className={styles.timelineCard}><div className={styles.commentMeta}><span className={styles.commentAuthor}>{post.title}</span><span className={styles.commentDate}>{formatDateTimeLabel(post.createdAt)}</span></div><p className={styles.commentBody}>{post.content}</p></article>) : <div className={styles.emptyState}><p className={styles.emptyStateTitle}>아직 등록된 진행 기록이 없어요</p><p className={styles.emptyStateDescription}>첫 기록을 남기면 준비도와 휴식 전환 기준도 함께 따라갑니다.</p></div>}</div></> : <div className={styles.emptyState}><p className={styles.emptyStateTitle}>선택된 참여자 카드가 없어요</p><p className={styles.emptyStateDescription}>왼쪽 카드 목록에서 참여자를 선택하면 개인 보드가 열립니다.</p></div>}</div></div></> : null}
        </section>
      </div><aside className={styles.sideColumn}><section className={styles.sectionCard}><div className={styles.summaryList}><div className={styles.summaryRow}><span>진행자</span><span className={styles.summaryValue}>@{currentRoom.hostName}</span></div><div className={styles.summaryRow}><span>일정</span><span className={styles.summaryValue}>{formatCompanionSchedule(currentRoom)}</span></div><div className={styles.summaryRow}><span>난이도</span><span className={styles.summaryValue}>{currentRoom.level}</span></div><div className={styles.summaryRow}><span>도안 방식</span><span className={styles.summaryValue}>{getPatternSourceLabel(currentRoom)}</span></div><div className={styles.summaryRow}><span>참여 인원</span><span className={styles.summaryValue}>{activeParticipantCount}/{currentRoom.capacity}</span></div></div></section><section className={styles.sectionCard}><div className={styles.sectionHead}><div><h3 className={styles.sectionTitle}>동행방 안내</h3><p className={styles.sectionDescription}>현재 방의 진행 방식과 핵심 규칙을 한눈에 볼 수 있어요.</p></div></div><div className={styles.commentList}><article className={styles.commentCard}><p className={styles.commentBody}>{currentRoom.summary}</p></article><article className={styles.commentCard}><p className={styles.commentBody}>준비물은 참여자만 확인할 수 있고, 진행자는 각 참여자의 준비도를 {detailState.supplies.length || 0}개 기준으로 확인할 수 있어요.</p></article><article className={styles.commentCard}><p className={styles.commentBody}>진행 기록이 1주일 이상 멈추면 자동으로 휴식 칸으로 이동하고, 완료 후 졸업하면 다시 진행 칸으로 돌아올 수 없어요.</p></article></div></section>{canViewProgressPanels ? <section className={styles.sectionCard}><div className={styles.summaryList}><div className={styles.summaryRow}><span>진행</span><span className={styles.summaryValue}>{activeBoards.length}</span></div><div className={styles.summaryRow}><span>휴식</span><span className={styles.summaryValue}>{restingBoards.length}</span></div><div className={styles.summaryRow}><span>졸업</span><span className={styles.summaryValue}>{graduatedBoards.length}</span></div><div className={styles.summaryRow}><span>준비도 체크</span><span className={styles.summaryValue}>{detailState.supplies.length > 0 ? `${participantSupplyProgress.filter((row) => row.checkedCount === detailState.supplies.length).length}/${detailState.boards.length}` : `0/${detailState.boards.length}`}</span></div></div></section> : null}</aside></div></div>
      {graduationTargetId ? <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="졸업 확인"><div className={styles.modalDialog}><h2 className={styles.modalTitle}>정말 졸업하시겠습니까?</h2><p className={styles.sectionDescription}>졸업 상태가 되면 다시 진행 상태로 돌아올 수 없고, 정원 카운트에서도 빠집니다.</p><div className={styles.modalActions}><button type="button" onClick={() => setGraduationTargetId(null)} className={styles.secondaryAction}>취소</button><button type="button" onClick={confirmGraduation} className={styles.dangerButton}>졸업 확정</button></div></div></div> : null}
    </>
  );
}





