"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/layout/Header";
import { getPatternImageUrl, getPatterns, type PatternItem } from "@/lib/patterns";
import styles from "./patterns-page.module.css";

const needleFilters = ["전체", "코바늘", "대바늘"] as const;
const archiveSortOptions = ["latest", "popular"] as const;
const MOBILE_ARCHIVE_PAGE_SIZE = 5;
const MID_TABLET_ARCHIVE_PAGE_SIZE = 8;
const DEFAULT_ARCHIVE_PAGE_SIZE = 10;
const TABLET_ARCHIVE_PAGE_SIZE = 9;
const DEFAULT_FEATURED_COUNT = 5;
const TABLET_FEATURED_COUNT = 3;
const MID_TABLET_FEATURED_COUNT = 4;

function formatPatternDate(value?: string) {
  if (!value) return "날짜 미정";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 미정";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function PatternsPage() {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const archivePaginationRef = useRef<HTMLDivElement | null>(null);
  const hasMountedArchivePageRef = useRef(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMidTabletViewport, setIsMidTabletViewport] = useState(false);
  const [isTabletViewport, setIsTabletViewport] = useState(false);
  const [selectedNeedleFilter, setSelectedNeedleFilter] =
    useState<(typeof needleFilters)[number]>(needleFilters[0]);
  const [archiveSort, setArchiveSort] =
    useState<(typeof archiveSortOptions)[number]>("latest");
  const [archivePage, setArchivePage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [patternItems, setPatternItems] = useState<PatternItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPatterns() {
      try {
        const data = await getPatterns();
        setPatternItems(data);
      } catch (error) {
        console.error("도안 목록을 불러오지 못했어요.", error);
        alert("도안 목록을 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    }

    loadPatterns();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mobileMediaQuery = window.matchMedia("(max-width: 720px)");
    const midTabletMediaQuery = window.matchMedia("(min-width: 721px) and (max-width: 920px)");
    const mediaQuery = window.matchMedia("(min-width: 721px) and (max-width: 1180px)");
    const syncViewport = () => {
      setIsMobileViewport(mobileMediaQuery.matches);
      setIsMidTabletViewport(midTabletMediaQuery.matches);
      setIsTabletViewport(mediaQuery.matches);
    };

    syncViewport();
    mobileMediaQuery.addEventListener("change", syncViewport);
    midTabletMediaQuery.addEventListener("change", syncViewport);
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mobileMediaQuery.removeEventListener("change", syncViewport);
      midTabletMediaQuery.removeEventListener("change", syncViewport);
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  const filteredPatterns = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase();

    return patternItems.filter((card) => {
      const matchesNeedle =
        selectedNeedleFilter === needleFilters[0] || card.needle.includes(selectedNeedleFilter);

      if (!matchesNeedle) return false;
      if (!lowerKeyword) return true;

      const targetText = [
        card.title,
        card.description,
        card.category,
        card.level,
        card.author_nickname ?? "",
        card.yarn,
      ]
        .join(" ")
        .toLowerCase();

      return targetText.includes(lowerKeyword);
    });
  }, [keyword, patternItems, selectedNeedleFilter]);

  const featuredPatterns = useMemo(
    () =>
      [...patternItems]
        .sort((a, b) => {
          const likeGap = (b.like_count ?? 0) - (a.like_count ?? 0);
          if (likeGap !== 0) return likeGap;
          return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
        })
        .slice(
          0,
          isMidTabletViewport
            ? MID_TABLET_FEATURED_COUNT
            : isTabletViewport
              ? TABLET_FEATURED_COUNT
              : DEFAULT_FEATURED_COUNT
        ),
    [isMidTabletViewport, isTabletViewport, patternItems]
  );
  const archivePatterns = useMemo(() => {
    const items = [...filteredPatterns];

    if (archiveSort === "popular") {
      return items.sort((a, b) => {
        const likeGap = (b.like_count ?? 0) - (a.like_count ?? 0);
        if (likeGap !== 0) return likeGap;
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      });
    }

    return items.sort(
      (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    );
  }, [archiveSort, filteredPatterns]);
  const archivePageSize = isMobileViewport
    ? MOBILE_ARCHIVE_PAGE_SIZE
    : isMidTabletViewport
      ? MID_TABLET_ARCHIVE_PAGE_SIZE
    : isTabletViewport
      ? TABLET_ARCHIVE_PAGE_SIZE
      : DEFAULT_ARCHIVE_PAGE_SIZE;
  const archiveTotalPages = Math.max(1, Math.ceil(archivePatterns.length / archivePageSize));
  const pagedArchivePatterns = useMemo(() => {
    const startIndex = (archivePage - 1) * archivePageSize;
    return archivePatterns.slice(startIndex, startIndex + archivePageSize);
  }, [archivePage, archivePageSize, archivePatterns]);
  const hasSearch = keyword.trim().length > 0;

  useEffect(() => {
    setArchivePage(1);
  }, [archivePageSize, archiveSort, keyword, selectedNeedleFilter]);

  useEffect(() => {
    if (archivePage > archiveTotalPages) {
      setArchivePage(archiveTotalPages);
    }
  }, [archivePage, archiveTotalPages]);

  useEffect(() => {
    if (!hasMountedArchivePageRef.current) {
      hasMountedArchivePageRef.current = true;
      return;
    }

    archivePaginationRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [archivePage]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Header />

        <section className={styles.workspace}>
          <div className={styles.mainColumn}>
            <section className={styles.hero}>
              <div className={styles.heroTop}>
                <div className={styles.heroBadge}>Pattern Archive</div>
                <Link href="/patterns/new" className={styles.primaryAction}>
                  도안 등록
                </Link>
              </div>

              <div className={styles.heroIntro}>
                <div>
                  <h1 className={styles.heroTitle}>도안 마루</h1>
                </div>
              </div>
            </section>

            <section className={styles.mobileSearchPanel}>
              <div className={styles.sideSearchPanel}>
                <div className={styles.sideSearchBox}>
                  <input
                    id="pattern-search-mobile"
                    type="text"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="SEARCH"
                    className={styles.sideSearchInput}
                  />
                  {hasSearch ? (
                    <button type="button" onClick={() => setKeyword("")} className={styles.sideSearchClear}>
                      지우기
                    </button>
                  ) : (
                    <span className={styles.sideSearchIcon}>⌕</span>
                  )}
                </div>
              </div>
            </section>

            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.sectionEyebrow}>Featured</p>
                  <h2 className={styles.sectionTitle}>인기 도안</h2>
                </div>
                <span className={styles.sectionMeta}>전체 도안 기준</span>
              </div>

              {loading ? (
                <div className={styles.feedbackCard}>
                  <p className={styles.feedbackTitle}>도안을 불러오는 중이에요.</p>
                  <p className={styles.feedbackDescription}>추천 도안을 정리하고 있어요.</p>
                </div>
              ) : featuredPatterns.length > 0 ? (
                <div className={styles.popularShowcaseList}>
                  {featuredPatterns.map((card, index) => {
                    const imageUrl = getPatternImageUrl(card.image_path);

                    return (
                      <Link
                        key={card.id}
                        href={`/patterns/${card.id}`}
                        className={styles.popularShowcaseCard}
                      >
                        <div className={styles.popularShowcaseThumb}>
                          <span className={styles.popularShowcaseRank}>{index + 1}</span>
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={card.title}
                              fill
                              className={styles.popularShowcaseImage}
                              sizes="(max-width: 920px) 50vw, (max-width: 1200px) 25vw, 18vw"
                            />
                          ) : (
                            <div className={styles.popularShowcaseFallback} />
                          )}
                        </div>

                        <div className={styles.popularShowcaseBody}>
                          <strong>{card.title}</strong>
                          <p>
                            {card.category ?? "기타"} · {card.level ?? "난이도 미정"} · @
                            {card.author_nickname ?? "닉네임 없음"}
                          </p>
                          <span>♥ {card.like_count ?? 0}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.feedbackCard}>
                  <p className={styles.feedbackTitle}>보여줄 추천 도안이 아직 없어요.</p>
                  <p className={styles.feedbackDescription}>검색 조건을 바꾸거나 새 도안을 등록해 보세요.</p>
                </div>
              )}
            </section>

            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.sectionEyebrow}>Archive</p>
                  <h2 className={styles.sectionTitle}>도안 목록</h2>
                </div>
                <div className={styles.archiveSortGroup}>
                  <button
                    type="button"
                    onClick={() => setArchiveSort("latest")}
                    className={archiveSort === "latest" ? styles.archiveSortButtonActive : styles.archiveSortButton}
                  >
                    최신순
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchiveSort("popular")}
                    className={archiveSort === "popular" ? styles.archiveSortButtonActive : styles.archiveSortButton}
                  >
                    인기순
                  </button>
                </div>
              </div>

              <div className={styles.archiveToolbar}>
                <div className={styles.categoryList}>
                  {needleFilters.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSelectedNeedleFilter(item)}
                      className={selectedNeedleFilter === item ? styles.categoryChipActive : styles.categoryChip}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className={styles.feedbackCard}>
                  <p className={styles.feedbackTitle}>목록을 준비하고 있어요.</p>
                  <p className={styles.feedbackDescription}>도안 정보와 메타 데이터를 정리하는 중이에요.</p>
                </div>
              ) : archivePatterns.length > 0 ? (
                <div className={styles.popularShowcaseList}>
                  {pagedArchivePatterns.map((card, index) => {
                    const imageUrl = getPatternImageUrl(card.image_path);
                    const absoluteIndex = (archivePage - 1) * archivePageSize + index;

                    return (
                      <Link key={card.id} href={`/patterns/${card.id}`} className={styles.popularShowcaseCard}>
                        <div className={styles.popularShowcaseThumb}>
                          {archiveSort === "popular" ? (
                            <span className={styles.popularShowcaseRankMuted}>{`#${absoluteIndex + 1}`}</span>
                          ) : null}
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={card.title}
                              fill
                              className={styles.popularShowcaseImage}
                              sizes="(max-width: 920px) 50vw, (max-width: 1200px) 25vw, 18vw"
                            />
                          ) : (
                            <div className={styles.popularShowcaseFallback} />
                          )}
                        </div>

                        <div className={styles.popularShowcaseBody}>
                          <strong>{card.title}</strong>
                          <p>
                            {card.category ?? "기타"} · {card.level ?? "난이도 미정"} · @
                            {card.author_nickname ?? "닉네임 없음"}
                          </p>
                          <div className={styles.archiveCardMetaRow}>
                            <span>♥ {card.like_count ?? 0}</span>
                          </div>
                          <span className={styles.archiveCardDate}>
                            {formatPatternDate(card.created_at)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.feedbackCard}>
                  <p className={styles.feedbackTitle}>검색 결과가 없어요.</p>
                  <p className={styles.feedbackDescription}>
                    다른 검색어를 입력하거나 바늘 종류를 바꿔서 다시 찾아보세요.
                  </p>
                  <div className={styles.emptyActions}>
                    {hasSearch ? (
                      <button type="button" onClick={() => setKeyword("")} className={styles.secondaryAction}>
                        검색어 지우기
                      </button>
                    ) : null}
                    {selectedNeedleFilter !== needleFilters[0] ? (
                      <button
                        type="button"
                        onClick={() => setSelectedNeedleFilter(needleFilters[0])}
                        className={styles.secondaryAction}
                      >
                        전체 도안 보기
                      </button>
                    ) : null}
                  </div>
                </div>
              )}

              {archivePatterns.length > archivePageSize ? (
                <div ref={archivePaginationRef} className={styles.archivePagination}>
                  <button
                    type="button"
                    onClick={() => setArchivePage((current) => Math.max(1, current - 1))}
                    disabled={archivePage === 1}
                    className={styles.archivePageButton}
                  >
                    이전
                  </button>

                  <div className={styles.archivePageList}>
                    {Array.from({ length: archiveTotalPages }, (_, index) => index + 1).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setArchivePage(pageNumber)}
                        className={
                          pageNumber === archivePage
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
                    onClick={() => setArchivePage((current) => Math.min(archiveTotalPages, current + 1))}
                    disabled={archivePage === archiveTotalPages}
                    className={styles.archivePageButton}
                  >
                    다음
                  </button>
                </div>
              ) : null}
            </section>

          </div>

          <aside className={styles.sideColumn}>
            <section className={`${styles.sidePanel} ${styles.desktopSearchPanel}`}>
              <div className={styles.sideSearchPanel}>
                <div className={styles.sideSearchBox}>
                  <input
                    ref={searchInputRef}
                    id="pattern-search"
                    type="text"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="SEARCH"
                    className={styles.sideSearchInput}
                  />
                  {hasSearch ? (
                    <button type="button" onClick={() => setKeyword("")} className={styles.sideSearchClear}>
                      지우기
                    </button>
                  ) : (
                    <span className={styles.sideSearchIcon}>⌕</span>
                  )}
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
