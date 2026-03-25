"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import LoginRequiredModal from "@/components/auth/LoginRequiredModal";
import { subscribeToMediaQuery } from "@/lib/media-query";
import { FavoritePatternAuthError, toggleFavoritePattern } from "@/lib/favorite-patterns";
import { getPatternImageUrl, type PatternItem } from "@/lib/patterns";
import styles from "./favorites-page.module.css";

const DEFAULT_FAVORITES_PAGE_SIZE = 10;
const MID_DESKTOP_FAVORITES_PAGE_SIZE = 9;
const needleFilters = ["전체", "코바늘", "대바늘"] as const;

type FavoritePatternListItem = PatternItem & {
  saved_at: string | null;
};

type FavoritePatternsClientProps = {
  initialItems: FavoritePatternListItem[];
  initialPage: number;
};

export default function FavoritePatternsClient({ initialItems, initialPage }: FavoritePatternsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState(initialItems);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pendingId, setPendingId] = useState("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [pageSize, setPageSize] = useState(DEFAULT_FAVORITES_PAGE_SIZE);

  const keyword = searchParams.get("q") ?? "";
  const needleParam = searchParams.get("needle");
  const selectedNeedleFilter = needleFilters.includes(needleParam as (typeof needleFilters)[number])
    ? (needleParam as (typeof needleFilters)[number])
    : needleFilters[0];
  const pageFromUrl = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const activePageFromUrl = Number.isFinite(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : 1;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 921px) and (max-width: 1180px)");
    const syncPageSize = () => {
      setPageSize(mediaQuery.matches ? MID_DESKTOP_FAVORITES_PAGE_SIZE : DEFAULT_FAVORITES_PAGE_SIZE);
    };

    syncPageSize();
    return subscribeToMediaQuery(mediaQuery, syncPageSize);
  }, []);

  useEffect(() => {
    setCurrentPage(activePageFromUrl);
  }, [activePageFromUrl]);

  function applyFiltersAndSort(source: FavoritePatternListItem[]) {
    const lowerKeyword = keyword.trim().toLowerCase();

    const filtered = source.filter((item) => {
      const matchesNeedle =
        selectedNeedleFilter === needleFilters[0] || (item.needle ?? "").includes(selectedNeedleFilter);
      if (!matchesNeedle) return false;

      if (!lowerKeyword) return true;

      const targetText = [
        item.title,
        item.description,
        item.category,
        item.level,
        item.author_nickname ?? "",
        item.yarn,
      ]
        .join(" ")
        .toLowerCase();

      return targetText.includes(lowerKeyword);
    });

    return filtered.sort(
      (a, b) => new Date(b.saved_at ?? 0).getTime() - new Date(a.saved_at ?? 0).getTime()
    );
  }

  const filteredAndSortedItems = useMemo(() => applyFiltersAndSort([...items]), [items, keyword, selectedNeedleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / pageSize));
  const normalizedPage = Math.min(currentPage, totalPages);
  const pagedItems = useMemo(() => {
    const startIndex = (normalizedPage - 1) * pageSize;
    return filteredAndSortedItems.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedItems, normalizedPage, pageSize]);

  function buildFavoritesUrl(pageNumber: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (pageNumber <= 1) params.delete("page");
    else params.set("page", String(pageNumber));
    const query = params.toString();
    return query ? `/patterns/favorites?${query}` : "/patterns/favorites";
  }

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
      startTransition(() => {
        router.replace(buildFavoritesUrl(totalPages), { scroll: false });
      });
    }
  }, [currentPage, totalPages, router, searchParams]);

  function moveToPage(pageNumber: number) {
    const nextPage = Math.min(Math.max(1, pageNumber), totalPages);
    setCurrentPage(nextPage);
    startTransition(() => {
      router.replace(buildFavoritesUrl(nextPage), { scroll: false });
    });
  }

  async function handleFavoriteToggle(patternId: string) {
    if (!patternId || pendingId) return;
    setPendingId(patternId);

    try {
      const result = await toggleFavoritePattern(patternId);

      if (!result.isFavorite) {
        const nextItems = items.filter((item) => item.id !== patternId);
        const nextLength = applyFiltersAndSort([...nextItems]).length;
        const nextTotalPages = Math.max(1, Math.ceil(nextLength / pageSize));
        const nextPage = Math.min(normalizedPage, nextTotalPages);

        setItems(nextItems);
        setCurrentPage(nextPage);

        startTransition(() => {
          router.replace(buildFavoritesUrl(nextPage), { scroll: false });
          router.refresh();
        });
      }
    } catch (error) {
      if (error instanceof FavoritePatternAuthError) {
        setIsLoginModalOpen(true);
        return;
      }

      console.error("도안 찜 처리에 실패했어요.", error);
      const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요.";
      alert(`도안 찜 처리에 실패했어요: ${message}`);
    } finally {
      setPendingId("");
    }
  }

  if (items.length === 0) {
    return (
      <>
        <LoginRequiredModal open={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        <div className={styles.feedbackCard}>
          <p className={styles.feedbackTitle}>아직 찜한 도안이 없어요.</p>
          <div className={styles.feedbackActions}>
            <Link href="/patterns" className={styles.primaryAction}>
              도안 둘러보기
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (filteredAndSortedItems.length === 0) {
    return (
      <>
        <LoginRequiredModal open={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        <div className={styles.feedbackCard}>
          <p className={styles.feedbackTitle}>검색 결과가 없어요.</p>
          <p className={styles.feedbackDescription}>다른 검색어를 입력하거나 필터를 바꿔 다시 찾아보세요.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <LoginRequiredModal open={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <div className={styles.popularShowcaseList}>
        {pagedItems.map((pattern) => {
          const imageUrl = pattern.image_path ? getPatternImageUrl(pattern.image_path) : "";

          return (
            <article key={pattern.id} className={styles.popularShowcaseCard}>
              <Link href={`/patterns/${pattern.id}`} className={styles.patternCardLink}>
                <div className={styles.popularShowcaseThumb}>
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={pattern.title}
                      fill
                      className={styles.popularShowcaseImage}
                      sizes="(max-width: 920px) 50vw, (max-width: 1200px) 25vw, 18vw"
                    />
                  ) : (
                    <div className={styles.popularShowcaseFallback} />
                  )}
                </div>

                <div className={styles.popularShowcaseBody}>
                  <strong>{pattern.title}</strong>
                  <div className={styles.favoriteTagRow}>
                    <span className={styles.favoriteTag}>{pattern.category ?? "기타"}</span>
                    <span className={styles.favoriteTag}>{pattern.level ?? "난이도 미정"}</span>
                  </div>
                  <div className={styles.favoriteCardFooter}>
                    <span className={styles.favoriteLikeCount}>{`\u2665 ${pattern.like_count ?? 0}`}</span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        void handleFavoriteToggle(pattern.id);
                      }}
                      disabled={pendingId === pattern.id}
                      className={styles.favoriteBadgeButton}
                    >
                      {pendingId === pattern.id ? "처리 중..." : "찜"}
                    </button>
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>

      {filteredAndSortedItems.length > pageSize ? (
        <div className={styles.archivePagination}>
          <button
            type="button"
            onClick={() => moveToPage(normalizedPage - 1)}
            disabled={normalizedPage === 1}
            className={styles.archivePageButton}
          >
            이전
          </button>

          <div className={styles.archivePageList}>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => moveToPage(pageNumber)}
                className={pageNumber === normalizedPage ? styles.archivePageNumberActive : styles.archivePageNumber}
              >
                {pageNumber}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => moveToPage(normalizedPage + 1)}
            disabled={normalizedPage === totalPages}
            className={styles.archivePageButton}
          >
            다음
          </button>
        </div>
      ) : null}
    </>
  );
}
