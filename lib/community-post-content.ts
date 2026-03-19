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
  "\uC644\uC131\uC791": [
    { key: "patternName", label: "\uC0AC\uC6A9 \uB3C4\uC548", placeholder: "\uC608: \uBC84\uC9C8 \uC2A4\uD018\uC5B4 \uB3C4\uC548" },
    { key: "usedYarn", label: "\uC0AC\uC6A9 \uC2E4", placeholder: "\uC608: \uCF54\uD2BC\uC0AC 2\uBCFC" },
    { key: "usedNeedle", label: "\uC0AC\uC6A9 \uBC14\uB298", placeholder: "\uC608: \uCF54\uBC14\uB298 5\uD638" },
  ],
  "\uC9C8\uBB38": [
    { key: "usedYarn", label: "\uC0AC\uC6A9 \uC2E4", placeholder: "\uC608: \uC6B8\uC0AC 1\uAC00\uB2E5" },
    { key: "usedNeedle", label: "\uC0AC\uC6A9 \uBC14\uB298", placeholder: "\uC608: \uB300\uBC14\uB298 4mm" },
    { key: "stuckPoint", label: "\uB9C9\uD78C \uBD80\uBD84", placeholder: "\uC5B4\uB5A4 \uBD80\uBD84\uC5D0\uC11C \uD5F7\uAC08\uB9AC\uB294\uC9C0 \uC801\uC5B4 \uC8FC\uC138\uC694" },
  ],
  "\uC815\uBCF4\uACF5\uC720": [
    { key: "sourceName", label: "\uCD9C\uCC98/\uCC38\uACE0", placeholder: "\uC608: \uC720\uD29C\uBE0C \uCC44\uB110, \uBE14\uB85C\uADF8 \uC774\uB984" },
    { key: "summary", label: "\uD575\uC2EC \uC694\uC57D", placeholder: "\uBB34\uC5C7\uC744 \uACF5\uC720\uD558\uB294\uC9C0 \uC9E7\uAC8C \uC801\uC5B4 \uC8FC\uC138\uC694" },
    { key: "recommendedFor", label: "\uCD94\uCC9C \uB300\uC0C1", placeholder: "\uC608: \uCF54\uBC14\uB298 \uC785\uBB38\uC790, \uB300\uBC14\uB298 \uCD08\uAE09\uC790" },
  ],
  "\uAC19\uC774\uB728\uAE30": [
    { key: "recruitUntil", label: "\uBAA8\uC9D1 \uAE30\uAC04", placeholder: "\uC608: 4\uC6D4 10\uC77C\uAE4C\uC9C0" },
    { key: "meetingType", label: "\uC9C4\uD589 \uBC29\uC2DD", placeholder: "\uC608: \uC624\uD508\uCC44\uD305, \uC815\uAE30, \uC624\uD504\uB77C\uC778 \uBAA8\uC784" },
    { key: "schedule", label: "\uC77C\uC815/\uC8FC\uAE30", placeholder: "\uC608: \uB9E4\uC8FC \uD1A0\uC694\uC77C \uC800\uB141 8\uC2DC" },
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
