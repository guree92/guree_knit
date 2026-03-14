export const communityCategories = [
  "전체",
  "완성작",
  "질문",
  "정보공유",
  "같이뜨기",
] as const;

export type CommunityCategory = (typeof communityCategories)[number];
export type PostCategory = Exclude<CommunityCategory, "전체">;

export type CommunityLikeCountRow = {
  count: number;
};

export type CommunityPostRow = {
  id: string;
  category: PostCategory;
  title: string;
  content: string;
  author_name: string | null;
  author_email?: string | null;
  is_hidden?: boolean | null;
  hidden_at?: string | null;
  tags: string[] | null;
  created_at: string | null;
  community_likes?: CommunityLikeCountRow[];
};

export type CommunityPost = {
  id: string;
  category: PostCategory;
  title: string;
  author: string;
  authorEmail: string | null;
  preview: string;
  content: string;
  tags: string[];
  createdAt: string;
  likes: number;
  isHidden: boolean;
  hiddenAt: string | null;
};

export function makePreview(content: string, maxLength = 120) {
  const cleaned = content.replace(/\s+/g, " ").trim();

  if (cleaned.length <= maxLength) return cleaned;

  return `${cleaned.slice(0, maxLength)}...`;
}

export function mapCommunityPost(row: CommunityPostRow): CommunityPost {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    author: row.author_name ?? "익명",
    authorEmail: row.author_email ?? null,
    preview: makePreview(row.content ?? ""),
    content: row.content ?? "",
    tags: row.tags ?? [],
    createdAt: row.created_at ?? "",
    likes: row.community_likes?.[0]?.count ?? 0,
    isHidden: Boolean(row.is_hidden),
    hiddenAt: row.hidden_at ?? null,
  };
}

export function formatCommunityDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
