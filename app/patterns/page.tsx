"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import LoginRequiredModal from "@/components/auth/LoginRequiredModal";
import Header from "@/components/layout/Header";
import { subscribeToMediaQuery } from "@/lib/media-query";
import {
  FavoritePatternAuthError,
  FAVORITE_PATTERNS_CHANGED_EVENT,
  getFavoritePatternIds,
  getFavoritePatterns,
  toggleFavoritePattern,
  type FavoritePatternCard,
} from "@/lib/favorite-patterns";
import { getPatternImageUrl, getPatterns, type PatternItem } from "@/lib/patterns";
import { createClient } from "@/lib/supabase/client";
import styles from "./patterns-page.module.css";
import heroHeaderImage from "../../Image/headerlogo.png";

const needleFilters = ["전체", "코바늘", "대바늘"] as const;
type ArchiveSort = "latest" | "popular";
const MOBILE_ARCHIVE_PAGE_SIZE = 4;
const MID_TABLET_ARCHIVE_PAGE_SIZE = 6;
const NARROW_DESKTOP_ARCHIVE_PAGE_SIZE = 6;
const MID_DESKTOP_ARCHIVE_PAGE_SIZE = 8;
const DEFAULT_ARCHIVE_PAGE_SIZE = 8;
const TABLET_ARCHIVE_PAGE_SIZE = 6;
const DEFAULT_FEATURED_COUNT = 4;
const NARROW_DESKTOP_FEATURED_COUNT = 3;
const MID_DESKTOP_FEATURED_COUNT = 4;
const TABLET_FEATURED_COUNT = 3;
const MID_TABLET_FEATURED_COUNT = 3;

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

function getPatternSummary(pattern: PatternItem) {
  const source = pattern.description?.trim() || pattern.yarn?.trim() || "도안 설명을 준비 중이에요.";
  return source.length > 78 ? `${source.slice(0, 78).trim()}...` : source;
}

