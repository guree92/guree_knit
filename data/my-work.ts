export type WorkProgress = "완성" | "진행 중" | "중단";

export type WorkItem = {
  id: string;
  title: string;
  progress: WorkProgress;
  yarn: string;
  note: string;
  needle: string;
  startedAt: string;
  updatedAt: string;
  detail: string;
  checklist: string[];
};

export const workFilters = ["전체", "진행 중", "완성", "중단"] as const;
export type WorkFilter = "전체" | WorkProgress;

export const workItems: WorkItem[] = [
  {
    id: "tulip-coaster-set",
    title: "튤립 코스터 세트",
    progress: "완성",
    yarn: "코튼사",
    note: "선물용으로 하나 더 만들 예정",
    needle: "코바늘 4호",
    startedAt: "2026-03-01",
    updatedAt: "2026-03-10",
    detail:
      "꽃잎 부분 색 조합이 예쁘게 나와서 만족스러웠어. 같은 패턴으로 다른 색 조합도 시도해보고 싶어.",
    checklist: ["기본 원형 뜨기 완료", "꽃잎 6장 완성", "실 정리 및 마감 완료"],
  },
  {
    id: "net-bag-project",
    title: "네트백",
    progress: "진행 중",
    yarn: "린넨 혼방",
    note: "손잡이 길이 조금 더 늘릴지 고민 중",
    needle: "코바늘 5호",
    startedAt: "2026-03-05",
    updatedAt: "2026-03-12",
    detail:
      "가방 몸판은 거의 완성했고 손잡이만 조정 중이야. 늘어짐이 너무 심하지 않게 마감 방법을 고민하고 있어.",
    checklist: ["바닥 원형 완성", "몸판 네트무늬 진행 중", "손잡이 길이 테스트 필요"],
  },
  {
    id: "rabbit-doll-project",
    title: "토끼 인형",
    progress: "중단",
    yarn: "아크릴사",
    note: "귀 부분 모양 수정 필요",
    needle: "코바늘 4호",
    startedAt: "2026-02-25",
    updatedAt: "2026-03-04",
    detail:
      "얼굴은 괜찮은데 귀 비율이 마음에 안 들어서 잠깐 멈춘 상태야. 다음엔 귀 도안을 조금 수정해서 다시 시도할 예정이야.",
    checklist: ["몸통 완성", "얼굴 자수 완료", "귀 도안 수정 필요"],
  },
];

export function getWorkById(id: string) {
  return workItems.find((item) => item.id === id);
}

export function getProgressBadgeClass(progress: WorkProgress) {
  if (progress === "완성") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (progress === "진행 중") {
    return "bg-violet-100 text-violet-700";
  }
  return "bg-amber-100 text-amber-700";
}