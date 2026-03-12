export type PostCategory = "완성작" | "질문" | "팁공유" | "같이뜨기";

export type CommunityPost = {
  id: string;
  category: PostCategory;
  title: string;
  author: string;
  preview: string;
  content: string;
  tags: string[];
};

export const communityCategories = [
  "전체",
  "완성작",
  "질문",
  "팁공유",
  "같이뜨기",
] as const;

export const communityPosts: CommunityPost[] = [
  {
    id: "first-rabbit-doll",
    category: "완성작",
    title: "첫 인형 뜨개 완성했어!",
    author: "ribbie",
    preview: "생각보다 시간이 오래 걸렸지만 너무 귀엽게 나와서 만족해.",
    content:
      "생각보다 시간이 오래 걸렸지만 너무 귀엽게 나와서 만족해. 귀 부분이 생각보다 어렵긴 했는데, 몇 번 다시 뜨면서 모양을 맞췄어. 다음엔 옷도 입혀보고 싶어.",
    tags: ["인형", "완성작", "초보도전"],
  },
  {
    id: "netbag-hook-size",
    category: "질문",
    title: "코바늘 6호로 네트백 뜨면 너무 흐물할까?",
    author: "knitday",
    preview: "실이 얇은 편인데 바늘 호수를 어느 정도로 잡아야 할지 고민이야.",
    content:
      "실이 얇은 편인데 바늘 호수를 어느 정도로 잡아야 할지 고민이야. 너무 흐물하면 가방으로 쓰기 힘들 것 같아서, 실제로 떠본 사람들 의견이 궁금해.",
    tags: ["네트백", "코바늘", "질문"],
  },
  {
    id: "yarn-organizing-tip",
    category: "팁공유",
    title: "실 정리 깔끔하게 하는 방법",
    author: "woolnote",
    preview: "남은 실이 많아질 때 나는 이렇게 보관해두고 있어.",
    content:
      "남은 실이 많아질 때 나는 색상별로 작은 지퍼백에 나눠 넣고, 바깥에 실 이름이랑 굵기를 적어둬. 프로젝트별로 묶어두면 나중에 다시 찾기도 편해.",
    tags: ["실정리", "보관팁", "팁공유"],
  },
  {
    id: "spring-coaster-group",
    category: "같이뜨기",
    title: "봄 코스터 같이 뜰 사람 구해요",
    author: "momo",
    preview: "난이도는 쉬운 편이라 초보도 같이 할 수 있어.",
    content:
      "난이도는 쉬운 편이라 초보도 같이 할 수 있어. 일주일 정도 가볍게 같이 떠보고, 각자 완성한 작품 사진도 공유하면 재밌을 것 같아.",
    tags: ["같이뜨기", "코스터", "모집"],
  },
];

export function getCommunityPostById(id: string) {
  return communityPosts.find((post) => post.id === id);
}