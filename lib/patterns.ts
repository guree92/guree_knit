import { supabase } from "@/lib/supabase";

export type PatternItem = {
  id: string;
  user_id: string | null;
  title: string;
  level: "초급" | "중급" | "고급";
  category: string;
  description: string;
  yarn: string;
  needle: string;
  size: string;
  tips: string[];
  image_path: string;
  like_count: number;
  created_at?: string;
  author_nickname?: string | null;
};

export function getPatternImageUrl(imagePath: string) {
  if (!imagePath) return "";

  const { data } = supabase.storage
    .from("pattern-images")
    .getPublicUrl(imagePath);

  return data.publicUrl;
}

async function attachNicknames(patterns: PatternItem[]) {
  const userIds = Array.from(
    new Set(patterns.map((p) => p.user_id).filter(Boolean))
  ) as string[];

  if (userIds.length === 0) return patterns;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("id", userIds);

  if (error) {
    console.error("닉네임 불러오기 실패", error);
    return patterns;
  }

  const nicknameMap = new Map(
    (data ?? []).map((p) => [p.id, p.nickname])
  );

  return patterns.map((pattern) => ({
    ...pattern,
    author_nickname: pattern.user_id
      ? nicknameMap.get(pattern.user_id) ?? null
      : null,
  }));
}

export async function getPatterns() {
  const { data, error } = await supabase
    .from("patterns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const patterns = (data ?? []) as PatternItem[];

  return await attachNicknames(patterns);
}

export async function getPatternById(id: string) {
  const { data, error } = await supabase
    .from("patterns")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  const pattern = data as PatternItem;

  const result = await attachNicknames([pattern]);

  return result[0];
}

export async function increasePatternLikeCount(
  id: string,
  currentLikeCount: number
) {
  const { data, error } = await supabase
    .from("patterns")
    .update({
      like_count: currentLikeCount + 1,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const pattern = data as PatternItem;

  const result = await attachNicknames([pattern]);

  return result[0];
}