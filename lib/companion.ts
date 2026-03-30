import type { DetailRow } from "@/lib/pattern-detail";

export const companionStatuses = ["모집중", "진행중"] as const;
export const companionLevels = ["입문", "초급", "중급", "중상급", "고급"] as const;
export const companionThreadTypes = ["질문", "인증"] as const;
export const companionPatternSourceTypes = ["site", "custom", "external"] as const;
export const companionDraftStorageKey = "knit_companion_room_draft";
export const customCompanionRoomsStorageKey = "knit_custom_companion_rooms";

export type CompanionStatus = (typeof companionStatuses)[number];
export type CompanionLevel = (typeof companionLevels)[number];
export type CompanionThreadType = (typeof companionThreadTypes)[number];
export type CompanionPatternSourceType = (typeof companionPatternSourceTypes)[number];

export type CompanionCustomPatternData = {
  title: string;
  level: "초급" | "중급" | "고급";
  category: string;
  description: string;
  tags: string[];
  duration: string | null;
  totalYarnAmount: string | null;
  yarn: string;
  needle: string;
  size: string;
  detailContent: string | null;
  detailRows: DetailRow[] | null;
  copyrightSource: "본인" | "무료배포" | null;
  copyrightSourceUrl?: string | null;
  copyrightHobbyOnly: boolean | null;
  copyrightColorVariation: boolean | null;
  copyrightSizeVariation: boolean | null;
  copyrightCommercialUse: boolean | null;
  copyrightRedistribution: boolean | null;
  copyrightModificationResale: boolean | null;
  imagePath: string | null;
};

export type CompanionRoomRow = {
  id: string;
  host_user_id?: string | null;
  pattern_id?: string | null;
  pattern_source_type?: CompanionPatternSourceType | null;
  pattern_external_url?: string | null;
  pattern_external_image_path?: string | null;
  custom_pattern_data?: CompanionCustomPatternData | null;
  title: string;
  pattern_name: string;
  host_name?: string | null;
  summary: string;
  start_date: string;
  end_date: string;
  recruit_until: string;
  level: CompanionLevel;
  capacity: number;
  participant_count?: number;
  status: CompanionStatus;
  tags: string[] | null;
  created_at: string;
};

export type CompanionRoom = {
  id: string;
  hostUserId?: string | null;
  patternId?: string | null;
  patternSourceType?: CompanionPatternSourceType | null;
  patternExternalUrl?: string | null;
  patternExternalImagePath?: string | null;
  customPatternData?: CompanionCustomPatternData | null;
  title: string;
  patternName: string;
  hostName: string;
  summary: string;
  startDate: string;
  endDate: string;
  recruitUntil: string;
  level: CompanionLevel;
  capacity: number;
  participantCount: number;
  status: CompanionStatus;
  tags: string[];
  createdAt: string;
};

export type CompanionNoticeRow = {
  id: string;
  room_id: string;
  author_user_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
};

export type CompanionSupplyRow = {
  id: string;
  room_id: string;
  label: string;
  sort_order: number;
  created_at: string;
};

export type CompanionSupplyCheckRow = {
  supply_id: string;
  user_id: string;
};

export type CompanionThreadRow = {
  id: string;
  room_id: string;
  author_user_id: string;
  type: "question" | "certification";
  content: string;
  created_at: string;
};

export type CompanionThreadCommentRow = {
  id: string;
  thread_id: string;
  author_user_id: string;
  content: string;
  created_at: string;
};

export type CompanionCheckInRow = {
  id: string;
  room_id: string;
  author_user_id: string;
  title: string;
  content: string;
  created_at: string;
};

export type CompanionParticipant = {
  id: string;
  name: string;
  role: "진행자" | "참여중";
};

export type CompanionSupplyItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type CompanionThreadCommentItem = {
  id: string;
  author: string;
  content: string;
  createdAt: string;
};

export type CompanionThreadItem = {
  id: string;
  type: CompanionThreadType;
  author: string;
  content: string;
  createdAt: string;
  comments?: CompanionThreadCommentItem[];
};

export type CompanionCheckIn = {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
};

export type CompanionRoomState = {
  participants: CompanionParticipant[];
  notices: string[];
  supplies: CompanionSupplyItem[];
  threads: CompanionThreadItem[];
  checkIns: CompanionCheckIn[];
};

export function getEffectiveCompanionStatus(
  _status: CompanionStatus,
  participantCount: number,
  capacity: number
): CompanionStatus {
  if (capacity > 0 && participantCount >= capacity) return "진행중";
  return "모집중";
}

export function mapCompanionRoom(
  row: CompanionRoomRow,
  overrides: Partial<Pick<CompanionRoom, "hostName">> = {}
): CompanionRoom {
  return {
    id: row.id,
    hostUserId: row.host_user_id ?? null,
    patternId: row.pattern_id ?? null,
    patternSourceType: row.pattern_source_type ?? null,
    patternExternalUrl: row.pattern_external_url ?? null,
    patternExternalImagePath: row.pattern_external_image_path ?? null,
    customPatternData: row.custom_pattern_data ?? null,
    title: row.title,
    patternName: row.pattern_name,
    hostName: overrides.hostName ?? row.host_name ?? "진행자",
    summary: row.summary,
    startDate: row.start_date,
    endDate: row.end_date,
    recruitUntil: row.recruit_until,
    level: row.level,
    capacity: row.capacity,
    participantCount: row.participant_count ?? 0,
    status: getEffectiveCompanionStatus(row.status, row.participant_count ?? 0, row.capacity),
    tags: row.tags ?? [],
    createdAt: row.created_at,
  };
}

