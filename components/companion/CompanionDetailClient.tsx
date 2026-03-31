"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
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
type ProgressPanel = "progress" | "resting" | "graduated";
type DetailParticipant = { id: string; userId: string; name: string; role: "host" | "participant"; joinedAt: string };
type DetailWaitingParticipant = { id: string; userId: string; name: string; joinedAt: string };
type DetailNotice = { id: string; title: string; content: string; author: string; createdAt: string; isPinned?: boolean };
type DetailSupply = { id: string; label: string; checkedBy: string[] };
type DetailReply = { id: string; author: string; content: string; createdAt: string };
type DetailQuestion = { id: string; author: string; content: string; createdAt: string; replies: DetailReply[] };
type ProgressPost = { id: string; title: string; content: string; imagePath: string | null; createdAt: string };
type ProgressBoard = { id: string; userId: string; name: string; role: "host" | "participant"; lastActivityAt: string; graduatedAt: string | null; posts: ProgressPost[] };
type DetailState = { participants: DetailParticipant[]; waitingParticipants: DetailWaitingParticipant[]; notices: DetailNotice[]; supplies: DetailSupply[]; questions: DetailQuestion[]; boards: ProgressBoard[] };
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
function formatElapsedDayLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diff = Date.now() - date.getTime();
  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  if (days === 0) return "오늘";
  return `${days}일 전`;
}
function getProgressImageUrl(imagePath: string | null | undefined) {
  if (!imagePath) return "";
  if (imagePath.startsWith("data:") || imagePath.startsWith("blob:")) return imagePath;
  return getPatternImageUrl(imagePath);
}
function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("이미지 파일을 읽을 수 없어요."));
    reader.readAsDataURL(file);
  });
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
    isPinned: false,
  };
}
function getLatestTimestamp(values: Array<string | null | undefined>, fallback: string) {
  const valid = values.map((value) => (value ? new Date(value).getTime() : Number.NaN)).filter((value) => Number.isFinite(value)) as number[];
  return valid.length ? new Date(Math.max(...valid)).toISOString() : fallback;
}
function sortWaitingParticipantsByJoinedAt(participants: DetailWaitingParticipant[]) {
  return [...participants].sort((left, right) => {
    const leftTime = new Date(left.joinedAt).getTime();
    const rightTime = new Date(right.joinedAt).getTime();
    return (Number.isNaN(leftTime) ? 0 : leftTime) - (Number.isNaN(rightTime) ? 0 : rightTime);
  });
}
function promoteFirstWaitingParticipantLocal(roomId: string, state: DetailState) {
  if (state.waitingParticipants.length === 0) return state;
  const waitingQueue = sortWaitingParticipantsByJoinedAt(state.waitingParticipants);
  const nextWaiting = waitingQueue[0];
  const existingParticipant = state.participants.find((participant) => participant.userId === nextWaiting.userId);
  const existingBoard = state.boards.find((board) => board.userId === nextWaiting.userId);
  const nextParticipants: DetailParticipant[] = existingParticipant
    ? state.participants.map((participant) =>
        participant.userId === nextWaiting.userId
          ? { ...participant, joinedAt: new Date().toISOString(), role: "participant" as const }
          : participant
      )
    : [
        ...state.participants,
        {
          id: `${roomId}-${nextWaiting.userId}`,
          userId: nextWaiting.userId,
          name: nextWaiting.name,
          role: "participant",
          joinedAt: new Date().toISOString(),
        },
      ];
  const nextBoards: ProgressBoard[] = existingBoard
    ? state.boards.map((board) =>
        board.userId === nextWaiting.userId
          ? { ...board, lastActivityAt: new Date().toISOString(), graduatedAt: null }
          : board
      )
    : [
        ...state.boards,
        {
          id: `${roomId}-board-${nextWaiting.userId}`,
          userId: nextWaiting.userId,
          name: nextWaiting.name,
          role: "participant",
          lastActivityAt: new Date().toISOString(),
          graduatedAt: null,
          posts: [],
        },
      ];

  return {
    ...state,
    waitingParticipants: waitingQueue.slice(1),
    participants: nextParticipants,
    boards: nextBoards,
  };
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
  const participants: DetailParticipant[] = legacy.participants.map((participant) => ({ id: participant.id, userId: participant.id, name: participant.name, role: participant.role === "진행자" ? "host" : "participant", joinedAt: room.createdAt }));
  const postsByAuthor = new Map<string, ProgressPost[]>();
  legacy.checkIns.forEach((checkIn) => {
    const existing = postsByAuthor.get(checkIn.author) ?? [];
    existing.push({ id: checkIn.id, title: checkIn.title, content: checkIn.content, imagePath: null, createdAt: checkIn.createdAt });
    postsByAuthor.set(checkIn.author, existing);
  });
  return {
    participants,
    waitingParticipants: [],
    notices: legacy.notices.map((notice, index) => parseLegacyNotice(notice, index, room)),
    supplies: legacy.supplies.map((supply) => ({ id: supply.id, label: supply.label, checkedBy: [] })),
    questions: legacy.threads.filter((thread) => thread.type === "질문").map((thread) => ({ id: thread.id, author: thread.author, content: thread.content, createdAt: thread.createdAt, replies: (thread.comments ?? []).map((comment) => ({ id: comment.id, author: comment.author, content: comment.content, createdAt: comment.createdAt })) })),
    boards: participants.map((participant) => ({ id: `board-${participant.userId}`, userId: participant.userId, name: participant.name, role: participant.role, lastActivityAt: (postsByAuthor.get(participant.name) ?? [])[0]?.createdAt ?? room.createdAt, graduatedAt: null, posts: (postsByAuthor.get(participant.name) ?? []).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()) })),
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
  const [isNoticeComposerOpen, setIsNoticeComposerOpen] = useState(false);
  const [isSupplyComposerOpen, setIsSupplyComposerOpen] = useState(false);
  const [isQuestionComposerOpen, setIsQuestionComposerOpen] = useState(false);
  const [supplyParticipantPage, setSupplyParticipantPage] = useState(1);
  const [progressPanelPages, setProgressPanelPages] = useState<Record<ProgressPanel, number>>({ progress: 1, resting: 1, graduated: 1 });
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [editingNoticeTitle, setEditingNoticeTitle] = useState("");
  const [editingNoticeContent, setEditingNoticeContent] = useState("");
  const [supplyInput, setSupplyInput] = useState("");
  const [questionInput, setQuestionInput] = useState("");
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [progressTitle, setProgressTitle] = useState("");
  const [progressContent, setProgressContent] = useState("");
  const [progressImageFile, setProgressImageFile] = useState<File | null>(null);
  const [progressImagePreviewUrl, setProgressImagePreviewUrl] = useState("");
  const [isProgressComposerOpen, setIsProgressComposerOpen] = useState(false);
  const [selectedProgressPostId, setSelectedProgressPostId] = useState<string | null>(null);
  const [progressPostPage, setProgressPostPage] = useState(1);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isWaitingCancelModalOpen, setIsWaitingCancelModalOpen] = useState(false);
  const [graduationTargetId, setGraduationTargetId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"join" | "reactivate" | "graduation" | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
      setCurrentUserName((user?.user_metadata?.nickname as string | undefined) ?? (user?.user_metadata?.name as string | undefined) ?? user?.email?.split("@")[0] ?? null);
    }
    void loadUser();
  }, [supabase]);
  useEffect(() => {
    return () => {
      if (progressImagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(progressImagePreviewUrl);
    };
  }, [progressImagePreviewUrl]);
  useEffect(() => {
    if (!actionFeedback) return;
    const timeoutId = window.setTimeout(() => setActionFeedback(null), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [actionFeedback]);

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
        const participantRows = (((participantsResult.data ?? []) as Array<{ id: string; room_id: string; user_id: string; role: "host" | "participant" | "waiting"; joined_at: string }>) ?? []);
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
        const hasHistoryUserIds = new Set<string>([
          ...checkInRows.map((checkIn) => checkIn.author_user_id),
          ...Object.keys(boardMeta),
        ]);
        const participants: DetailParticipant[] = [{ id: `${room.id}-host`, userId: room.hostUserId ?? `${room.id}-host`, name: room.hostName, role: "host", joinedAt: room.createdAt }, ...participantRows.filter((participant) => participant.user_id !== room.hostUserId && (participant.role === "participant" || (participant.role === "waiting" && hasHistoryUserIds.has(participant.user_id)))).map((participant) => ({ id: participant.id, userId: participant.user_id, name: nicknameMap.get(participant.user_id) ?? "참여자", role: "participant" as const, joinedAt: participant.joined_at ?? room.createdAt }))];
        const waitingParticipants: DetailWaitingParticipant[] = participantRows
          .filter((participant) => participant.role === "waiting")
          .map((participant) => ({
            id: participant.id,
            userId: participant.user_id,
            name: nicknameMap.get(participant.user_id) ?? "참여자",
            joinedAt: participant.joined_at ?? room.createdAt,
          }));
        const boards: ProgressBoard[] = participants.map((participant) => {
          const posts = checkInRows.filter((checkIn) => checkIn.author_user_id === participant.userId).map((checkIn) => ({ id: checkIn.id, title: checkIn.title, content: checkIn.content, imagePath: checkIn.image_path ?? null, createdAt: checkIn.created_at })).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
          const meta = boardMeta[participant.userId] ?? {};
          return { id: `${room.id}-board-${participant.userId}`, userId: participant.userId, name: participant.name, role: participant.role, lastActivityAt: getLatestTimestamp([meta.lastActivityAt, posts[0]?.createdAt, room.createdAt], room.createdAt), graduatedAt: meta.graduatedAt ?? null, posts };
        });
        setCurrentRoom(room);
        setDetailState({
          participants,
          waitingParticipants,
          notices: noticeRows.map((notice) => ({ id: notice.id, title: notice.title, content: notice.content, author: nicknameMap.get(notice.author_user_id) ?? room.hostName, createdAt: notice.created_at, isPinned: notice.is_pinned })),
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
          const normalizedState: DetailState = {
            ...nextState,
            participants: nextState.participants.map((participant) => ({
              ...participant,
              joinedAt: participant.joinedAt ?? localRoom.createdAt,
            })),
            waitingParticipants: (nextState.waitingParticipants ?? []).map((participant) => ({
              ...participant,
              joinedAt: participant.joinedAt ?? localRoom.createdAt,
            })),
          };
          if (!storedDetail) writeLocalDetailState(localRoom.id, normalizedState);
          setCurrentRoom(localRoom);
          setDetailState(normalizedState);
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
  function removeBoardMeta(userId: string) {
    if (!currentRoom || !isDbRoom) return;
    const currentMeta = readBoardMeta(currentRoom.id);
    const nextMeta = { ...currentMeta };
    delete nextMeta[userId];
    writeBoardMeta(currentRoom.id, nextMeta);
  }

  const isHost = Boolean(currentRoom && ((currentRoom.hostUserId && currentUserId && currentRoom.hostUserId === currentUserId) || (!currentRoom.hostUserId && currentUserName && currentRoom.hostName === currentUserName)));
  const joinedBoard = useMemo(() => {
    if (!detailState) return null;
    return detailState.boards.find((board) => currentUserId && board.userId === currentUserId) ?? detailState.boards.find((board) => currentUserName && board.name === currentUserName) ?? null;
  }, [currentUserId, currentUserName, detailState]);
  const waitingParticipant = useMemo(() => {
    if (!detailState) return null;
    return (
      detailState.waitingParticipants.find((participant) => currentUserId && participant.userId === currentUserId) ??
      detailState.waitingParticipants.find((participant) => currentUserName && participant.name === currentUserName) ??
      null
    );
  }, [currentUserId, currentUserName, detailState]);
  const isJoined = Boolean(joinedBoard);
  const isWaiting = Boolean(waitingParticipant);
  const isRestingViewer = Boolean(joinedBoard && getBoardStatus(joinedBoard) === "resting");
  const canQuestionInteract = !isRestingViewer || isHost || joinedBoard?.role === "host";
  const canAccessMemberPanels = isHost || isJoined;
  const canViewProgressPanels = isHost || isJoined;
  const visiblePanel = (activePanel === "supplies" && !canAccessMemberPanels) || ((["progress", "resting", "graduated"] as ActivePanel[]).includes(activePanel) && !canViewProgressPanels) ? "notice" : activePanel;
  const activeBoards = useMemo(() => (detailState?.boards ?? []).filter((board) => getBoardStatus(board) === "active"), [detailState]);
  const restingBoards = useMemo(() => (detailState?.boards ?? []).filter((board) => getBoardStatus(board) === "resting"), [detailState]);
  const graduatedBoards = useMemo(() => (detailState?.boards ?? []).filter((board) => getBoardStatus(board) === "graduated"), [detailState]);
  const hostBoard = useMemo(() => (detailState?.boards ?? []).find((board) => board.role === "host") ?? null, [detailState]);
  const hostCountsAsCurrentParticipant = Boolean(hostBoard && getBoardStatus(hostBoard) === "active");
  const activeParticipantCount = activeBoards.filter((board) => board.role === "participant").length + (hostCountsAsCurrentParticipant ? 1 : 0);
  const isRecruitingOpen = currentRoom ? activeParticipantCount < currentRoom.capacity : false;
  const participantSupplyProgress = useMemo(() => {
    if (!detailState) return [];
    const participantBoards = new Map(detailState.boards.filter((board) => board.role === "participant").map((board) => [board.userId, board]));
    return detailState.participants
      .filter((participant) => participant.role === "participant")
      .map((participant) => {
        const board = participantBoards.get(participant.userId);
        return {
          userId: participant.userId,
          name: participant.name,
          joinedAt: participant.joinedAt,
          status: board ? getBoardStatus(board) : ("active" as const),
          checkedCount: detailState.supplies.filter((supply) => supply.checkedBy.includes(participant.userId)).length,
        };
      })
      .sort((left, right) => {
        const rightTime = new Date(right.joinedAt).getTime();
        const leftTime = new Date(left.joinedAt).getTime();
        return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
      });
  }, [detailState]);
  const waitingParticipantsOrdered = useMemo(
    () => sortWaitingParticipantsByJoinedAt(detailState?.waitingParticipants ?? []),
    [detailState]
  );
  const supplyParticipantPageSize = 5;
  const supplyParticipantTotalPages = Math.max(1, Math.ceil(participantSupplyProgress.length / supplyParticipantPageSize));
  const currentSupplyParticipantPage = Math.min(supplyParticipantPage, supplyParticipantTotalPages);
  const pagedParticipantSupplyProgress = useMemo(() => {
    const startIndex = (currentSupplyParticipantPage - 1) * supplyParticipantPageSize;
    return participantSupplyProgress.slice(startIndex, startIndex + supplyParticipantPageSize);
  }, [currentSupplyParticipantPage, participantSupplyProgress]);
  const boardGroups = useMemo(() => ({ progress: activeBoards, resting: restingBoards, graduated: graduatedBoards }), [activeBoards, restingBoards, graduatedBoards]);
  const currentProgressPanel = (visiblePanel === "progress" || visiblePanel === "resting" || visiblePanel === "graduated") ? visiblePanel : "progress";
  const currentBoards = useMemo(() => {
    const source = boardGroups[currentProgressPanel] ?? [];
    return [...source].sort((left, right) => {
      const rightTime = new Date(right.lastActivityAt).getTime();
      const leftTime = new Date(left.lastActivityAt).getTime();
      return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
    });
  }, [boardGroups, currentProgressPanel]);
  const progressCardsPageSize = 10;
  const progressCardsTotalPages = Math.max(1, Math.ceil(currentBoards.length / progressCardsPageSize));
  const currentProgressCardsPage = Math.min(progressPanelPages[currentProgressPanel], progressCardsTotalPages);
  const pagedCurrentBoards = useMemo(() => {
    const startIndex = (currentProgressCardsPage - 1) * progressCardsPageSize;
    return currentBoards.slice(startIndex, startIndex + progressCardsPageSize);
  }, [currentBoards, currentProgressCardsPage]);
  const selectedBoard = currentBoards.find((board) => board.id === selectedBoardId) ?? null;
  const selectedProgressPost = selectedBoard?.posts.find((post) => post.id === selectedProgressPostId) ?? null;
  const progressPostPageSize = 5;
  const progressPostTotalPages = Math.max(1, Math.ceil((selectedBoard?.posts.length ?? 0) / progressPostPageSize));
  const currentProgressPostPage = Math.min(progressPostPage, progressPostTotalPages);
  const pagedProgressPosts = useMemo(() => {
    if (!selectedBoard) return [];
    const startIndex = (currentProgressPostPage - 1) * progressPostPageSize;
    return selectedBoard.posts.slice(startIndex, startIndex + progressPostPageSize);
  }, [currentProgressPostPage, selectedBoard]);
  const canEditSelectedBoardProgress = Boolean(
    selectedBoard &&
      getBoardStatus(selectedBoard) === "active" &&
      !isRestingViewer &&
      ((currentUserId && selectedBoard.userId === currentUserId) || (currentUserName && selectedBoard.name === currentUserName))
  );
  const selectedBoardPostCount = selectedBoard?.posts.length ?? 0;

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
  async function promoteFirstWaitingParticipantDb(targetRoomId: string) {
    const { data: promotedUserId, error: promoteError } = await supabase.rpc("promote_first_waiting_participant", {
      p_room_id: targetRoomId,
    });
    if (promoteError) { alert(promoteError.message); return; }
    if (!promotedUserId || typeof promotedUserId !== "string") return;
    updateBoardMeta(promotedUserId, { lastActivityAt: new Date().toISOString(), graduatedAt: null });
  }
  async function handleJoinToggle() {
    if (pendingAction) return;
    setPendingAction("join");
    try {
      if (!currentRoom || !detailState) return;
      const user = await ensureSignedIn();
      if (!user || !currentUserName) return;
      if (isHost) { alert("진행자는 자신의 동행방에서 나갈 수 없어요."); return; }
      if (isWaiting) { setIsWaitingCancelModalOpen(true); return; }
      if (isDbRoom) {
        if (isJoined) {
          const { error } = await supabase.from("companion_participants").delete().eq("room_id", currentRoom.id).eq("user_id", user.id);
          if (error) { alert(error.message); return; }
          await promoteFirstWaitingParticipantDb(currentRoom.id);
          setActionFeedback({ type: "success", message: "참여가 취소되었어요." });
        } else {
          const nextRole = isRecruitingOpen ? "participant" : "waiting";
          const { error } = await supabase.from("companion_participants").insert({ room_id: currentRoom.id, user_id: user.id, role: nextRole });
          if (error) { alert(error.message); return; }
          if (nextRole === "participant") updateBoardMeta(user.id, { lastActivityAt: new Date().toISOString(), graduatedAt: null });
          setActionFeedback({ type: "success", message: nextRole === "participant" ? "참여가 완료되었어요." : "참여 대기에 등록되었어요." });
        }
        setReloadToken((current) => current + 1); return;
      }
      const viewerId = currentUserId ?? currentUserName; if (!viewerId) return;
      if (isJoined) {
        const removedState: DetailState = {
          ...detailState,
          participants: detailState.participants.filter((participant) => participant.userId !== viewerId),
          boards: detailState.boards.filter((board) => board.userId !== viewerId),
          supplies: detailState.supplies.map((supply) => ({ ...supply, checkedBy: supply.checkedBy.filter((userId) => userId !== viewerId) })),
        };
        persistLocalDetail(promoteFirstWaitingParticipantLocal(currentRoom.id, removedState));
        setActionFeedback({ type: "success", message: "참여가 취소되었어요." });
        return;
      }
      if (isRecruitingOpen) {
        persistLocalDetail({ ...detailState, participants: [...detailState.participants, { id: `${currentRoom.id}-${viewerId}`, userId: viewerId, name: currentUserName, role: "participant", joinedAt: new Date().toISOString() }], boards: [{ id: `${currentRoom.id}-board-${viewerId}`, userId: viewerId, name: currentUserName, role: "participant", lastActivityAt: new Date().toISOString(), graduatedAt: null, posts: [] }, ...detailState.boards] });
        setActionFeedback({ type: "success", message: "참여가 완료되었어요." });
        return;
      }
      persistLocalDetail({ ...detailState, waitingParticipants: [...detailState.waitingParticipants, { id: `${currentRoom.id}-waiting-${viewerId}`, userId: viewerId, name: currentUserName, joinedAt: new Date().toISOString() }] });
      setActionFeedback({ type: "success", message: "참여 대기에 등록되었어요." });
    } finally {
      setPendingAction(null);
    }
  }
  async function handleConfirmWaitingCancel() {
    if (!currentRoom || !detailState || !isWaiting) return;
    const user = await ensureSignedIn();
    if (!user) return;
    if (isDbRoom) {
      const { error } = await supabase.from("companion_participants").delete().eq("room_id", currentRoom.id).eq("user_id", user.id).eq("role", "waiting");
      if (error) { alert(error.message); return; }
      setIsWaitingCancelModalOpen(false);
      setActionFeedback({ type: "success", message: "참여 대기가 취소되었어요." });
      setReloadToken((current) => current + 1);
      return;
    }
    const viewerId = currentUserId ?? currentUserName;
    if (!viewerId) return;
    persistLocalDetail({
      ...detailState,
      waitingParticipants: detailState.waitingParticipants.filter((participant) => participant.userId !== viewerId),
    });
    setIsWaitingCancelModalOpen(false);
    setActionFeedback({ type: "success", message: "참여 대기가 취소되었어요." });
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
  function startNoticeEdit(notice: DetailNotice) {
    if (!isHost) return;
    setEditingNoticeId(notice.id);
    setEditingNoticeTitle(notice.title);
    setEditingNoticeContent(notice.content);
  }
  function cancelNoticeEdit() {
    setEditingNoticeId(null);
    setEditingNoticeTitle("");
    setEditingNoticeContent("");
  }
  async function handleNoticeUpdate(noticeId: string) {
    if (!currentRoom || !detailState || !isHost || editingNoticeId !== noticeId) return;
    if (!editingNoticeTitle.trim() || !editingNoticeContent.trim()) return;
    if (isDbRoom) {
      const { error } = await supabase
        .from("companion_notices")
        .update({ title: editingNoticeTitle.trim(), content: editingNoticeContent.trim() })
        .eq("id", noticeId)
        .eq("room_id", currentRoom.id);
      if (error) { alert(error.message); return; }
      cancelNoticeEdit();
      setReloadToken((current) => current + 1);
      return;
    }
    persistLocalDetail({
      ...detailState,
      notices: detailState.notices.map((notice) =>
        notice.id === noticeId
          ? { ...notice, title: editingNoticeTitle.trim(), content: editingNoticeContent.trim() }
          : notice
      ),
    });
    cancelNoticeEdit();
  }
  async function handleSupplyAdd() {
    if (!currentRoom || !detailState || !isHost || isRestingViewer || !supplyInput.trim()) return;
    if (isDbRoom) {
      const { error } = await supabase.from("companion_supplies").insert({ room_id: currentRoom.id, label: supplyInput.trim(), sort_order: detailState.supplies.length + 1 });
      if (error) { alert(error.message); return; }
      setSupplyInput(""); setReloadToken((current) => current + 1); return;
    }
    persistLocalDetail({ ...detailState, supplies: [...detailState.supplies, { id: `${currentRoom.id}-supply-${Date.now()}`, label: supplyInput.trim(), checkedBy: [] }] });
    setSupplyInput("");
  }
  async function handleSupplyRemove(supplyId: string) {
    if (!currentRoom || !detailState || !isHost || isRestingViewer) return;
    if (isDbRoom) {
      const { error } = await supabase.from("companion_supplies").delete().eq("id", supplyId);
      if (error) { alert(error.message); return; }
      setReloadToken((current) => current + 1); return;
    }
    persistLocalDetail({ ...detailState, supplies: detailState.supplies.filter((supply) => supply.id !== supplyId) });
  }
  async function handleSupplyToggle(supplyId: string) {
    if (!currentRoom || !detailState || !canAccessMemberPanels || isHost || isRestingViewer) return;
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
    if (!currentRoom || !detailState || !canQuestionInteract || !questionInput.trim()) return;
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
    if (!currentRoom || !detailState || !canQuestionInteract) return;
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
    if (!currentRoom || !detailState || isRestingViewer || !progressTitle.trim() || !progressContent.trim()) return;
    const viewerOwnsBoard = (currentUserId && board.userId === currentUserId) || (currentUserName && board.name === currentUserName); if (!viewerOwnsBoard) return;
    const user = await ensureSignedIn(); if (!user) return;
    let imagePath: string | null = null;
    if (isDbRoom) {
      if (progressImageFile) {
        const extension = progressImageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const timestampKey = new Date().toISOString().replace(/[-:.TZ]/g, "");
        const uploadPath = `companion/checkins/${user.id}/${currentRoom.id}/${timestampKey}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("pattern-images").upload(uploadPath, progressImageFile, {
          cacheControl: "3600",
          upsert: false,
        });
        if (uploadError) { alert(uploadError.message); return; }
        imagePath = uploadPath;
      }
      const { error } = await supabase.from("companion_checkins").insert({ room_id: currentRoom.id, author_user_id: user.id, title: progressTitle.trim(), content: progressContent.trim(), image_path: imagePath });
      if (error) { alert(error.message); return; }
      updateBoardMeta(board.userId, { lastActivityAt: new Date().toISOString(), graduatedAt: null });
      setProgressTitle(""); setProgressContent(""); removeProgressImage(); setIsProgressComposerOpen(false); setProgressPostPage(1); setReloadToken((current) => current + 1); return;
    }
    if (progressImageFile) imagePath = await readFileAsDataUrl(progressImageFile);
    persistLocalDetail({ ...detailState, boards: detailState.boards.map((item) => item.id === board.id ? { ...item, lastActivityAt: new Date().toISOString(), posts: [{ id: `${item.id}-post-${Date.now()}`, title: progressTitle.trim(), content: progressContent.trim(), imagePath, createdAt: new Date().toISOString() }, ...item.posts] } : item) });
    setProgressTitle(""); setProgressContent(""); removeProgressImage(); setIsProgressComposerOpen(false); setProgressPostPage(1);
  }
  async function handleReactivateBoard(board: ProgressBoard) {
    if (pendingAction) return;
    setPendingAction("reactivate");
    try {
      if (!currentRoom || !detailState) return;
      const viewerOwnsBoard = (currentUserId && board.userId === currentUserId) || (currentUserName && board.name === currentUserName);
      if (!viewerOwnsBoard) return;
      const isQueuedForReactivation = waitingParticipantsOrdered.some((participant) => participant.userId === board.userId);
      const hasOpenSlot = activeParticipantCount < currentRoom.capacity;
      if (isDbRoom) {
      const user = await ensureSignedIn();
      if (!user) return;
      if (isQueuedForReactivation) {
        if (board.role === "host") {
          const { error } = await supabase.from("companion_participants").delete().eq("room_id", currentRoom.id).eq("user_id", user.id).eq("role", "waiting");
          if (error) { alert(error.message); return; }
        } else {
          const { error: deleteError } = await supabase.from("companion_participants").delete().eq("room_id", currentRoom.id).eq("user_id", user.id).eq("role", "waiting");
          if (deleteError) { alert(deleteError.message); return; }
          const { error: insertError } = await supabase.from("companion_participants").insert({ room_id: currentRoom.id, user_id: user.id, role: "participant" });
          if (insertError) { alert(insertError.message); return; }
        }
        setReloadToken((current) => current + 1);
        setActionFeedback({ type: "success", message: "참여 대기가 취소되었어요." });
        return;
      }
      if (!hasOpenSlot) {
        const { error: deleteExistingRowError } = await supabase
          .from("companion_participants")
          .delete()
          .eq("room_id", currentRoom.id)
          .eq("user_id", user.id);
        if (deleteExistingRowError) { alert(deleteExistingRowError.message); return; }

        const { error: insertWaitingError } = await supabase
          .from("companion_participants")
          .insert({ room_id: currentRoom.id, user_id: user.id, role: "waiting" });
        if (insertWaitingError) { alert(insertWaitingError.message); return; }
        setReloadToken((current) => current + 1);
        setActionFeedback({ type: "success", message: "참여 대기에 등록되었어요." });
        return;
      }
      updateBoardMeta(board.userId, { lastActivityAt: new Date().toISOString(), graduatedAt: null });
      setReloadToken((current) => current + 1);
      setActionFeedback({ type: "success", message: "휴면 상태가 해제되었어요." });
        return;
      }
      if (isQueuedForReactivation) {
      persistLocalDetail({
        ...detailState,
        waitingParticipants: detailState.waitingParticipants.filter((participant) => participant.userId !== board.userId),
      });
      setActionFeedback({ type: "success", message: "참여 대기가 취소되었어요." });
        return;
      }
      if (!hasOpenSlot) {
      if (detailState.waitingParticipants.some((participant) => participant.userId === board.userId)) return;
      persistLocalDetail({
        ...detailState,
        waitingParticipants: [
          ...detailState.waitingParticipants,
          { id: `${currentRoom.id}-waiting-${board.userId}`, userId: board.userId, name: board.name, joinedAt: new Date().toISOString() },
        ],
      });
      setActionFeedback({ type: "success", message: "참여 대기에 등록되었어요." });
        return;
      }
      persistLocalDetail({
      ...detailState,
      boards: detailState.boards.map((item) =>
        item.id === board.id
          ? { ...item, lastActivityAt: new Date().toISOString(), graduatedAt: null }
          : item
      ),
    });
      setActionFeedback({ type: "success", message: "휴면 상태가 해제되었어요." });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleHostRemoveParticipant(board: ProgressBoard) {
    if (!currentRoom || !detailState || !isHost || board.role !== "participant") return;
    if (!window.confirm(`${board.name}님을 동행방에서 제거할까요?`)) return;
    if (isDbRoom) {
      const { error } = await supabase
        .from("companion_participants")
        .delete()
        .eq("room_id", currentRoom.id)
        .eq("user_id", board.userId)
        .eq("role", "participant");
      if (error) { alert(error.message); return; }
      removeBoardMeta(board.userId);
      await promoteFirstWaitingParticipantDb(currentRoom.id);
      if (selectedBoardId === board.id) closeBoardModal();
      setReloadToken((current) => current + 1);
      return;
    }
    if (selectedBoardId === board.id) closeBoardModal();
    const removedState: DetailState = {
      ...detailState,
      participants: detailState.participants.filter((participant) => participant.userId !== board.userId),
      boards: detailState.boards.filter((item) => item.userId !== board.userId),
      supplies: detailState.supplies.map((supply) => ({
        ...supply,
        checkedBy: supply.checkedBy.filter((userId) => userId !== board.userId),
      })),
    };
    persistLocalDetail(promoteFirstWaitingParticipantLocal(currentRoom.id, removedState));
  }

  function openGraduationModal(board: ProgressBoard) {
    if (isRestingViewer) return;
    const viewerOwnsBoard = (currentUserId && board.userId === currentUserId) || (currentUserName && board.name === currentUserName);
    if (viewerOwnsBoard) setGraduationTargetId(board.id);
  }
  function openBoardModal(boardId: string) {
    removeProgressImage();
    setSelectedBoardId(boardId);
    setSelectedProgressPostId(null);
    setProgressPostPage(1);
    setIsProgressComposerOpen(false);
    setProgressTitle("");
    setProgressContent("");
  }
  function closeBoardModal() {
    removeProgressImage();
    setSelectedBoardId(null);
    setSelectedProgressPostId(null);
    setProgressPostPage(1);
    setIsProgressComposerOpen(false);
    setProgressTitle("");
    setProgressContent("");
  }
  function openProgressPostModal(postId: string) {
    setSelectedProgressPostId(postId);
  }
  function closeProgressPostModal() {
    setSelectedProgressPostId(null);
  }
  function handleProgressImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setProgressImageFile(file);
    if (progressImagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(progressImagePreviewUrl);
    setProgressImagePreviewUrl(URL.createObjectURL(file));
  }
  function removeProgressImage() {
    if (progressImagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(progressImagePreviewUrl);
    setProgressImageFile(null);
    setProgressImagePreviewUrl("");
  }
  async function confirmGraduation() {
    if (pendingAction) return;
    setPendingAction("graduation");
    try {
      if (!currentRoom || !detailState || !graduationTargetId || isRestingViewer) return;
      const targetBoard = detailState.boards.find((board) => board.id === graduationTargetId); if (!targetBoard) { setGraduationTargetId(null); return; }
      if (isDbRoom) {
      updateBoardMeta(targetBoard.userId, { graduatedAt: new Date().toISOString(), lastActivityAt: targetBoard.lastActivityAt });
      await promoteFirstWaitingParticipantDb(currentRoom.id);
      closeBoardModal();
      setGraduationTargetId(null);
      setReloadToken((current) => current + 1);
      setActionFeedback({ type: "success", message: "졸업 처리되었어요." });
        return;
      }
      const graduatedState: DetailState = {
      ...detailState,
      boards: detailState.boards.map((board) => board.id === graduationTargetId ? { ...board, graduatedAt: new Date().toISOString() } : board),
    };
      persistLocalDetail(promoteFirstWaitingParticipantLocal(currentRoom.id, graduatedState));
      closeBoardModal();
      setGraduationTargetId(null);
      setActionFeedback({ type: "success", message: "졸업 처리되었어요." });
    } finally {
      setPendingAction(null);
    }
  }

  if (!hasLoadedRooms || !isStateReady) return <section className={styles.feedbackCard}><p className={styles.sectionDescription}>동행방을 불러오는 중이에요...</p></section>;
  if (!currentRoom || !detailState) return <section className={styles.feedbackCard}><h1 className={styles.sectionTitle}>동행방을 찾을 수 없어요</h1><p className={styles.sectionDescription}>요청하신 동행방이 없거나 아직 불러오지 못했어요.</p><Link href="/companion" className={styles.submitButton}>목록으로</Link></section>;
  const questionList = [...detailState.questions].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  return (
    <>
      <LoginRequiredModal open={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} title="로그인 후 동행방 기능을 사용할 수 있어요" description="로그인하면 참여 신청, 준비물 체크, 질문 작성, 진행 기록 등록까지 바로 이어서 할 수 있어요." />
      {actionFeedback ? (
        <div className={`${styles.actionToast} ${actionFeedback.type === "success" ? styles.actionToastSuccess : styles.actionToastError}`} role="status" aria-live="polite">
          {actionFeedback.message}
        </div>
      ) : null}
      <div className={styles.shell}><div className={styles.workspace}><div className={styles.mainColumn}>
        <section className={`${styles.hero} ${styles.heroCompact}`}>
          <div className={styles.heroBody}>
            <h1 className={styles.heroTitle}>{currentRoom.title}</h1>
            <div className={styles.heroMeta}>
              <span className={`${styles.pill} ${getStatusClassName(currentRoom.status)}`}>{currentRoom.status}</span>
              <span className={`${styles.pill} ${styles.pillMuted}`}>{currentRoom.patternName}</span>
              <span className={`${styles.pill} ${styles.pillMuted}`}>@{currentRoom.hostName}</span>
              <span className={`${styles.pill} ${styles.pillMuted}`}>{formatCompanionSchedule(currentRoom)}</span>
              <span className={`${styles.pill} ${styles.pillMuted}`}>진행 {activeParticipantCount}/{currentRoom.capacity}</span>
            </div>
          </div>
          <div className={styles.heroActions}><div className={styles.actionRow}>
            <button type="button" onClick={handleJoinToggle} className={styles.submitButton} disabled={pendingAction === "join"}>{pendingAction === "join" ? "처리 중..." : isJoined ? "참여 취소" : isWaiting ? "참여 대기 취소" : isRecruitingOpen ? "참여 신청" : "참여 대기"}</button>
            <span aria-hidden="true" className={styles.heroActionDivider} />
            <button type="button" onClick={() => setActivePanel("pattern")} className={styles.ghostButton}>연결 도안 보기</button>
            {isHost ? <Link href={`/companion/${currentRoom.id}/edit`} className={styles.ghostButton}>동행방 수정</Link> : null}
            <Link href="/companion" className={styles.secondaryAction}>목록으로</Link>
          </div>
            {isWaiting ? <span className={styles.hintText}>현재 참여 대기 중이에요. 정원이 비면 선착순으로 참여가 가능해요.</span> : null}
            {!isRecruitingOpen && !isJoined && !isWaiting ? <span className={styles.hintText}>현재 정원이 꽉 차 있어 참여 대기로 신청할 수 있어요.</span> : null}
          </div>
        </section>
        <section className={`${styles.sectionCard} ${styles.sectionSpanFull} ${styles.commentsSection}`}>
          <div className={styles.tabRow}>
            <button type="button" className={visiblePanel === "notice" ? styles.tabActive : styles.tabButton} onClick={() => setActivePanel("notice")}>공지</button>
            <button type="button" className={visiblePanel === "pattern" ? styles.tabActive : styles.tabButton} onClick={() => setActivePanel("pattern")}>도안</button>
            {canAccessMemberPanels ? <button type="button" className={visiblePanel === "supplies" ? styles.tabActive : styles.tabButton} onClick={() => setActivePanel("supplies")}>준비물</button> : null}
            <button type="button" className={visiblePanel === "questions" ? styles.tabActive : styles.tabButton} onClick={() => setActivePanel("questions")}>질문</button>
            {canViewProgressPanels ? <><span aria-hidden="true" className={styles.tabSectionDivider} /><button type="button" className={visiblePanel === "progress" ? styles.tabActive : styles.tabButton} onClick={() => setActivePanel("progress")}>진행</button><button type="button" className={visiblePanel === "resting" ? `${styles.tabActive} ${styles.tabActiveResting}` : styles.tabButton} onClick={() => setActivePanel("resting")}>휴식</button><button type="button" className={visiblePanel === "graduated" ? `${styles.tabActive} ${styles.tabActiveGraduated}` : styles.tabButton} onClick={() => setActivePanel("graduated")}>졸업</button></> : null}
          </div>
          {visiblePanel === "notice" ? (
            <>
              <div className={styles.sectionHead}>
                <div className={styles.noticeHeadMeta}>
                  <h2 className={styles.sectionTitle}>공지</h2>
                  <span className={styles.noticeCountText}>{detailState.notices.length}개</span>
                </div>
                {isHost ? (
                  <button type="button" onClick={() => setIsNoticeComposerOpen((current) => !current)} className={styles.smallButton}>
                    {isNoticeComposerOpen ? "공지 작성 닫기" : "공지 작성 열기"}
                  </button>
                ) : null}
              </div>
              {isHost && isNoticeComposerOpen ? (
                <div className={styles.composer}>
                  <label className={styles.label}>공지 작성</label>
                  <input value={noticeTitle} onChange={(event) => setNoticeTitle(event.target.value)} placeholder="공지 제목" className={styles.input} />
                  <textarea value={noticeContent} onChange={(event) => setNoticeContent(event.target.value)} placeholder="참여자에게 안내할 공지 내용을 적어주세요." rows={4} className={styles.textarea} />
                  <div className={styles.composerFooter}>
                    <button type="button" onClick={() => void handleNoticeSubmit()} className={styles.submitButton}>공지 등록</button>
                  </div>
                </div>
              ) : null}
              <div className={styles.commentList}>
                {detailState.notices.length > 0 ? (
                  detailState.notices.map((notice) => {
                    const isEditingNotice = isHost && editingNoticeId === notice.id;
                    return (
                      <article key={notice.id} className={styles.commentCard}>
                        {isEditingNotice ? (
                          <div className={styles.composer}>
                            <label className={styles.label}>공지 수정</label>
                            <input value={editingNoticeTitle} onChange={(event) => setEditingNoticeTitle(event.target.value)} placeholder="공지 제목" className={styles.input} />
                            <textarea value={editingNoticeContent} onChange={(event) => setEditingNoticeContent(event.target.value)} placeholder="공지 내용을 수정해 주세요." rows={4} className={styles.textarea} />
                            <div className={styles.composerFooter}>
                              <button type="button" onClick={() => void handleNoticeUpdate(notice.id)} className={styles.smallButton}>저장</button>
                              <button type="button" onClick={cancelNoticeEdit} className={styles.secondaryAction}>취소</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className={styles.commentHead}>
                              <div className={styles.commentMeta}>
                                <span className={styles.commentAuthor}>{notice.title}</span>
                                <span className={styles.commentDate}>{formatDateTimeLabel(notice.createdAt)}</span>
                              </div>
                              {isHost ? <button type="button" onClick={() => startNoticeEdit(notice)} className={styles.smallButton}>수정</button> : null}
                            </div>
                            <p className={styles.commentBody}>{notice.content}</p>
                          </>
                        )}
                      </article>
                    );
                  })
                ) : (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyStateTitle}>아직 등록된 공지가 없어요</p>
                    <p className={styles.emptyStateDescription}>진행자가 첫 안내를 등록하면 이곳에서 모두가 확인할 수 있어요.</p>
                  </div>
                )}
              </div>
            </>
          ) : null}
          {visiblePanel === "pattern" ? <><div className={styles.sectionHead}><div><h2 className={styles.sectionTitle}>연결 도안</h2></div></div>{patternPreview ? <><div className={styles.compactIntroGrid}><div className={styles.introMain}><div className={styles.imageStage}><div className={styles.imageWrap}>{patternPreview.imageUrl ? <Image src={patternPreview.imageUrl} alt={patternPreview.title} fill sizes="(max-width: 920px) 100vw, 46vw" /> : <div className={styles.imageFallback}>사진 없음</div>}</div></div><div className={styles.descriptionCard}><p className={styles.descriptionText}>{patternPreview.description}</p></div></div><div className={styles.introSide}><div className={styles.infoStack}><section className={styles.sectionCard}><div className={styles.summaryList}>{patternPreview.summaryRows.map((row) => <div key={row.label} className={styles.summaryRow}><span>{row.label}</span><span className={styles.summaryValue}>{row.value}</span></div>)}</div></section>{patternPreview.prepRows.length > 0 ? <section className={styles.sectionCard}><div className={styles.prepGrid}>{patternPreview.prepRows.map((row) => <div key={row.label} className={styles.summaryRow}><span>{row.label}</span><span className={styles.summaryValue}>{row.value}</span></div>)}</div></section> : null}{patternPreview.policyRows.length > 0 ? <section className={styles.sectionCard}><div className={styles.policyGrid}>{patternPreview.policyRows.map((row, index) => <div key={`${row.label}-${index}`} className={index === 0 ? styles.summaryRow : styles.policyRow}><span className={index === 0 ? undefined : styles.fieldLabel}>{row.label}</span>{index === 0 ? <span className={styles.summaryValue}>{row.value}</span> : <span className={`${styles.policyState} ${row.value === "O" ? styles.policyAllowed : styles.policyDenied}`}>{row.value}</span>}</div>)}{patternPreview.actionHref && patternPreview.actionLabel ? <div className={styles.summaryRow}><span>링크</span><Link href={patternPreview.actionHref} target={patternPreview.actionHref.startsWith("http") ? "_blank" : undefined} rel={patternPreview.actionHref.startsWith("http") ? "noreferrer" : undefined} className={styles.secondaryLinkAction}>{patternPreview.actionLabel}</Link></div> : null}</div></section> : null}</div></div></div><section className={`${styles.sectionCard} ${styles.sheetCard}`}><div className={styles.sectionHead}><div><h3 className={styles.sectionTitle}>도안 세부 내용</h3><p className={styles.sectionDescription}>행별 설명과 사용 범위를 함께 볼 수 있어요.</p></div></div>{patternPreview.detailRows.length > 0 ? <div className={styles.detailList}>{patternPreview.detailRows.map((row) => <div key={row.id} className={styles.detailItem}><div className={styles.detailMeta}><span className={styles.detailIndex}>{row.rowNumber}단</span><span className={styles.detailPreview}>{row.instruction.length > 28 ? `${row.instruction.slice(0, 28)}...` : row.instruction}</span></div><p className={styles.detailText}>{row.instruction}</p></div>)}</div> : <div className={styles.emptyState}><p className={styles.emptyStateTitle}>세부 설명이 아직 없어요</p><p className={styles.emptyStateDescription}>작성자가 상세 행 설명을 입력하면 여기에 표시됩니다.</p></div>}</section></> : <div className={styles.emptyState}><p className={styles.emptyStateTitle}>연결된 도안 정보가 없어요</p><p className={styles.emptyStateDescription}>이 동행방은 아직 상세 도안을 연결하지 않았어요.</p></div>}</> : null}
          {visiblePanel === "supplies" ? (
            <>
              <div className={styles.sectionHead}>
                <div className={styles.noticeHeadMeta}>
                  <h2 className={styles.sectionTitle}>준비물</h2>
                  <span className={styles.noticeCountText}>{detailState.supplies.length}개</span>
                </div>
                {isHost ? (
                  <button type="button" onClick={() => setIsSupplyComposerOpen((current) => !current)} className={styles.smallButton} disabled={isRestingViewer}>
                    {isSupplyComposerOpen ? "준비물 추가 닫기" : "준비물 추가 열기"}
                  </button>
                ) : null}
              </div>

              {isHost && isSupplyComposerOpen && !isRestingViewer ? (
                <div className={styles.composer}>
                  <label className={styles.label}>준비물 항목 추가</label>
                  <div className={styles.inlineActionGroup}>
                    <input value={supplyInput} onChange={(event) => setSupplyInput(event.target.value)} placeholder="예: 줄자, 단수링, 표시핀" className={styles.input} />
                    <button type="button" onClick={() => void handleSupplyAdd()} className={styles.smallButton}>추가</button>
                  </div>
                </div>
              ) : null}

              <div className={styles.suppliesLayout}>
                <div className={styles.suppliesColumn}>
                  <div className={styles.commentList}>
                    {detailState.supplies.length > 0 ? detailState.supplies.map((supply) => {
                      const isChecked = Boolean(currentUserId && supply.checkedBy.includes(currentUserId));
                      return (
                        <article key={supply.id} className={styles.supplyCard}>
                          <div className={styles.supplyCardHead}>
                            <label className={styles.supplyToggleRow}>
                              {!isHost ? <input type="checkbox" checked={isChecked} onChange={() => void handleSupplyToggle(supply.id)} className={styles.checkboxInput} disabled={isRestingViewer} /> : null}
                              <span className={styles.supplyLabel}>{supply.label}</span>
                            </label>
                            {isHost ? <button type="button" onClick={() => void handleSupplyRemove(supply.id)} className={styles.textButtonDanger} disabled={isRestingViewer}>삭제</button> : null}
                          </div>
                          <p className={styles.sectionDescription}>
                            {isHost
                              ? (participantSupplyProgress.length > 0
                                ? `참여자 ${supply.checkedBy.length}/${participantSupplyProgress.length}명이 체크했어요.`
                                : "아직 참여자가 없어요.")
                              : `체크한 참여자 ${supply.checkedBy.length}명`}
                          </p>
                        </article>
                      );
                    }) : <div className={styles.emptyState}><p className={styles.emptyStateTitle}>등록된 준비물이 없어요</p><p className={styles.emptyStateDescription}>진행자가 첫 준비물 항목을 추가하면 참여자가 바로 체크할 수 있어요.</p></div>}
                  </div>
                </div>

                {isHost ? (
                  <aside className={styles.supplyParticipantsColumn}>
                    <div className={styles.supplyParticipantsList}>
                      {pagedParticipantSupplyProgress.length > 0 ? pagedParticipantSupplyProgress.map((participant) => (
                        <article key={participant.userId} className={styles.supplyParticipantCard}>
                          <strong className={styles.supplyParticipantName}>{participant.name}</strong>
                          <span className={styles.supplyParticipantValue}>{participant.checkedCount}/{detailState.supplies.length || 0}</span>
                        </article>
                      )) : <div className={styles.emptyState}><p className={styles.emptyStateTitle}>아직 참여자가 없어요</p><p className={styles.emptyStateDescription}>참여가 시작되면 이곳에 준비물 진행률이 표시돼요.</p></div>}
                    </div>
                    {supplyParticipantTotalPages > 1 ? (
                      <div className={styles.questionPagination}>
                        <button type="button" className={styles.questionPageButton} onClick={() => setSupplyParticipantPage(Math.max(1, currentSupplyParticipantPage - 1))} disabled={currentSupplyParticipantPage === 1}>이전</button>
                        <span className={styles.questionPageLabel}>{currentSupplyParticipantPage} / {supplyParticipantTotalPages}</span>
                        <button type="button" className={styles.questionPageButton} onClick={() => setSupplyParticipantPage(Math.min(supplyParticipantTotalPages, currentSupplyParticipantPage + 1))} disabled={currentSupplyParticipantPage === supplyParticipantTotalPages}>다음</button>
                      </div>
                    ) : null}
                  </aside>
                ) : null}
              </div>
            </>
          ) : null}
          {visiblePanel === "questions" ? (
            <>
              <div className={styles.sectionHead}>
                <div className={styles.noticeHeadMeta}>
                  <h2 className={styles.sectionTitle}>질문</h2>
                  <span className={styles.noticeCountText}>{questionList.length}개</span>
                </div>
                <button type="button" onClick={() => setIsQuestionComposerOpen((current) => !current)} className={styles.smallButton} disabled={!canQuestionInteract}>
                  {isQuestionComposerOpen ? "질문하기 닫기" : "질문하기 열기"}
                </button>
              </div>
              {isQuestionComposerOpen && canQuestionInteract ? (
                <div className={styles.composer}>
                  <label className={styles.label}>질문 작성</label>
                  <textarea value={questionInput} onChange={(event) => setQuestionInput(event.target.value)} placeholder="도안, 일정, 재료에 대해 궁금한 점을 남겨보세요." rows={4} className={styles.textarea} />
                  <div className={styles.composerFooter}>
                    <button type="button" onClick={() => void handleQuestionSubmit()} className={styles.submitButton}>질문 등록</button>
                  </div>
                </div>
              ) : null}
              <div className={styles.commentList}>
                {questionList.length > 0 ? questionList.map((question) => <article key={question.id} className={styles.commentCard}><div className={styles.commentHead}><div className={styles.commentMeta}><span className={styles.commentAuthor}>@{question.author}</span><span className={styles.commentDate}>{formatDateTimeLabel(question.createdAt)}</span></div></div><p className={styles.commentBody}>{question.content}</p><div className={styles.replyList}>{question.replies.map((reply) => <div key={reply.id} className={styles.replyCard}><div className={styles.commentMeta}><span className={styles.commentAuthor}>@{reply.author}</span><span className={styles.commentDate}>{formatDateTimeLabel(reply.createdAt)}</span></div><p className={styles.commentBody}>{reply.content}</p></div>)}</div><div className={styles.inlineForm}><label className={styles.label}>답글 입력</label><textarea value={replyInputs[question.id] ?? ""} onChange={(event) => setReplyInputs((current) => ({ ...current, [question.id]: event.target.value }))} placeholder="한 단계까지만 답글을 이어갈 수 있어요." rows={3} className={styles.inlineTextarea} disabled={!canQuestionInteract} /><div className={styles.inlineActions}><button type="button" onClick={() => void handleReplySubmit(question.id)} className={styles.smallButton} disabled={!canQuestionInteract}>{"\uCC38\uC5EC \uCDE8\uC18C"}</button></div></div></article>) : <div className={styles.emptyState}><p className={styles.emptyStateTitle}>아직 질문이 없어요</p><p className={styles.emptyStateDescription}>첫 질문을 남기면 진행자와 참여자가 함께 답변을 이어갈 수 있어요.</p></div>}
              </div>
            </>
          ) : null}
          {["progress", "resting", "graduated"].includes(visiblePanel) ? (
            <>
              <div className={styles.sectionHead}>
                <div className={styles.noticeHeadMeta}>
                  <h2 className={styles.sectionTitle}>{visiblePanel === "progress" ? "진행 중인 참여자" : visiblePanel === "resting" ? "휴식 참여자" : "졸업 참여자"}</h2>
                  <span className={styles.noticeCountText}>{currentBoards.length}명</span>
                </div>
              </div>
              <div className={styles.progressCardsGrid}>
                {currentBoards.length > 0 ? pagedCurrentBoards.map((board) => {
                  const status = getBoardStatus(board);
                  const isOwnBoard = Boolean((currentUserId && board.userId === currentUserId) || (currentUserName && board.name === currentUserName));
                  const canReactivate = currentRoom ? activeParticipantCount < currentRoom.capacity : false;
                  const isQueuedForReactivation = waitingParticipantsOrdered.some((participant) => participant.userId === board.userId);
                  return (
                    <article key={board.id} className={`${styles.progressParticipantCard} ${status === "resting" ? styles.progressParticipantCardResting : status === "graduated" ? styles.progressParticipantCardAlert : ""}`} role="button" tabIndex={0} onClick={() => openBoardModal(board.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openBoardModal(board.id); } }}>
                      <span className={`${styles.progressAvatarWrap} ${status === "resting" ? styles.progressAvatarWrapResting : ""}`}><span className={`${styles.progressAvatarIcon} ${status === "resting" ? styles.progressAvatarIconResting : ""}`}>○</span></span>
                      <strong className={styles.progressParticipantName}>{board.name}</strong>
                      <p className={styles.progressParticipantMeta}>{formatElapsedDayLabel(board.lastActivityAt)}</p>
                      {status === "resting" && isOwnBoard ? (
                        <button
                          type="button"
                          className={styles.smallButton}
                          onClick={(event) => { event.stopPropagation(); void handleReactivateBoard(board); }}
                        >
                          {isQueuedForReactivation ? "대기 취소" : canReactivate ? "휴면 해제" : "참여 대기"}
                        </button>
                      ) : null}
                      {isHost && board.role === "participant" && status !== "graduated" ? <button type="button" className={styles.textButtonDanger} onClick={(event) => { event.stopPropagation(); void handleHostRemoveParticipant(board); }}>{"\uCC38\uC5EC \uCDE8\uC18C"}</button> : null}
{status === "graduated" ? <p className={styles.progressParticipantWarn}>졸업 완료</p> : null}
                    </article>
                  );
                }) : <div className={`${styles.emptyState} ${styles.progressEmptyState}`}><p className={`${styles.emptyStateTitle} ${styles.progressEmptyStateTitle}`}>해당 상태의 참여자가 아직 없어요</p><p className={`${styles.emptyStateDescription} ${styles.progressEmptyStateDescription}`}>참여자가 생기면 이곳에 카드가 만들어집니다.</p></div>}
              </div>
              {currentBoards.length > progressCardsPageSize ? (
                <div className={styles.questionPagination}>
                  <button type="button" className={styles.questionPageButton} disabled={currentProgressCardsPage <= 1} onClick={() => setProgressPanelPages((current) => ({ ...current, [currentProgressPanel]: Math.max(1, current[currentProgressPanel] - 1) }))}>이전</button>
                  <span className={styles.questionPageLabel}>{currentProgressCardsPage} / {progressCardsTotalPages}</span>
                  <button type="button" className={styles.questionPageButton} disabled={currentProgressCardsPage >= progressCardsTotalPages} onClick={() => setProgressPanelPages((current) => ({ ...current, [currentProgressPanel]: Math.min(progressCardsTotalPages, current[currentProgressPanel] + 1) }))}>다음</button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
      <aside className={styles.sideColumn}>
        <section className={styles.sectionCard}>
          <div className={styles.summaryList}>
            <div className={styles.summaryRow}><span>진행자</span><span className={styles.summaryValue}>@{currentRoom.hostName}</span></div>
            <div className={styles.summaryRow}><span>일정</span><span className={styles.summaryValue}>{formatCompanionSchedule(currentRoom)}</span></div>
            <div className={styles.summaryRow}><span>난이도</span><span className={styles.summaryValue}>{currentRoom.level}</span></div>
            <div className={styles.summaryRow}><span>도안 방식</span><span className={styles.summaryValue}>{getPatternSourceLabel(currentRoom)}</span></div>
            <div className={styles.summaryRow}><span>진행 인원</span><span className={styles.summaryValue}>{activeParticipantCount}/{currentRoom.capacity}</span></div>
          </div>
        </section>
        {canViewProgressPanels ? (
          <section className={styles.sectionCard}>
            <div className={styles.summaryList}>
              <div className={styles.summaryRow}><span>진행</span><span className={styles.summaryValue}>{activeBoards.length}</span></div>
              <div className={styles.summaryRow}><span>휴식</span><span className={styles.summaryValue}>{restingBoards.length}</span></div>
              <div className={styles.summaryRow}><span>졸업</span><span className={styles.summaryValue}>{graduatedBoards.length}</span></div>
              <div className={styles.summaryRow}><span>준비도 체크</span><span className={styles.summaryValue}>{detailState.supplies.length > 0 ? `${participantSupplyProgress.filter((row) => row.checkedCount === detailState.supplies.length).length}/${detailState.boards.length}` : `0/${detailState.boards.length}`}</span></div>
            </div>
          </section>
        ) : null}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHead}>
            <div className={styles.noticeHeadMeta}>
              <h2 className={styles.sectionTitle}>참여 대기 인원</h2>
              <span className={styles.noticeCountText}>{waitingParticipantsOrdered.length}명</span>
            </div>
          </div>
          {waitingParticipantsOrdered.length > 0 ? (
            <ol className={styles.waitingList}>
              {waitingParticipantsOrdered.map((participant, index) => (
                <li key={participant.id} className={styles.waitingItem}>
                  <span className={styles.waitingOrder}>{index + 1}.</span>
                  <span className={styles.waitingName}>{participant.name}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.sectionDescription}>현재 참여 대기 인원이 없어요.</p>
          )}
        </section>
      </aside>
      </div></div>
      {selectedBoard ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="참여자 진행 상황">
          <div className={styles.modalDialog}>
            <button type="button" onClick={closeBoardModal} className={styles.progressModalClose}>×</button>
            <div className={styles.progressModalHead}>
              <div className={styles.progressModalLead}>
                <span className={styles.progressAvatarWrap}>
                  <span className={styles.progressAvatarIcon}>○</span>
                </span>
                <div>
                  <h2 className={styles.modalTitle}>{selectedBoard.name}님의 진행 상황</h2>
                  <p className={styles.sectionDescription}>마지막 업데이트: {formatDateTimeLabel(selectedBoard.lastActivityAt)}</p>
                </div>
              </div>
              {canEditSelectedBoardProgress ? (
                <button type="button" onClick={() => openGraduationModal(selectedBoard)} className={`${styles.ghostButton} ${styles.graduateButton}`}>졸업하기</button>
              ) : null}
            </div>
            {canEditSelectedBoardProgress ? (
              <>
                <div className={`${styles.sectionHead} ${styles.progressComposerToggleRow}`}>
                  <div className={styles.noticeHeadMeta}>
                    <h3 className={styles.sectionTitle}>내 진행 기록</h3>
                    <span className={styles.noticeCountText}>{selectedBoardPostCount}개</span>
                  </div>
                  <button type="button" onClick={() => setIsProgressComposerOpen((current) => !current)} className={styles.smallButton}>
                    {isProgressComposerOpen ? "기록 작성 닫기" : "기록 작성 열기"}
                  </button>
                </div>
                {isProgressComposerOpen ? (
                  <div className={`${styles.composer} ${styles.progressComposerPanel}`}>
                    <label className={styles.label}>내 진행 기록 작성</label>
                    <input value={progressTitle} onChange={(event) => setProgressTitle(event.target.value)} placeholder="기록 제목" className={styles.input} />
                    <textarea value={progressContent} onChange={(event) => setProgressContent(event.target.value)} placeholder="오늘 어디까지 진행했는지 적어보세요." rows={4} className={styles.textarea} />
                    <div className={styles.progressImageComposer}>
                      {progressImagePreviewUrl ? (
                        <div className={styles.progressImagePreviewWrap}>
                          <Image src={progressImagePreviewUrl} alt="기록 이미지 미리보기" width={96} height={96} className={styles.progressImagePreview} unoptimized={progressImagePreviewUrl.startsWith("blob:") || progressImagePreviewUrl.startsWith("data:")} />
                          <button type="button" onClick={removeProgressImage} className={styles.smallGhostButton}>사진 제거</button>
                        </div>
                      ) : null}
                      <label htmlFor="progress-image-upload" className={styles.smallGhostButton}>사진 첨부</label>
                      <input id="progress-image-upload" type="file" accept="image/*" onChange={handleProgressImageChange} className={styles.hiddenFileInput} />
                    </div>
                    <div className={styles.composerFooter}>
                      <button type="button" onClick={() => void handleProgressSubmit(selectedBoard)} className={styles.submitButton}>진행 기록 등록</button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
            {!isProgressComposerOpen ? (
              <div className={styles.boardTimeline}>
                {selectedBoard.posts.length > 0 ? pagedProgressPosts.map((post) => (
                  <article
                    key={post.id}
                    className={`${styles.timelineCard} ${styles.timelineCardInteractive}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => openProgressPostModal(post.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openProgressPostModal(post.id);
                      }
                    }}
                  >
                    <div className={styles.commentMeta}>
                      <span className={`${styles.commentAuthor} ${styles.timelineTitle}`}>{post.title}</span>
                      <span className={styles.commentDate}>{formatDateTimeLabel(post.createdAt)}</span>
                    </div>
                    {post.imagePath ? (
                      <Image src={getProgressImageUrl(post.imagePath)} alt={`${post.title} 이미지`} width={38} height={38} className={styles.timelineThumb} unoptimized={post.imagePath.startsWith("blob:") || post.imagePath.startsWith("data:")} />
                    ) : null}
                    <p className={`${styles.commentBody} ${styles.timelineBody}`}>{post.content}</p>
                  </article>
                )) : (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyStateTitle}>아직 등록된 진행 기록이 없어요</p>
                    <p className={styles.emptyStateDescription}>첫 기록을 남기면 이곳에 타임라인으로 쌓여요.</p>
                  </div>
                )}
                {selectedBoard.posts.length > progressPostPageSize ? (
                  <div className={styles.questionPagination}>
                    <button type="button" className={styles.questionPageButton} disabled={currentProgressPostPage <= 1} onClick={() => setProgressPostPage((current) => Math.max(1, current - 1))}>이전</button>
                    <span className={styles.questionPageLabel}>{currentProgressPostPage} / {progressPostTotalPages}</span>
                    <button type="button" className={styles.questionPageButton} disabled={currentProgressPostPage >= progressPostTotalPages} onClick={() => setProgressPostPage((current) => Math.min(progressPostTotalPages, current + 1))}>다음</button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {selectedBoard && selectedProgressPost ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="진행 기록 상세">
          <div className={styles.modalDialog}>
            <button type="button" onClick={closeProgressPostModal} className={styles.progressModalClose}>×</button>
            <div className={styles.progressPostModalHead}>
              <h3 className={styles.modalTitle}>{selectedProgressPost.title}</h3>
              <p className={styles.sectionDescription}>{formatDateTimeLabel(selectedProgressPost.createdAt)}</p>
            </div>
            <div className={styles.progressPostModalCard}>
              {selectedProgressPost.imagePath ? (
                <Image src={getProgressImageUrl(selectedProgressPost.imagePath)} alt={`${selectedProgressPost.title} 이미지`} width={640} height={360} className={styles.progressPostModalImage} unoptimized={selectedProgressPost.imagePath.startsWith("blob:") || selectedProgressPost.imagePath.startsWith("data:")} />
              ) : null}
              <p className={styles.progressPostModalBody}>{selectedProgressPost.content}</p>
            </div>
          </div>
        </div>
      ) : null}
      {isWaitingCancelModalOpen ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="참여 대기 취소 확인">
          <div className={styles.modalDialog}>
            <h2 className={styles.modalTitle}>참여 대기 취소</h2>
            <p className={styles.sectionDescription}>지금 대기 취소할 경우 추후 대기 시 맨 후순위로 밀립니다. 그래도 취소하시겠습니까?</p>
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setIsWaitingCancelModalOpen(false)} className={styles.secondaryAction}>돌아가기</button>
              <button type="button" onClick={() => void handleConfirmWaitingCancel()} className={styles.dangerButton}>대기 취소</button>
            </div>
          </div>
        </div>
      ) : null}
      {graduationTargetId ? <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="졸업 확인"><div className={styles.modalDialog}><h2 className={styles.modalTitle}>정말 졸업하시겠습니까?</h2><p className={styles.sectionDescription}>졸업 상태가 되면 다시 진행 상태로 돌아올 수 없고, 정원 카운트에서도 빠집니다.</p><div className={styles.modalActions}><button type="button" onClick={() => setGraduationTargetId(null)} className={styles.secondaryAction}>취소</button><button type="button" onClick={() => void confirmGraduation()} className={styles.dangerButton}>졸업 확정</button></div></div></div> : null}
    </>
  );
}
