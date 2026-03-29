import {
  getCompanionSummaryStats,
  mapCompanionRoom,
  type CompanionRoom,
  type CompanionRoomRow,
} from "@/lib/companion";

const companionRoomRows: CompanionRoomRow[] = [
  {
    id: "sunday-cardigan",
    title: "봄 가디건 동행",
    pattern_name: "Sunday Cardigan",
    host_name: "woolmood",
    summary:
      "가디건 도안을 같이 뜨면서 주 1회 체크인하는 방이에요. 실 정보와 사이즈 팁도 함께 정리해두었습니다.",
    start_date: "2026-03-25",
    end_date: "2026-04-22",
    recruit_until: "2026-03-24",
    level: "중급",
    capacity: 8,
    participant_count: 6,
    status: "모집중",
    tags: ["대바늘", "웨어", "주간체크인"],
    created_at: "2026-03-18T10:00:00+09:00",
  },
  {
    id: "checker-bag",
    title: "체커보드 백 완성 챌린지",
    pattern_name: "Checker Bag",
    host_name: "mimi_loop",
    summary:
      "주말 동안 빠르게 완성하는 짧은 동행이에요. 배색 순서와 손잡이 마감법을 같이 맞춰가며 뜹니다.",
    start_date: "2026-03-22",
    end_date: "2026-03-29",
    recruit_until: "2026-03-21",
    level: "초중급",
    capacity: 12,
    participant_count: 10,
    status: "\uBAA8\uC9D1\uC911",
    tags: ["코바늘", "가방", "단기동행"],
    created_at: "2026-03-19T18:30:00+09:00",
  },
  {
    id: "granny-blanket",
    title: "그래니 블랭킷 한 달 프로젝트",
    pattern_name: "Granny Blanket",
    host_name: "cottonnote",
    summary:
      "큰 작품을 혼자 뜨기 막막한 사람들을 위한 느린 동행이에요. 조각별 진도 공유와 색 조합 피드백이 활발합니다.",
    start_date: "2026-03-06",
    end_date: "2026-04-03",
    recruit_until: "2026-03-05",
    level: "입문",
    capacity: 16,
    participant_count: 14,
    status: "진행중",
    tags: ["모티브", "입문", "색조합"],
    created_at: "2026-03-01T09:00:00+09:00",
  },
  {
    id: "lace-socks",
    title: "레이스 양말 첫 도전방",
    pattern_name: "Lace Socks",
    host_name: "stitchday",
    summary:
      "매직루프와 뒤꿈치 뜨기가 낯선 분들을 위해 체크 포인트를 촘촘히 잡아둔 소규모 동행입니다.",
    start_date: "2026-03-28",
    end_date: "2026-04-18",
    recruit_until: "2026-03-27",
    level: "중상급",
    capacity: 6,
    participant_count: 4,
    status: "모집중",
    tags: ["양말", "매직루프", "소규모"],
    created_at: "2026-03-20T08:00:00+09:00",
  },
  {
    id: "mini-bear-keyring",
    title: "미니 곰 키링 완주반",
    pattern_name: "Mini Bear Keyring",
    host_name: "loopdaisy",
    summary:
      "짧고 가볍게 완성 경험을 만들고 싶은 사람들을 위한 동행이에요. 하루 한 번 사진 인증으로 속도를 맞춥니다.",
    start_date: "2026-03-10",
    end_date: "2026-03-17",
    recruit_until: "2026-03-09",
    level: "입문",
    capacity: 10,
    participant_count: 10,
    status: "\uC9C4\uD589\uC911",
    tags: ["키링", "완주기록", "짧은프로젝트"],
    created_at: "2026-03-02T14:00:00+09:00",
  },
];

export const companionRooms: CompanionRoom[] = companionRoomRows.map((row) =>
  mapCompanionRoom(row)
);

export const companionHighlights = getCompanionSummaryStats(companionRooms);

export const companionFeedItems = [
  "Sunday Cardigan 방에서 사이즈 수정 팁이 올라왔어요.",
  "Checker Bag 동행이 오늘 밤 9시에 시작해요.",
  "Granny Blanket 방에서 3주차 인증 사진이 추가됐어요.",
];

export function getCompanionRoomById(id: string) {
  return companionRooms.find((room) => room.id === id);
}
