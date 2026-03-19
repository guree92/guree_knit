import { createClient } from "@/lib/supabase/client";
import type { PostCategory } from "@/lib/community";

const META_PREFIX = "<!--KNIT_COMMUNITY_META:";
const META_SUFFIX = ":KNIT_COMMUNITY_META-->";
const COMMUNITY_IMAGE_BUCKET = "pattern-images";

export const communityDraftStorageKey = "knit_community_post_draft";

export const communityExtraFieldConfig: Record<
  PostCategory,
  Array<{ key: string; label: string; placeholder: string }>
> = {
  "완성작": [
    { key: "patternName", label: "사용 도안", placeholder: "예: 봄 네트백 도안" },
    { key: "usedYarn", label: "사용 실", placeholder: "예: 코튼사 2볼" },
    { key: "usedNeedle", label: "사용 바늘", placeholder: "예: 코바늘 5호" },
  ],
  "질문": [
    { key: "usedYarn", label: "사용 실", placeholder: "예: 울 1합" },
    { key: "usedNeedle", label: "사용 바늘", placeholder: "예: 대바늘 4mm" },
    { key: "stuckPoint", label: "막힌 부분", placeholder: "어느 단, 어떤 부분에서 막혔는지 적어 주세요" },
  ],
  "정보공유": [
    { key: "sourceName", label: "출처/참고", placeholder: "예: 유튜브 채널, 블로그, 책 이름" },
    { key: "summary", label: "핵심 요약", placeholder: "한 줄로 무엇을 공유하는지 적어 주세요" },
    { key: "recommendedFor", label: "추천 대상", placeholder: "예: 코바늘 입문자, 대바늘 초급자" },
  ],
  "같이뜨기": [
    { key: "recruitUntil", label: "모집 기간", placeholder: "예: 4월 10일까지" },
    { key: "meetingType", label: "진행 방식", placeholder: "예: 오픈채팅, 댓글, 오프라인 모임" },
    { key: "schedule", label: "일정/주기", placeholder: "예: 매주 토요일 저녁 8시" },
  ],
};

export type CommunityPostMeta = {
  imagePath?: string | null;
  imageName?: string | null;
  extraFields?: Record<string, string>;
  ownerEmail?: string | null;
  ownerName?: string | null;
};

export type CommunityPostDraft = {
  category: PostCategory;
  title: string;
  body: string;
  tags: string[];
  extraFields: Record<string, string>;
};

export function createEmptyExtraFields(category: PostCategory) {
  return Object.fromEntries(communityExtraFieldConfig[category].map((field) => [field.key, ""]));
}

export function normalizeExtraFields(
  category: PostCategory,
  extraFields?: Record<string, string> | null
) {
  const allowedKeys = new Set(communityExtraFieldConfig[category].map((field) => field.key));

  return Object.fromEntries(
    Object.entries({
      ...createEmptyExtraFields(category),
      ...(extraFields ?? {}),
    }).filter(([key]) => allowedKeys.has(key))
  );
}

export function sanitizeCommunityTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().replace(/^#+/, "").replace(/\s+/g, " "))
        .filter(Boolean)
    )
  ).slice(0, 5);
}

export function buildCommunityPostContent(body: string, meta: CommunityPostMeta = {}) {
  const normalizedMeta: CommunityPostMeta = {
    imagePath: meta.imagePath?.trim() || null,
    imageName: meta.imageName?.trim() || null,
    ownerEmail: meta.ownerEmail?.trim().toLowerCase() || null,
    ownerName: meta.ownerName?.trim() || null,
    extraFields: Object.fromEntries(
      Object.entries(meta.extraFields ?? {}).filter(([, value]) => value.trim())
    ),
  };

  const hasMeta =
    Boolean(normalizedMeta.imagePath) ||
    Boolean(normalizedMeta.imageName) ||
    Boolean(normalizedMeta.ownerEmail) ||
    Boolean(normalizedMeta.ownerName) ||
    Object.keys(normalizedMeta.extraFields ?? {}).length > 0;

  if (!hasMeta) {
    return body.trim();
  }

  return `${META_PREFIX}${encodeURIComponent(JSON.stringify(normalizedMeta))}${META_SUFFIX}\n${body.trim()}`;
}

export function parseCommunityPostContent(rawContent: string | null | undefined) {
  const source = rawContent ?? "";

  if (!source.startsWith(META_PREFIX)) {
    return {
      body: source,
      meta: {
        imagePath: null,
        imageName: null,
        ownerEmail: null,
        ownerName: null,
        extraFields: {},
      } satisfies CommunityPostMeta,
    };
  }

  const endIndex = source.indexOf(META_SUFFIX);

  if (endIndex === -1) {
    return {
      body: source,
      meta: {
        imagePath: null,
        imageName: null,
        ownerEmail: null,
        ownerName: null,
        extraFields: {},
      } satisfies CommunityPostMeta,
    };
  }

  const encodedMeta = source.slice(META_PREFIX.length, endIndex);
  const body = source.slice(endIndex + META_SUFFIX.length).replace(/^\n+/, "");

  try {
    const parsed = JSON.parse(decodeURIComponent(encodedMeta)) as CommunityPostMeta;

    return {
      body,
      meta: {
        imagePath: parsed.imagePath?.trim() || null,
        imageName: parsed.imageName?.trim() || null,
        ownerEmail: parsed.ownerEmail?.trim().toLowerCase() || null,
        ownerName: parsed.ownerName?.trim() || null,
        extraFields: parsed.extraFields ?? {},
      } satisfies CommunityPostMeta,
    };
  } catch {
    return {
      body: source,
      meta: {
        imagePath: null,
        imageName: null,
        ownerEmail: null,
        ownerName: null,
        extraFields: {},
      } satisfies CommunityPostMeta,
    };
  }
}

export function getCommunityImageUrl(imagePath: string | null | undefined) {
  if (!imagePath) return "";

  const supabase = createClient();
  const { data } = supabase.storage.from(COMMUNITY_IMAGE_BUCKET).getPublicUrl(imagePath);

  return data.publicUrl;
}

export async function uploadCommunityImage(file: File, userId: string, postId: string) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const imagePath = `community/${userId}/${postId}/${Date.now()}.${extension}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from(COMMUNITY_IMAGE_BUCKET).upload(imagePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return imagePath;
}

export async function removeCommunityImage(imagePath: string) {
  const supabase = createClient();
  const { error } = await supabase.storage.from(COMMUNITY_IMAGE_BUCKET).remove([imagePath]);

  if (error) {
    throw new Error(error.message);
  }
}
