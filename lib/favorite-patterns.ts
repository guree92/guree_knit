"use client";

import { createClient } from "@/lib/supabase/client";

export const FAVORITE_PATTERNS_CHANGED_EVENT = "favorite-patterns-changed";

export type FavoritePatternCard = {
  id: string;
  title: string;
  category: string | null;
  level: string | null;
  like_count: number | null;
  image_path: string | null;
};

export class FavoritePatternAuthError extends Error {
  constructor(message = "로그인이 필요해요.") {
    super(message);
    this.name = "FavoritePatternAuthError";
  }
}

type FavoriteRow = {
  pattern_id: string;
  created_at: string | null;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
};

function emitFavoritePatternsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FAVORITE_PATTERNS_CHANGED_EVENT));
}

export function isFavoritePatternsTableMissingError(error: unknown) {
  const candidate = error as SupabaseLikeError | null;
  const message = candidate?.message ?? "";

  return candidate?.code === "PGRST205" || message.includes("pattern_favorites");
}

export async function getFavoritePatternIds() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) return [] as string[];

  const { data, error } = await supabase
    .from("pattern_favorites")
    .select("pattern_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (isFavoritePatternsTableMissingError(error)) {
      return [] as string[];
    }

    throw new Error(error.message);
  }

  return ((data ?? []) as FavoriteRow[]).map((row) => row.pattern_id);
}

export async function getFavoritePatterns() {
  const supabase = createClient();
  const favoriteIds = await getFavoritePatternIds();

  if (favoriteIds.length === 0) {
    return [] as FavoritePatternCard[];
  }

  const { data, error } = await supabase
    .from("patterns")
    .select("id, title, category, level, like_count, image_path")
    .in("id", favoriteIds)
    .eq("is_hidden", false);

  if (error) {
    if (isFavoritePatternsTableMissingError(error)) {
      return [] as FavoritePatternCard[];
    }

    throw new Error(error.message);
  }

  const order = new Map(favoriteIds.map((id, index) => [id, index]));
  const rows = ((data ?? []) as FavoritePatternCard[]).sort(
    (left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0)
  );

  return rows;
}

export async function isFavoritePattern(patternId: string) {
  if (!patternId) return false;

  const favoriteIds = await getFavoritePatternIds();
  return favoriteIds.includes(patternId);
}

export async function toggleFavoritePattern(patternId: string) {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new FavoritePatternAuthError("도안 찜하기는 로그인 후 이용할 수 있어요.");
  }

  const { data: existingFavorite, error: selectError } = await supabase
    .from("pattern_favorites")
    .select("pattern_id")
    .eq("user_id", user.id)
    .eq("pattern_id", patternId)
    .maybeSingle();

  if (selectError) {
    if (isFavoritePatternsTableMissingError(selectError)) {
      throw new Error("찜 기능을 쓰려면 Supabase에 pattern_favorites 테이블을 먼저 만들어야 해요.");
    }

    throw new Error(selectError.message);
  }

  if (existingFavorite) {
    const { error: deleteError } = await supabase
      .from("pattern_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("pattern_id", patternId);

    if (deleteError) {
      if (isFavoritePatternsTableMissingError(deleteError)) {
        throw new Error("찜 기능을 쓰려면 Supabase에 pattern_favorites 테이블을 먼저 만들어야 해요.");
      }

      throw new Error(deleteError.message);
    }

    emitFavoritePatternsChanged();

    return {
      isFavorite: false,
    };
  }

  const { error: insertError } = await supabase.from("pattern_favorites").insert({
    user_id: user.id,
    pattern_id: patternId,
  });

  if (insertError) {
    if (isFavoritePatternsTableMissingError(insertError)) {
      throw new Error("찜 기능을 쓰려면 Supabase에 pattern_favorites 테이블을 먼저 만들어야 해요.");
    }

    throw new Error(insertError.message);
  }

  emitFavoritePatternsChanged();

  return {
    isFavorite: true,
  };
}