export function mapCompanionThreadType(value: CompanionThreadRow["type"]): CompanionThreadType {
  return value === "question" ? "질문" : "인증";
}

export function toCompanionThreadDbType(value: CompanionThreadType): CompanionThreadRow["type"] {
  return value === "질문" ? "question" : "certification";
}

export function formatCompanionDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatCompanionSchedule(room: Pick<CompanionRoom, "startDate" | "endDate">) {
  const start = formatCompanionDate(room.startDate);
  const end = formatCompanionDate(room.endDate);

  if (!start && !end) return "";
  if (!start) return `${end}`;
  if (!end) return `${start}`;
  return `${start} · ${end}`;
}

export function formatCompanionMembers(room: Pick<CompanionRoom, "participantCount" | "capacity">) {
  return `${room.participantCount}/${room.capacity}`;
}

export function isCompanionRecruitingOpen(room: Pick<CompanionRoom, "participantCount" | "capacity">) {
  return room.participantCount < room.capacity;
}

export function getCompanionSummaryStats(rooms: CompanionRoom[]) {
  const recruitingCount = rooms.filter((room) => room.status === "모집중").length;
  const inProgressCount = rooms.filter((room) => room.status === "진행중").length;

  return [
    { label: "모집중", value: `${recruitingCount}개` },
    { label: "진행중", value: `${inProgressCount}개` },
  ];
}

export function getCompanionRoomStateStorageKey(roomId: string) {
  return `knit_companion_room_state:${roomId}`;
}

export function createDefaultCompanionRoomState(room: CompanionRoom): CompanionRoomState {
  const participantCount = Math.max(1, room.participantCount);
  const participants = Array.from({ length: participantCount }, (_, index) => ({
    id: `${room.id}-participant-${index + 1}`,
    name: index === 0 ? room.hostName : `참여메이트${index}`,
    role: index === 0 ? ("진행자" as const) : ("참여중" as const),
  }));

  return {
    participants,
    notices: [
      "동행 진행 규칙과 공지를 먼저 확인해 주세요.",
      `${room.patternName} 기준으로 진행하고, 막히는 부분은 질문 탭에 남겨 주세요.`,
      "체크인 기록과 중간 진행 사진은 기록 탭에 정리하면 좋아요.",
    ],
    supplies: [
      { id: `${room.id}-supply-pattern`, label: `${room.patternName} 도안 확인`, checked: false },
      { id: `${room.id}-supply-yarn`, label: "사용 실 준비", checked: false },
      { id: `${room.id}-supply-needle`, label: "바늘 호수 확인", checked: false },
      { id: `${room.id}-supply-note`, label: "체크인 일정 확인", checked: false },
    ],
    threads: [
      {
        id: `${room.id}-question-1`,
        type: "질문",
        author: "참여메이트1",
        content: "대체 가능한 재료가 있다면 같이 공유해 주세요.",
        createdAt: room.createdAt,
        comments: [
          {
            id: `${room.id}-question-1-comment-1`,
            author: room.hostName,
            content: "진행하면서 확인한 대체 재료가 있으면 계속 여기에 모아둘게요.",
            createdAt: room.createdAt,
          },
        ],
      },
      {
        id: `${room.id}-cert-1`,
        type: "인증",
        author: "참여메이트2",
        content: "실과 바늘 준비 완료했고 시작 전에 게이지부터 떠보겠습니다.",
        createdAt: room.createdAt,
        comments: [],
      },
    ],
    checkIns: [
      {
        id: `${room.id}-checkin-1`,
        title: "시작 준비",
        content: "도안, 실, 바늘을 먼저 정리하고 첫 체크인을 남겨 주세요.",
        author: room.hostName,
        createdAt: room.createdAt,
      },
      {
        id: `${room.id}-checkin-2`,
        title: "중간 점검",
        content: "사이즈, 배색, 게이지를 서로 확인하면서 진행 속도를 맞춰요.",
        author: room.hostName,
        createdAt: room.createdAt,
      },
    ],
  };
}

export function serializeCompanionRooms(rooms: CompanionRoom[]) {
  return JSON.stringify(rooms);
}

export function deserializeCompanionRooms(raw: string | null) {
  if (!raw) return [] as CompanionRoom[];

  try {
    const parsed = JSON.parse(raw) as CompanionRoom[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (room) =>
        typeof room?.id === "string" &&
        typeof room?.title === "string" &&
        typeof room?.patternName === "string"
    );
  } catch {
    return [];
  }
}

export function serializeCompanionRoomState(state: CompanionRoomState) {
  return JSON.stringify(state);
}

export function deserializeCompanionRoomState(raw: string | null, fallback: CompanionRoomState) {
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<CompanionRoomState>;

    return {
      participants: Array.isArray(parsed.participants) ? parsed.participants : fallback.participants,
      notices: Array.isArray(parsed.notices) ? parsed.notices : fallback.notices,
      supplies: Array.isArray(parsed.supplies) ? parsed.supplies : fallback.supplies,
      threads: Array.isArray(parsed.threads) ? parsed.threads : fallback.threads,
      checkIns: Array.isArray(parsed.checkIns) ? parsed.checkIns : fallback.checkIns,
    };
  } catch {
    return fallback;
  }
}