export default function PatternsPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const archivePaginationRef = useRef<HTMLDivElement | null>(null);
  const hasMountedArchivePageRef = useRef(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMidTabletViewport, setIsMidTabletViewport] = useState(false);
  const [isNarrowDesktopViewport, setIsNarrowDesktopViewport] = useState(false);
  const [isMidDesktopViewport, setIsMidDesktopViewport] = useState(false);
  const [isTabletViewport, setIsTabletViewport] = useState(false);
  const [selectedNeedleFilter, setSelectedNeedleFilter] =
    useState<(typeof needleFilters)[number]>(needleFilters[0]);
  const [archiveSort, setArchiveSort] = useState<ArchiveSort>("latest");
  const [archivePage, setArchivePage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [patternItems, setPatternItems] = useState<PatternItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoritePatterns, setFavoritePatterns] = useState<FavoritePatternCard[]>([]);
  const [favoritePendingId, setFavoritePendingId] = useState("");
  const [isMobileFavoritesOpen, setIsMobileFavoritesOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const isCompactViewport = isMobileViewport || isMidTabletViewport;
  const isFavoriteMetaStackedViewport = isTabletViewport && !isMidTabletViewport;

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

    void loadPatterns();
  }, []);

  useEffect(() => {
    async function loadFavoriteIds() {
      try {
        setFavoriteIds(await getFavoritePatternIds());
      } catch (error) {
        console.error("찜한 도안을 불러오지 못했어요.", error);
        setFavoriteIds([]);
      }
    }

    async function loadFavoritePatterns() {
      try {
        setFavoritePatterns(await getFavoritePatterns());
      } catch (error) {
        console.error("찜한 도안 패널을 불러오지 못했어요.", error);
        setFavoritePatterns([]);
      }
    }

    async function loadAuthState() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(Boolean(user));
    }

    void loadFavoriteIds();
    void loadFavoritePatterns();
    void loadAuthState();

    const handleFavoritesChanged = () => {
      void loadFavoriteIds();
      void loadFavoritePatterns();
      void loadAuthState();
    };

    window.addEventListener(FAVORITE_PATTERNS_CHANGED_EVENT, handleFavoritesChanged);

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void loadFavoriteIds();
      void loadFavoritePatterns();
      void loadAuthState();
    });

    return () => {
      window.removeEventListener(FAVORITE_PATTERNS_CHANGED_EVENT, handleFavoritesChanged);
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mobileMediaQuery = window.matchMedia("(max-width: 720px)");
    const midTabletMediaQuery = window.matchMedia("(min-width: 721px) and (max-width: 920px)");
    const narrowDesktopMediaQuery = window.matchMedia("(min-width: 1181px) and (max-width: 1450px)");
    const midDesktopMediaQuery = window.matchMedia("(min-width: 1451px) and (max-width: 1720px)");
    const mediaQuery = window.matchMedia("(min-width: 721px) and (max-width: 1180px)");

    const syncViewport = () => {
      setIsMobileViewport(mobileMediaQuery.matches);
      setIsMidTabletViewport(midTabletMediaQuery.matches);
      setIsNarrowDesktopViewport(narrowDesktopMediaQuery.matches);
      setIsMidDesktopViewport(midDesktopMediaQuery.matches);
      setIsTabletViewport(mediaQuery.matches);
    };

    syncViewport();

    const unsubscribers = [
      subscribeToMediaQuery(mobileMediaQuery, syncViewport),
      subscribeToMediaQuery(midTabletMediaQuery, syncViewport),
      subscribeToMediaQuery(narrowDesktopMediaQuery, syncViewport),
      subscribeToMediaQuery(midDesktopMediaQuery, syncViewport),
      subscribeToMediaQuery(mediaQuery, syncViewport),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
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
            : isNarrowDesktopViewport
              ? NARROW_DESKTOP_FEATURED_COUNT
              : isMidDesktopViewport
                ? MID_DESKTOP_FEATURED_COUNT
                : isTabletViewport
                  ? TABLET_FEATURED_COUNT
                  : DEFAULT_FEATURED_COUNT
        ),
    [
      isMidTabletViewport,
      isNarrowDesktopViewport,
      isMidDesktopViewport,
      isTabletViewport,
      patternItems,
    ]
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
      : isNarrowDesktopViewport
        ? NARROW_DESKTOP_ARCHIVE_PAGE_SIZE
        : isMidDesktopViewport
          ? MID_DESKTOP_ARCHIVE_PAGE_SIZE
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

  async function handleFavoriteToggle(patternId: string) {
    if (!patternId || favoritePendingId) return;

    setFavoritePendingId(patternId);

    try {
      const result = await toggleFavoritePattern(patternId);
      setFavoriteIds((current) =>
        result.isFavorite
          ? [patternId, ...current.filter((id) => id !== patternId)]
          : current.filter((id) => id !== patternId)
      );
    } catch (error) {
      if (error instanceof FavoritePatternAuthError) {
        setIsLoginModalOpen(true);
        return;
      }

      console.error("도안 찜 처리에 실패했어요.", error);
      const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요.";
      alert(`도안 찜 처리에 실패했어요: ${message}`);
    } finally {
      setFavoritePendingId("");
    }
  }

  function renderFavoriteButton(patternId: string) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          void handleFavoriteToggle(patternId);
        }}
        disabled={favoritePendingId === patternId}
        className={favoriteIds.includes(patternId) ? styles.favoriteButtonActive : styles.favoriteButton}
      >
        {favoritePendingId === patternId ? "저장 중..." : favoriteIds.includes(patternId) ? "찜됨" : "찜하기"}
      </button>
    );
  }

  function renderFavoritePanel(mobile = false) {
    const shouldShowContent = !mobile || isMobileFavoritesOpen;
    const panelClassName = mobile
      ? `${styles.sidePanel} ${styles.mobileFavoritePanel}`
      : `${styles.sidePanel} ${styles.desktopFavoritePanel}`;

    return (
      <section className={panelClassName}>
        <div className={styles.sideFavoriteHeader}>
          <div className={styles.sideFavoriteHeading}>
            <h2 className={styles.sideFavoriteTitle}>찜한 도안</h2>
            <p className={styles.sideFavoriteDescription}>
              {isAuthenticated
                ? "저장해둔 도안을 빠르게 다시 열어보세요."
                : "로그인하면 좋아하는 도안을 따로 모아둘 수 있어요."}
            </p>
          </div>

          <div className={styles.sideFavoriteActions}>
            {isAuthenticated ? (
              <Link href="/patterns/favorites" className={styles.sideFavoriteLink}>
                전체 보기
              </Link>
            ) : null}
            {mobile ? (
              <button
                type="button"
                onClick={() => setIsMobileFavoritesOpen((current) => !current)}
                className={styles.mobileToggleButton}
                aria-expanded={shouldShowContent}
              >
                {shouldShowContent ? "접기" : "펼치기"}
              </button>
            ) : null}
          </div>
        </div>

        {shouldShowContent ? (
          favoritePatterns.length > 0 ? (
            <div className={styles.sideFavoriteList}>
              {favoritePatterns.slice(0, 4).map((pattern) => {
                const imageUrl = pattern.image_path ? getPatternImageUrl(pattern.image_path) : "";

                return (
                  <Link key={pattern.id} href={`/patterns/${pattern.id}`} className={styles.sideFavoriteItem}>
                    <div className={styles.sideFavoriteThumb}>
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={pattern.title}
                          fill
                          className={styles.sideFavoriteImage}
                          sizes="72px"
                        />
                      ) : (
                        <div className={styles.sideFavoriteFallback} />
                      )}
                    </div>

                    <div className={styles.sideFavoriteBody}>
                      <strong>{pattern.title}</strong>
                      <p>
                        {isFavoriteMetaStackedViewport ? (
                          <>
                            <span>{pattern.category ?? "기타"}</span>
                            <span>{pattern.level ?? "난이도 미정"}</span>
                          </>
                        ) : (
                          `${pattern.category ?? "기타"} · ${pattern.level ?? "난이도 미정"}`
                        )}
                      </p>
                    </div>

                    <span className={styles.sideFavoriteLikes}>♥ {pattern.like_count ?? 0}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className={styles.sideFavoriteEmpty}>
              <p>{isAuthenticated ? "아직 찜한 도안이 없어요." : "로그인 후 도안을 찜해보세요."}</p>
              {isAuthenticated ? <span>목록이나 상세 페이지에서 찜하기를 누르면 이곳에 모아볼 수 있어요.</span> : null}
            </div>
          )
        ) : null}
      </section>
    );
  }

  return (
    <main className={styles.page}>
      <LoginRequiredModal open={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <div className={styles.shell}>
        <Header />

        <section className={styles.heroPanel}>
          <div className={styles.heroCopy}>
            <div className={styles.heroTitleImage}>
              <Image
                src={heroHeaderImage}
                alt="Hero header"
                priority
                unoptimized
                className={styles.heroTitleImageAsset}
              />
            </div>
          </div>
        </section>

        <section className={styles.workspace}>
          <div className={styles.mainColumn}>
            <section className={styles.hero}>
              <div className={styles.heroTop}>
                <div className={styles.heroLead}>
                  <div className={styles.heroBadge}>패턴 아카이브</div>
                  <div className={styles.heroMetaList}>
                    <span className={styles.heroMetaChip}>웹</span>
                    <span className={styles.heroMetaChip}>패턴</span>
                    <span className={styles.heroMetaChip}>저장 서치</span>
                  </div>
                </div>
                <div className={styles.heroActions}>
                  <Link href="/patterns/favorites" className={styles.secondaryLinkAction}>
                    찜한 도안
                  </Link>
                  <Link href="/patterns/new" className={styles.primaryAction}>
                    도안 등록
                  </Link>
                </div>
              </div>

              <div className={styles.heroIntro}>
                <div>
                  <h1 className={styles.heroTitle}>패턴</h1>
                  <p className={styles.heroDescription}>
                    커뮤니티에 올라온 뜨개 도안들을 둘러보고 저장한 뒤, 다음 프로젝트를 바로 시작해 보세요.
                  </p>
                </div>
              </div>
            </section>

            {isCompactViewport ? renderFavoritePanel(true) : null}

            <section className={`${styles.sectionBlock} ${styles.featuredSection}`}>
              <div className={styles.sectionHeading}>
                <div className={styles.sectionHeadingCopy}>
                  <h2 className={styles.sectionTitle}>추천 패턴</h2>
                  <p className={styles.sectionDescription}>
                    최근 반응이 좋은 작품과 새로 올라온 도안을 함께 살펴볼 수 있어요.
                  </p>
                </div>
                <div className={styles.featuredAside}>
                  <span className={styles.featuredAsideLabel}>크리에이터의 특별한 도안을 먼저 만나보세요</span>
                </div>
              </div>

              {loading ? (
                <div className={styles.feedbackCard}>
                  <p className={styles.feedbackTitle}>추천 도안을 준비하고 있어요.</p>
                  <p className={styles.feedbackDescription}>지금 주목받는 작품을 정리하는 중이에요.</p>
                </div>
              ) : featuredPatterns.length > 0 ? (
                <div className={styles.featuredGrid}>
                  {featuredPatterns.map((card) => {
                    const imageUrl = getPatternImageUrl(card.image_path);

                    return (
                      <article key={card.id} className={styles.featuredCard}>
                        <Link href={`/patterns/${card.id}`} className={styles.featuredCardLink}>
                          <div className={styles.featuredThumb}>
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={card.title}
                                fill
                                className={styles.featuredImage}
                                sizes="(max-width: 720px) 100vw, (max-width: 1180px) 33vw, 24vw"
                              />
                            ) : (
                              <div className={styles.featuredFallback} />
                            )}
                          </div>

                          <div className={styles.featuredBody}>
                            <strong>{card.title}</strong>
                            <p className={styles.featuredMeta}>
                              {card.category ?? "기타"} · {card.level ?? "난이도 미정"} · @{card.author_nickname ?? "닉네임 없음"}
                            </p>
                            <div className={styles.featuredFooter}>
                              <span className={styles.likeStat}>♥ {card.like_count ?? 0}</span>
                              {renderFavoriteButton(card.id)}
                            </div>
                          </div>
                        </Link>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.feedbackCard}>
                  <p className={styles.feedbackTitle}>보여줄 추천 도안이 아직 없어요.</p>
                  <p className={styles.feedbackDescription}>새 도안이 올라오면 이곳에서 가장 먼저 확인할 수 있어요.</p>
                </div>
              )}
            </section>

            <section className={`${styles.sectionBlock} ${styles.archiveSection}`}>
              <div className={styles.sectionHeading}>
                <div className={styles.sectionHeadingCopy}>
                  <h2 className={styles.sectionTitle}>패턴 목록</h2>
                  <p className={styles.sectionDescription}>
                    검색어와 필터를 조합해 원하는 프로젝트에 맞는 도안을 골라보세요.
                  </p>
                </div>
              </div>

              <div className={styles.archiveControls}>
                <div className={styles.archiveSearchWrap}>
                  <div className={styles.sideSearchPanel}>
                    <div className={styles.sideSearchBox}>
                      <input
                        ref={searchInputRef}
                        id="pattern-search"
                        type="text"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        placeholder="Search patterns, designers, stitches..."
                        className={styles.sideSearchInput}
                      />
                      {hasSearch ? (
                        <button
                          type="button"
                          onClick={() => setKeyword("")}
                          className={styles.sideSearchClear}
                        >
                          지우기
                        </button>
                      ) : (
                        <span className={styles.sideSearchIcon}>⌕</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.archiveControlRow}>
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

                  <div className={styles.archiveSortGroup}>
                    <button
                      type="button"
                      onClick={() => setArchiveSort("latest")}
                      className={archiveSort === "latest" ? styles.archiveSortButtonActive : styles.archiveSortButton}
                    >
                      최신
                    </button>
                    <button
                      type="button"
                      onClick={() => setArchiveSort("popular")}
                      className={archiveSort === "popular" ? styles.archiveSortButtonActive : styles.archiveSortButton}
                    >
                      인기
                    </button>
                  </div>
                </div>

                <div className={styles.archiveMeta}>
                  <span>총 {archivePatterns.length.toLocaleString()}개의 결과</span>
                  <span>현재 정렬: {archiveSort === "latest" ? "최신순" : "인기순"}</span>
                </div>
              </div>

              {loading ? (
                <div className={styles.feedbackCard}>
                  <p className={styles.feedbackTitle}>목록을 준비하고 있어요.</p>
                  <p className={styles.feedbackDescription}>도안 정보와 메타 데이터를 정리하는 중이에요.</p>
                </div>
              ) : archivePatterns.length > 0 ? (
                <div className={styles.archiveGrid}>
                  {pagedArchivePatterns.map((card, index) => {
                    const imageUrl = getPatternImageUrl(card.image_path);
                    const absoluteIndex = (archivePage - 1) * archivePageSize + index;

                    return (
                      <article key={card.id} className={styles.archiveCard}>
                        <Link href={`/patterns/${card.id}`} className={styles.archiveCardLink}>
                          <div className={styles.archiveThumb}>
                            {archiveSort === "popular" ? (
                              <span className={styles.archiveRank}>{`#${absoluteIndex + 1}`}</span>
                            ) : null}
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={card.title}
                                fill
                                className={styles.archiveImage}
                                sizes="(max-width: 720px) 100vw, (max-width: 1180px) 50vw, 25vw"
                              />
                            ) : (
                              <div className={styles.archiveFallback} />
                            )}
                          </div>

                          <div className={styles.archiveBody}>
                            <strong>{card.title}</strong>
                            <p className={styles.archiveDescription}>{getPatternSummary(card)}</p>

                            <div className={styles.archiveBadgeRow}>
                              <span className={styles.metaPill}>{card.category ?? "기타"}</span>
                              <span className={styles.metaPill}>{card.level ?? "난이도 미정"}</span>
                              <span className={styles.metaPill}>{card.needle || "도구 미정"}</span>
                            </div>

                            <div className={styles.archiveCardFooter}>
                              <div className={styles.archiveCardMeta}>
                                <span className={styles.archiveAuthor}>@{card.author_nickname ?? "닉네임 없음"}</span>
                                <span className={styles.archiveCardDate}>{formatPatternDate(card.created_at)}</span>
                              </div>
                              <div className={styles.archiveCardActions}>
                                <span className={styles.likeStat}>♥ {card.like_count ?? 0}</span>
                                {renderFavoriteButton(card.id)}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </article>
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
                        전체 보기
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
                          pageNumber === archivePage ? styles.archivePageNumberActive : styles.archivePageNumber
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
            <section className={styles.sidePanel}>
              <div className={styles.sideFavoriteHeader}>
                <div className={styles.sideFavoriteHeading}>
                  <h2 className={styles.sideFavoriteTitle}>탐색 현황</h2>
                  <p className={styles.sideFavoriteDescription}>
                    지금 적용 중인 조건을 한눈에 보고 탐색 방향을 조정해 보세요.
                  </p>
                </div>
              </div>

              <div className={styles.sideInfoGrid}>
                <div className={styles.sideInfoItem}>
                  <span className={styles.sideInfoLabel}>검색어</span>
                  <strong className={styles.sideInfoValue}>{hasSearch ? keyword : "전체"}</strong>
                </div>
                <div className={styles.sideInfoItem}>
                  <span className={styles.sideInfoLabel}>바늘</span>
                  <strong className={styles.sideInfoValue}>{selectedNeedleFilter}</strong>
                </div>
                <div className={styles.sideInfoItem}>
                  <span className={styles.sideInfoLabel}>정렬</span>
                  <strong className={styles.sideInfoValue}>{archiveSort === "latest" ? "최신순" : "인기순"}</strong>
                </div>
                <div className={styles.sideInfoItem}>
                  <span className={styles.sideInfoLabel}>결과 수</span>
                  <strong className={styles.sideInfoValue}>{archivePatterns.length.toLocaleString()}개</strong>
                </div>
              </div>
            </section>

            {!isCompactViewport ? renderFavoritePanel() : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
