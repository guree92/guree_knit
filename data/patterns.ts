export type PatternItem = {
  id: string;
  title: string;
  level: "초급" | "중급" | "고급";
  category: "가방" | "목도리" | "인형" | "모자" | "의류" | "소품";
  desc: string;
  yarn: string;
  needle: string;
  size: string;
  tips: string[];
};

export const patternCategories = [
  "전체",
  "가방",
  "목도리",
  "인형",
  "모자",
  "의류",
  "소품",
] as const;

export const patternItems: PatternItem[] = [
  {
    id: "spring-net-bag",
    title: "봄 네트백",
    level: "초급",
    category: "가방",
    desc: "가볍고 산뜻하게 들 수 있는 코바늘 네트백 도안이야.",
    yarn: "코튼 혼방사",
    needle: "코바늘 5호",
    size: "가로 24cm / 세로 20cm",
    tips: [
      "손잡이 부분은 조금 더 촘촘하게 떠주면 늘어짐이 덜해.",
      "봄·여름용 실을 쓰면 더 가볍게 완성돼.",
      "초보라면 단색 실로 먼저 떠보는 걸 추천해.",
    ],
  },
  {
    id: "ribbon-muffler",
    title: "리본 머플러",
    level: "중급",
    category: "목도리",
    desc: "포근한 계절감이 느껴지는 부드러운 머플러 도안이야.",
    yarn: "메리노 울",
    needle: "대바늘 8호",
    size: "폭 18cm / 길이 150cm",
    tips: [
      "리본 포인트는 마지막 마감 전에 길이 확인이 중요해.",
      "너무 두꺼운 실보단 중간 굵기가 형태가 예쁘게 나와.",
      "선물용이면 파스텔 톤 색상이 잘 어울려.",
    ],
  },
  {
    id: "rabbit-doll",
    title: "토끼 인형",
    level: "중급",
    category: "인형",
    desc: "손바닥 크기로 만들기 좋은 귀여운 인형 도안이야.",
    yarn: "아크릴 혼방사",
    needle: "코바늘 4호",
    size: "약 12cm",
    tips: [
      "귀 부분은 좌우 길이를 맞춰가며 떠주는 게 좋아.",
      "솜을 너무 많이 넣으면 얼굴 형태가 딱딱해질 수 있어.",
      "눈 위치를 먼저 잡고 마감하면 훨씬 안정적이야.",
    ],
  },
  {
    id: "daily-beanie",
    title: "데일리 비니",
    level: "초급",
    category: "모자",
    desc: "무난하게 코디하기 좋은 베이직한 비니 도안이야.",
    yarn: "울 혼방사",
    needle: "대바늘 6호",
    size: "성인 프리",
    tips: [
      "머리 둘레에 맞게 시작 코 수를 조절해줘.",
      "고무단 부분 텐션을 일정하게 맞추면 핏이 예뻐.",
      "무난한 컬러를 쓰면 데일리로 활용하기 좋아.",
    ],
  },
  {
    id: "flower-coaster",
    title: "플라워 코스터",
    level: "초급",
    category: "소품",
    desc: "짧은 시간 안에 완성할 수 있는 꽃 모양 코스터 도안이야.",
    yarn: "코튼사",
    needle: "코바늘 4호",
    size: "지름 약 10cm",
    tips: [
      "꽃잎 부분은 단마다 모양을 살짝 잡아주면 더 예뻐.",
      "여러 색으로 세트 구성하면 선물용으로 좋아.",
      "짧은 시간 안에 완성돼서 초보 연습용으로도 추천이야.",
    ],
  },
  {
    id: "warm-vest",
    title: "포근한 조끼",
    level: "고급",
    category: "의류",
    desc: "레이어드해서 입기 좋은 니트 조끼 도안이야.",
    yarn: "울 + 알파카 혼방",
    needle: "대바늘 7호",
    size: "55~66 기준",
    tips: [
      "암홀과 넥라인 줄임 구간에서 단수 체크가 중요해.",
      "처음엔 단색으로 떠보는 게 실수 확인이 쉬워.",
      "레이어드 핏을 생각해서 너무 짧지 않게 길이를 잡아줘.",
    ],
  },
];

export function getPatternById(id: string) {
  return patternItems.find((item) => item.id === id);
}