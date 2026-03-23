import { createClient } from "@/lib/supabase/client";
import type { DetailRow } from "@/lib/pattern-detail";

export type PatternItem = {
  id: string;
  user_id: string | null;
  title: string;
  level: "珥덇툒" | "以묎툒" | "怨좉툒";
  category: string;
  description: string;
  detail_content?: string | null;
  detail_rows?: DetailRow[] | null;
  tags?: string[];
  duration?: string | null;
  total_yarn_amount?: string | null;
  yarn: string;
  needle: string;
  size: string;
  copyright_source?: "蹂몄씤" | "臾대즺諛고룷" | null;
  copyright_source_url?: string | null;
  copyright_hobby_only?: boolean | null;
  copyright_color_variation?: boolean | null;
  copyright_size_variation?: boolean | null;
  copyright_commercial_use?: boolean | null;
  copyright_redistribution?: boolean | null;
  copyright_modification_resale?: boolean | null;
  image_path: string;
  like_count: number;
  created_at?: string;
  author_nickname?: string | null;
  is_hidden?: boolean | null;
  hidden_at?: string | null;
};

type PatternQueryOptions = {
  includeHidden?: boolean;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
};

export class PatternLikeAuthError extends Error {
  constructor(message = "醫뗭븘?붾? ?꾨Ⅴ?ㅻ㈃ 濡쒓렇?몄씠 ?꾩슂?댁슂.") {
    super(message);
    this.name = "PatternLikeAuthError";
  }
}

function isMissingAuthSessionError(error: unknown) {
  const candidate = error as SupabaseLikeError | null;
  const message = candidate?.message ?? "";

  return message.includes("Auth session missing");
}

export function getPatternImageUrl(imagePath: string) {
  if (!imagePath) return "";

  const supabase = createClient();
  const { data } = supabase.storage.from("pattern-images").getPublicUrl(imagePath);

  return data.publicUrl;
}

async function attachNicknames(patterns: PatternItem[]): Promise<PatternItem[]> {
  const supabase = createClient();

  const userIds = Array.from(new Set(patterns.map((p) => p.user_id).filter(Boolean))) as string[];

  if (userIds.length === 0) return patterns;

  const { data, error } = await supabase.from("profiles").select("id, nickname").in("id", userIds);

  if (error) {
    console.error("?됰꽕?꾩쓣 遺덈윭?ㅼ? 紐삵뻽?댁슂.", error);
    return patterns;
  }

  const nicknameMap = new Map((data ?? []).map((profile) => [profile.id, profile.nickname]));

  return patterns.map((pattern) => ({
    ...pattern,
    author_nickname: pattern.user_id ? nicknameMap.get(pattern.user_id) ?? null : null,
  }));
}

export async function getPatterns(options: PatternQueryOptions = {}): Promise<PatternItem[]> {
  const supabase = createClient();
  let query = supabase.from("patterns").select("*");

  if (!options.includeHidden) {
    query = query.eq("is_hidden", false);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return attachNicknames((data ?? []) as PatternItem[]);
}

export async function getPatternById(
  id: string,
  options: PatternQueryOptions = {}
): Promise<PatternItem | null> {
  const supabase = createClient();
  let query = supabase.from("patterns").select("*").eq("id", id);

  if (!options.includeHidden) {
    query = query.eq("is_hidden", false);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return null;
  }

  const [pattern] = await attachNicknames([data as PatternItem]);
  return pattern;
}

export async function isPatternLiked(patternId: string) {
  if (!patternId) return false;

  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    if (isMissingAuthSessionError(userError)) {
      return false;
    }

    throw new Error(userError.message);
  }

  if (!user) return false;

  const { data, error } = await supabase
    .from("pattern_likes")
    .select("pattern_id")
    .eq("pattern_id", patternId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function togglePatternLike(patternId: string) {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    if (isMissingAuthSessionError(userError)) {
      throw new PatternLikeAuthError();
    }

    throw new Error(userError.message);
  }

  if (!user) {
    throw new PatternLikeAuthError();
  }

  const { data: existingLike, error: selectError } = await supabase
    .from("pattern_likes")
    .select("pattern_id")
    .eq("pattern_id", patternId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  const nextLiked = !existingLike;

  const { error: mutationError } = nextLiked
    ? await supabase.from("pattern_likes").insert({
        pattern_id: patternId,
        user_id: user.id,
      })
    : await supabase
        .from("pattern_likes")
        .delete()
        .eq("pattern_id", patternId)
        .eq("user_id", user.id);

  if (mutationError) {
    throw new Error(mutationError.message);
  }

  const { count, error: countError } = await supabase
    .from("pattern_likes")
    .select("*", { count: "exact", head: true })
    .eq("pattern_id", patternId);

  if (countError) {
    throw new Error(countError.message);
  }

  const nextLikeCount = count ?? 0;

  const { data, error } = await supabase
    .from("patterns")
    .update({
      like_count: nextLikeCount,
    })
    .eq("id", patternId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const [pattern] = await attachNicknames([data as PatternItem]);
  return {
    isLiked: nextLiked,
    pattern,
  };
}

