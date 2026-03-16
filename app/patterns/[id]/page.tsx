"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LoginRequiredModal from "@/components/auth/LoginRequiredModal";
import Header from "@/components/layout/Header";
import {
  FavoritePatternAuthError,
  isFavoritePattern,
  toggleFavoritePattern,
} from "@/lib/favorite-patterns";
import { createClient } from "@/lib/supabase/client";
import {
  getPatternById,
  getPatternImageUrl,
  increasePatternLikeCount,
  type PatternItem,
} from "@/lib/patterns";

function parsePatternSize(sizeText: string) {
  const widthMatch = sizeText.match(/가로\s*(\d+)/);
  const heightMatch = sizeText.match(/세로\s*(\d+)/);
  const gaugeStitchesMatch = sizeText.match(/게이지\s*:\s*(\d+)코/);
  const gaugeRowsMatch = sizeText.match(/\*\s*(\d+)단/);

  return {
    sizeText:
      widthMatch || heightMatch
        ? `가로 ${widthMatch?.[1] ?? "0"}cm x 세로 ${heightMatch?.[1] ?? "0"}cm`
        : "",
    gaugeText:
      gaugeStitchesMatch || gaugeRowsMatch
        ? `${gaugeStitchesMatch?.[1] ?? "0"}코 x ${gaugeRowsMatch?.[1] ?? "0"}단`
        : "",
  };
}

