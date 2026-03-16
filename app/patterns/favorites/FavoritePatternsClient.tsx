"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import LoginRequiredModal from "@/components/auth/LoginRequiredModal";
import {
  FavoritePatternAuthError,
  toggleFavoritePattern,
} from "@/lib/favorite-patterns";
import { getPatternImageUrl, type PatternItem } from "@/lib/patterns";
import styles from "./favorites-page.module.css";

const DEFAULT_FAVORITES_PAGE_SIZE = 10;
const MID_DESKTOP_FAVORITES_PAGE_SIZE = 9;

type FavoritePatternListItem = PatternItem & {
  saved_at: string | null;
};

type FavoritePatternsClientProps = {
  initialItems: FavoritePatternListItem[];
  initialPage: number;
};

function formatPatternDate(value?: string | null) {
  if (!value) return "\ub0a0\uc9dc \ubbf8\uc815";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "\ub0a0\uc9dc \ubbf8\uc815";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function FavoritePatternsClient({
  initialItems,
  initialPage,
}: FavoritePatternsClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pendingId, setPendingId] = useState("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [pageSize, setPageSize] = useState(DEFAULT_FAVORITES_PAGE_SIZE);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 921px) and (max-width: 1180px)");
    const syncPageSize = () => {
      setPageSize(
        mediaQuery.matches ? MID_DESKTOP_FAVORITES_PAGE_SIZE : DEFAULT_FAVORITES_PAGE_SIZE
      );
    };

    syncPageSize();
    mediaQuery.addEventListener("change", syncPageSize);

    return () => {
      mediaQuery.removeEventListener("change", syncPageSize);
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const normalizedPage = Math.min(currentPage, totalPages);
  const pagedItems = useMemo(() => {
    const startIndex = (normalizedPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, normalizedPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);

      startTransition(() => {
        router.replace(totalPages === 1 ? "/patterns/favorites" : `/patterns/favorites?page=${totalPages}`);
      });
    }
  }, [currentPage, router, totalPages]);

  function moveToPage(pageNumber: number) {
    const nextPage = Math.min(Math.max(1, pageNumber), totalPages);
    setCurrentPage(nextPage);

    startTransition(() => {
      router.replace(nextPage === 1 ? "/patterns/favorites" : `/patterns/favorites?page=${nextPage}`);
    });
  }

  async function handleFavoriteToggle(patternId: string) {
    if (!patternId || pendingId) return;

    setPendingId(patternId);

    try {
      const result = await toggleFavoritePattern(patternId);

      if (!result.isFavorite) {
        const nextItems = items.filter((item) => item.id !== patternId);
        const nextTotalPages = Math.max(1, Math.ceil(nextItems.length / pageSize));
        const nextPage = Math.min(normalizedPage, nextTotalPages);

        setItems(nextItems);
        setCurrentPage(nextPage);

        startTransition(() => {
          router.replace(nextPage === 1 ? "/patterns/favorites" : `/patterns/favorites?page=${nextPage}`);
          router.refresh();
        });
      }
    } catch (error) {
      if (error instanceof FavoritePatternAuthError) {
        setIsLoginModalOpen(true);
        return;
      }

      console.error("\ub3c4\uc548 \ucc1c \ucc98\ub9ac\uc5d0 \uc2e4\ud328\ud588\uc5b4\uc694.", error);
      const message =
        error instanceof Error ? error.message : "\uc54c \uc218 \uc5c6\ub294 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc5b4\uc694.";
      alert(`\ub3c4\uc548 \ucc1c \ucc98\ub9ac\uc5d0 \uc2e4\ud328\ud588\uc5b4\uc694: ${message}`);
    } finally {
      setPendingId("");
    }
  }

  if (items.length === 0) {
    return (
      <>
        <LoginRequiredModal open={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        <div className={styles.feedbackCard}>
          <p className={styles.feedbackTitle}>{"\uc544\uc9c1 \ucc1c\ud55c \ub3c4\uc548\uc774 \uc5c6\uc5b4\uc694."}</p>
          <div className={styles.feedbackActions}>
            <Link href="/patterns" className={styles.primaryAction}>
              {"\ub3c4\uc548 \ub458\ub7ec\ubcf4\uae30"}
            </Link>
          </div>
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
                  <div className={styles.patternCardMetaBlock}>
                    <p>
                      {pattern.category ?? "\uae30\ud0c0"} · {pattern.level ?? "\ub09c\uc774\ub3c4 \ubbf8\uc815"} · @
                      {pattern.author_nickname ?? "\ub2c9\ub124\uc784 \uc5c6\uc74c"}
                    </p>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        void handleFavoriteToggle(pattern.id);
                      }}
                      disabled={pendingId === pattern.id}
                      className={styles.favoriteBadgeButton}
                    >
                      {pendingId === pattern.id ? "\ucc98\ub9ac \uc911..." : "\ucc1c"}
                    </button>
                  </div>
                  <div className={styles.archiveCardMetaRow}>
                    <span>{`\u2665 ${pattern.like_count ?? 0}`}</span>
                  </div>
                  <span className={styles.archiveCardDate}>{formatPatternDate(pattern.saved_at)}</span>
                </div>
              </Link>
            </article>
          );
        })}
      </div>

      {items.length > pageSize ? (
        <div className={styles.archivePagination}>
          <button
            type="button"
            onClick={() => moveToPage(normalizedPage - 1)}
            disabled={normalizedPage === 1}
            className={styles.archivePageButton}
          >
            {"\uc774\uc804"}
          </button>

          <div className={styles.archivePageList}>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => moveToPage(pageNumber)}
                className={
                  pageNumber === normalizedPage
                    ? styles.archivePageNumberActive
                    : styles.archivePageNumber
                }
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
            {"\ub2e4\uc74c"}
          </button>
        </div>
      ) : null}
    </>
  );
}