export default function PatternDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);

  const [pattern, setPattern] = useState<PatternItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedId, setResolvedId] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminChecked, setIsAdminChecked] = useState(false);

  useEffect(() => {
    async function loadCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id ?? null);

      if (!user) {
        setIsAdmin(false);
        setIsAdminChecked(true);
        return;
      }

      const response = await fetch("/api/admin/status", { cache: "no-store" });

      if (!response.ok) {
        setIsAdmin(false);
        setIsAdminChecked(true);
        return;
      }

      const result = (await response.json()) as { isAdmin?: boolean };
      setIsAdmin(Boolean(result.isAdmin));
      setIsAdminChecked(true);
    }

    loadCurrentUser();
  }, [supabase]);

  useEffect(() => {
    async function load() {
      const id = params.id;

      if (!id || typeof id !== "string") {
        setLoading(false);
        return;
      }

      setResolvedId(id);
      const data = await getPatternById(id, { includeHidden: true });
      setPattern(data);
      setLoading(false);
    }

    load();
  }, [params.id]);

  useEffect(() => {
    async function loadFavoriteStatus() {
      if (!resolvedId || !currentUserId) {
        setIsFavorite(false);
        return;
      }

      try {
        setIsFavorite(await isFavoritePattern(resolvedId));
      } catch (error) {
        console.error("찜 상태를 불러오지 못했어요.", error);
        setIsFavorite(false);
      }
    }

    void loadFavoriteStatus();
  }, [currentUserId, resolvedId]);

  const isOwner = Boolean(pattern && currentUserId && pattern.user_id === currentUserId);

  async function requireUser(message: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert(message);
      router.push("/login");
      return null;
    }

    setCurrentUserId(user.id);
    return user;
  }

  async function handleDelete() {
    if (!pattern) return;

    if (!isOwner) {
      alert("내가 작성한 도안만 삭제할 수 있어요.");
      return;
    }

    const confirmed = window.confirm("이 도안을 삭제할까요? 삭제 후에는 되돌릴 수 없어요.");
    if (!confirmed) return;

    setDeleting(true);

    try {
      if (pattern.image_path) {
        const { error: storageError } = await supabase.storage
          .from("pattern-images")
          .remove([pattern.image_path]);

        if (storageError) {
          throw new Error(storageError.message);
        }
      }

      const { error: deleteError } = await supabase.from("patterns").delete().eq("id", pattern.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      alert("도안을 삭제했어요.");
      router.push("/patterns");
      router.refresh();
    } catch (error) {
      console.error("도안 삭제 실패", error);
      const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요.";
      alert(`도안 삭제에 실패했어요: ${message}`);
    } finally {
      setDeleting(false);
    }
  }

  async function handleAdminHiddenToggle(nextHidden: boolean) {
    if (!pattern || deleting) return;

    const confirmed = window.confirm(
      nextHidden ? "이 도안을 숨김 처리할까요?" : "이 도안의 숨김을 해제할까요?"
    );
    if (!confirmed) return;

    setDeleting(true);

    try {
      const response = await fetch(`/api/admin/patterns/${pattern.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: nextHidden }),
      });

      const result = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(result?.message ?? "도안 숨김 처리에 실패했어요.");
      }

      alert(nextHidden ? "도안을 숨김 처리했어요." : "도안 숨김을 해제했어요.");

      if (nextHidden) {
        router.push("/patterns");
      } else {
        setPattern((current) =>
          current
            ? {
                ...current,
                is_hidden: false,
                hidden_at: null,
              }
            : current
        );
      }

      router.refresh();
    } catch (error) {
      console.error("도안 숨김 처리 실패", error);
      const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요.";
      alert(`도안 숨김 처리에 실패했어요: ${message}`);
    } finally {
      setDeleting(false);
    }
  }

  async function handleLike() {
    if (!pattern || liking) return;

    setLiking(true);

    try {
      const updated = await increasePatternLikeCount(pattern.id, pattern.like_count ?? 0);
      setPattern(updated);
    } catch (error) {
      console.error("좋아요 실패", error);
      const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요.";
      alert(`좋아요 처리에 실패했어요: ${message}`);
    } finally {
      setLiking(false);
    }
  }

  async function handleReport() {
    if (!pattern || reporting || isOwner || isAdmin) return;

    const user = await requireUser("도안 신고는 로그인 후 이용할 수 있어요.");
    if (!user) return;

    const confirmed = window.confirm("이 도안을 신고할까요?");
    if (!confirmed) return;

    setReporting(true);

    const { error } = await supabase.from("pattern_reports").insert({
      pattern_id: pattern.id,
      reporter_user_id: user.id,
    });

    if (error) {
      console.error("도안 신고 실패", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      alert(
        error.code === "23505"
          ? "이미 신고한 도안이에요."
          : error.message || "도안 신고 접수에 실패했어요. 잠시 후 다시 시도해 주세요."
      );
      setReporting(false);
      return;
    }

    alert("도안 신고가 접수되었어요.");
    setReporting(false);
  }

  async function handleFavoriteToggle() {
    if (!pattern || favoritePending) return;

    setFavoritePending(true);

    try {
      const result = await toggleFavoritePattern(pattern.id);
      setIsFavorite(result.isFavorite);
    } catch (error) {
      if (error instanceof FavoritePatternAuthError) {
        setIsLoginModalOpen(true);
        return;
      }

      console.error("도안 찜 처리 실패", error);
      const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요.";
      alert(`도안 찜 처리에 실패했어요: ${message}`);
    } finally {
      setFavoritePending(false);
    }
  }

  if (loading || !isAdminChecked) {
    return (
      <main className="min-h-screen bg-[#fcfaf6] px-6 py-8 text-[#4b3a2f] md:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          <Header />
          <section className="mt-12 rounded-[2.25rem] border border-[#e6ddd2] bg-[#f8f4ee] p-10 text-center shadow-[0_10px_30px_rgba(91,74,60,0.06)]">
            <p className="text-[#8f7f73]">도안을 불러오는 중이에요...</p>
          </section>
        </div>
      </main>
    );
  }

  if (!pattern || (pattern.is_hidden && !isAdmin)) {
    return (
      <main className="min-h-screen bg-[#fcfaf6] px-6 py-8 text-[#4b3a2f] md:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          <Header />

          <section className="mt-12 rounded-[2.25rem] border border-dashed border-[#d9cec2] bg-[#f8f4ee] p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black text-[#4a392f]">도안을 찾을 수 없어요</h1>
            <p className="mt-3 text-[#756457]">요청하신 도안 정보를 찾지 못했어요. ({resolvedId})</p>
            <Link
              href="/patterns"
              className="mt-6 inline-flex rounded-[1.3rem] bg-[#96a792] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(150,167,146,0.28)] transition hover:bg-[#879a83]"
            >
              도안 목록으로 돌아가기
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const imageUrl = getPatternImageUrl(pattern.image_path);
  const parsedSize = parsePatternSize(pattern.size || "");

  return (
    <main className="min-h-screen bg-[#fcfaf6] px-6 py-8 text-[#4b3a2f] md:px-8 md:py-10">
      <LoginRequiredModal open={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <div className="mx-auto max-w-6xl">
        <Header />

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2.25rem] border border-[#e6ddd2] bg-[#f8f4ee] p-8 shadow-[0_10px_30px_rgba(91,74,60,0.06)]">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/patterns"
                className="inline-flex text-sm font-semibold text-[#7b9274] transition hover:text-[#5f7759]"
              >
                도안 목록으로
              </Link>

              <div className="flex flex-wrap gap-2">
                {!isOwner && !isAdmin ? (
                  <button
                    type="button"
                    onClick={handleReport}
                    disabled={reporting}
                    className="inline-flex items-center justify-center rounded-[1.15rem] border border-[#e7c9c4] bg-[#fff4f2] px-4 py-2.5 text-sm font-semibold text-[#b05b52] transition hover:bg-[#fdeae6] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {reporting ? "신고 중..." : "도안 신고"}
                  </button>
                ) : null}

                {isOwner ? (
                  <>
                    <Link
                      href={`/patterns/${pattern.id}/edit`}
                      className="inline-flex items-center justify-center rounded-[1.15rem] border border-[#d8cec2] bg-[#fffdf9] px-4 py-2.5 text-sm font-semibold text-[#6f6054] transition hover:bg-[#f3ede6]"
                    >
                      수정하기
                    </Link>

                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="inline-flex items-center justify-center rounded-[1.15rem] border border-[#e7c9c4] bg-[#fff4f2] px-4 py-2.5 text-sm font-semibold text-[#b05b52] transition hover:bg-[#fdeae6] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deleting ? "삭제 중..." : "삭제하기"}
                    </button>
                  </>
                ) : null}

                {isAdmin && !isOwner ? (
                  <button
                    type="button"
                    onClick={() => handleAdminHiddenToggle(!pattern.is_hidden)}
                    disabled={deleting}
                    className="inline-flex items-center justify-center rounded-[1.15rem] border border-[#e7c9c4] bg-[#fff4f2] px-4 py-2.5 text-sm font-semibold text-[#b05b52] transition hover:bg-[#fdeae6] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleting ? "처리 중..." : pattern.is_hidden ? "숨김 해제" : "관리자 숨김"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-[#d7ddd2] bg-[#edf3ea] px-3 py-1 font-semibold text-[#6f8669]">
                  {pattern.level}
                </span>
                <span className="rounded-full border border-[#e4d7cb] bg-[#f6eee6] px-3 py-1 font-semibold text-[#8b725d]">
                  {pattern.category}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLike}
                disabled={liking}
                className="inline-flex items-center gap-2 rounded-full border border-[#ead8d2] bg-[#fff7f5] px-4 py-2 text-sm font-semibold text-[#b05b52] transition hover:bg-[#fdeeea] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{liking ? "..." : "♥"}</span>
                <span>좋아요 {pattern.like_count ?? 0}</span>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleFavoriteToggle}
                disabled={favoritePending}
                className={
                  isFavorite
                    ? "inline-flex items-center gap-2 rounded-full border border-[#d7ddd2] bg-[#edf3ea] px-4 py-2 text-sm font-semibold text-[#5f7759] transition hover:bg-[#e5eee1]"
                    : "inline-flex items-center gap-2 rounded-full border border-[#e4d7cb] bg-[#fffdf9] px-4 py-2 text-sm font-semibold text-[#6f6054] transition hover:bg-[#f5efe8] disabled:cursor-not-allowed disabled:opacity-60"
                }
              >
                <span>{favoritePending ? "..." : isFavorite ? "★" : "☆"}</span>
                <span>
                  {favoritePending ? "저장 중..." : isFavorite ? "찜한 도안에 저장됨" : "찜하기"}
                </span>
              </button>
            </div>

            <h1 className="mt-4 text-4xl font-black leading-tight text-[#4a392f]">{pattern.title}</h1>

            <p className="mt-3 text-sm font-medium text-[#8b7b6e]">
              작성자 · {pattern.author_nickname ?? "닉네임 없음"}
            </p>

            {pattern.is_hidden && isAdmin ? (
              <p className="mt-2 text-sm text-[#b06c55]">현재 관리자에 의해 숨김 처리된 도안이에요.</p>
            ) : !currentUserId && !isOwner ? (
              <p className="mt-2 text-sm text-[#9b8b7f]">신고는 로그인 후 이용할 수 있어요.</p>
            ) : null}

            <p className="mt-4 max-w-2xl leading-7 text-[#756457]">{pattern.description}</p>

            <div className="mt-8 overflow-hidden rounded-[2rem] border border-[#e7ddd1] bg-[#fffdf9]">
              {imageUrl ? (
                <div className="relative h-72 w-full">
                  <Image
                    src={imageUrl}
                    alt={pattern.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 60vw"
                  />
                </div>
              ) : (
                <div className="h-72 bg-[linear-gradient(135deg,#f3ede4_0%,#e4ebe2_55%,#f8f4ee_100%)]" />
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[2.25rem] border border-[#e6ddd2] bg-[#f8f4ee] p-6 shadow-[0_10px_30px_rgba(91,74,60,0.06)]">
              <h2 className="text-xl font-black text-[#4a392f]">기본 정보</h2>

              <div className="mt-4 rounded-[1.6rem] border border-[#e7ddd1] bg-[#fffdf9] p-4 text-sm text-[#756457]">
                <div className="flex justify-between gap-4 border-b border-[#eee5db] pb-3">
                  <span>난이도</span>
                  <span className="font-semibold text-[#4a392f]">{pattern.level}</span>
                </div>

                <div className="flex justify-between gap-4 border-b border-[#eee5db] py-3">
                  <span>카테고리</span>
                  <span className="font-semibold text-[#4a392f]">{pattern.category}</span>
                </div>

                <div className="flex justify-between gap-4 border-b border-[#eee5db] py-3">
                  <span>작성자</span>
                  <span className="font-semibold text-[#4a392f]">{pattern.author_nickname ?? "-"}</span>
                </div>

                <div className="flex justify-between gap-4 border-b border-[#eee5db] py-3">
                  <span>사용 실</span>
                  <span className="font-semibold text-[#4a392f]">{pattern.yarn || "-"}</span>
                </div>

                <div className="flex justify-between gap-4 border-b border-[#eee5db] py-3">
                  <span>바늘</span>
                  <span className="font-semibold text-[#4a392f]">{pattern.needle || "-"}</span>
                </div>

                <div className="flex justify-between gap-4 border-b border-[#eee5db] py-3">
                  <span>좋아요</span>
                  <span className="font-semibold text-[#4a392f]">{pattern.like_count ?? 0}</span>
                </div>

                <div className="flex justify-between gap-4 border-b border-[#eee5db] py-3">
                  <span>완성 크기</span>
                  <span className="font-semibold text-[#4a392f]">{parsedSize.sizeText || "-"}</span>
                </div>

                <div className="flex justify-between gap-4 pt-3">
                  <span>게이지</span>
                  <span className="font-semibold text-[#4a392f]">{parsedSize.gaugeText || "-"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[2.25rem] border border-[#e6ddd2] bg-[#f8f4ee] p-6 shadow-[0_10px_30px_rgba(91,74,60,0.06)]">
              <h2 className="text-xl font-black text-[#4a392f]">제작 팁</h2>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#756457]">
                {pattern.tips.length > 0 ? (
                  pattern.tips.map((tip, index) => (
                    <li
                      key={`${tip}-${index}`}
                      className="rounded-[1.3rem] border border-[#e7ddd1] bg-[#fffdf9] px-4 py-3"
                    >
                      {tip}
                    </li>
                  ))
                ) : (
                  <li className="rounded-[1.3rem] border border-[#e7ddd1] bg-[#fffdf9] px-4 py-3">
                    등록된 팁이 아직 없어요.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
