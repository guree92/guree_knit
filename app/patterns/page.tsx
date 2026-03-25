"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import LoginRequiredModal from "@/components/auth/LoginRequiredModal";
import Header from "@/components/layout/Header";
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

const needleFilters = ["\uC804\uCCB4", "\uCF54\uBC14\uB298", "\uB300\uBC14\uB298"] as const;
type ArchiveSort = "latest" | "popular";
const ARCHIVE_PAGE_SIZE = 8;
const FEATURED_COUNT = 5;

export default function PatternsPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const archivePaginationRef = useRef<HTMLDivElement | null>(null);
  const hasMountedArchivePageRef = useRef(false);
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
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    async function loadPatterns() {
      try {
        const data = await getPatterns();
        setPatternItems(data);
      } catch (error) {
        console.error("\uB3C4\uC548 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694.", error);
        alert("\uB3C4\uC548 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694.");
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
        console.error("\uCC1C\uD55C \uB3C4\uC548\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694.", error);
        setFavoriteIds([]);
      }
    }

    async function loadFavoritePatterns() {
      try {
        setFavoritePatterns(await getFavoritePatterns());
      } catch (error) {
        console.error("\uCC1C\uD55C \uB3C4\uC548 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694.", error);
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
        .slice(0, FEATURED_COUNT),
    [patternItems]
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

  const archivePageSize = ARCHIVE_PAGE_SIZE;
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

      console.error("\uB3C4\uC548 \uCC1C \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC5B4\uC694.", error);
      const message =
        error instanceof Error ? error.message : "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC5B4\uC694.";
      alert(`\uB3C4\uC548 \uCC1C \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC5B4\uC694. ${message}`);
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
        {favoritePendingId === patternId
          ? "\uC800\uC7A5 \uC911..."
          : favoriteIds.includes(patternId)
            ? "\uCC1C\uB428"
            : "\uCC1C\uD558\uAE30"}
      </button>
    );
  }

  function renderFavoritePanel() {
    return (
      <section className={`${styles.sidePanel} ${styles.desktopFavoritePanel}`}>
        <div className={styles.sideFavoriteHeader}>
          <div className={styles.sideFavoriteHeading}>
            <h2 className={styles.sideFavoriteTitle}>{"\uCC1C\uD55C \uB3C4\uC548"}</h2>
            <p className={styles.sideFavoriteDescription}>
              {isAuthenticated
                ? "\uC800\uC7A5\uD574\uB454 \uB3C4\uC548\uC744 \uD655\uC778\uD558\uC138\uC694"
                : "\uB85C\uADF8\uC778\uD558\uBA74 \uC88B\uC544\uD558\uB294 \uB3C4\uC548\uC744 \uB530\uB85C \uBAA8\uC544\uB458 \uC218 \uC788\uC5B4\uC694."}
            </p>
          </div>

          <div className={styles.sideFavoriteActions}>
            {isAuthenticated ? (
              <Link href="/patterns/favorites" className={styles.sideFavoriteLink}>
                {"\uC804\uCCB4 \uBCF4\uAE30"}
              </Link>
            ) : null}
          </div>
        </div>

        {favoritePatterns.length > 0 ? (
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
                    <p>{`${pattern.category ?? "\uAE30\uD0C0"} \u00B7 ${pattern.level ?? "\uB09C\uC774\uB3C4 \uBBF8\uC815"}`}</p>
                  </div>

                  <span className={styles.sideFavoriteLikes}>{"\u2665"} {pattern.like_count ?? 0}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className={styles.sideFavoriteEmpty}>
            <p>
              {isAuthenticated
                ? "\uC544\uC9C1 \uCC1C\uD55C \uB3C4\uC548\uC774 \uC5C6\uC5B4\uC694."
                : "\uB85C\uADF8\uC778\uD558\uACE0 \uB3C4\uC548\uC744 \uCC1C\uD574\uBCF4\uC138\uC694."}
            </p>
            {isAuthenticated ? (
              <span>
                {"\uBAA9\uB85D\uC774\uB098 \uC0C1\uC138 \uD398\uC774\uC9C0\uC5D0\uC11C \uCC1C\uD558\uAE30\uB97C \uB204\uB974\uBA74 \uC5EC\uAE30\uC5D0 \uBAA8\uC544\uBCFC \uC218 \uC788\uC5B4\uC694."}
              </span>
            ) : null}
          </div>
        )}
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
                <div className={styles.heroIntro}>
                  <h1 className={styles.heroTitle}>{"\uB3C4\uC548\uB9C8\uB8E8"}</h1>
                  <p className={styles.heroDescription}>
                    {"\uC9C1\uC811 \uB9CC\uB4E0 \uB3C4\uC548\uC744 \uACF5\uC720\uD558\uACE0 \uB9C8\uC74C\uC5D0 \uB4DC\uB294 \uB3C4\uC548\uC744 \uC800\uC7A5\uD574\uBCF4\uC138\uC694"}
                  </p>
                </div>
                <div className={`${styles.heroActions} ${styles.heroActionsInline}`}>
                  <Link href="/patterns/favorites" className={styles.secondaryLinkAction}>
                    {"\uCC1C\uD55C \uB3C4\uC548"}
                  </Link>
                  <Link href="/patterns/new" className={styles.primaryAction}>
                    {"\uB3C4\uC548 \uB4F1\uB85D"}
                  </Link>
                </div>
              </div>
            </section>

            <section className={`${styles.sectionBlock} ${styles.archiveSection}`}>
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
                        placeholder="여기에서 도안을 검색하세요"
                        className={styles.sideSearchInput}
                      />
                      {hasSearch ? (
                        <button
                          type="button"
                          onClick={() => setKeyword("")}
                          className={styles.sideSearchClear}
                        >
                          {"\uC9C0\uC6B0\uAE30"}
                        </button>
                      ) : (
                        <span className={styles.sideSearchIcon}>{"\uAC80\uC0C9"}</span>
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
                      {"\uCD5C\uC2E0"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setArchiveSort("popular")}
                      className={archiveSort === "popular" ? styles.archiveSortButtonActive : styles.archiveSortButton}
                    >
                      {"\uC778\uAE30"}
                    </button>
                  </div>
                </div>

                <div className={styles.archiveMeta}>
                  <span>{"\uCD1D "}{archivePatterns.length.toLocaleString()}{"\uAC1C\uC758 \uACB0\uACFC"}</span>
                  <span>{"\uD604\uC7AC \uC815\uB82C: "}{archiveSort === "latest" ? "\uCD5C\uC2E0\uC21C" : "\uC778\uAE30\uC21C"}</span>
                </div>
              </div>

              <div className={styles.featuredSection}>
                <div className={styles.sectionHeading}>
                  <div className={styles.sectionHeadingCopy}>
                    <h2 className={styles.sectionTitle}>{"\uCD94\uCC9C \uB3C4\uC548"}</h2>
                  </div>
                  <div className={styles.featuredAside} />
                </div>

                {loading ? (
                  <div className={styles.feedbackCard}>
                    <p className={styles.feedbackTitle}>{"\uCD94\uCC9C \uB3C4\uC548\uC744 \uC900\uBE44\uD558\uACE0 \uC788\uC5B4\uC694."}</p>
                    <p className={styles.feedbackDescription}>
                      {"\uC9C0\uAE08 \uC8FC\uBAA9\uBC1B\uB294 \uC791\uD488\uC744 \uC815\uB9AC\uD558\uB294 \uC911\uC774\uC5D0\uC694."}
                    </p>
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
                                <span className={styles.popularMetaTags}>
                                  <span className={styles.popularMetaTag}>{card.category ?? "\uAE30\uD0C0"}</span>
                                  <span className={styles.popularMetaTag}>{card.level ?? "\uB09C\uC774\uB3C4 \uBBF8\uC815"}</span>
                                </span>
                                <span className={styles.popularLikeCount}>{"\u2665"} {card.like_count ?? 0}</span>
                              </p>
                            </div>
                          </Link>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.feedbackCard}>
                    <p className={styles.feedbackTitle}>{"\uBCF4\uC5EC\uC904 \uCD94\uCC9C \uB3C4\uC548\uC774 \uC544\uC9C1 \uC5C6\uC5B4\uC694."}</p>
                    <p className={styles.feedbackDescription}>
                      {"\uC0C8 \uB3C4\uC548\uC774 \uC62C\uB77C\uC624\uBA74 \uC774\uACF3\uC5D0\uC11C \uAC00\uC7A5 \uBA3C\uC800 \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694."}
                    </p>
                  </div>
                )}
              </div>

              {loading ? (
                <div className={styles.feedbackCard}>
                  <p className={styles.feedbackTitle}>{"\uBAA9\uB85D\uC744 \uC900\uBE44\uD558\uACE0 \uC788\uC5B4\uC694."}</p>
                  <p className={styles.feedbackDescription}>
                    {"\uB3C4\uC548 \uC815\uBCF4\uC640 \uBA54\uD0C0 \uB370\uC774\uD130\uB97C \uC815\uB9AC\uD558\uB294 \uC911\uC774\uC5D0\uC694."}
                  </p>
                </div>
              ) : archivePatterns.length > 0 ? (
                <div className={styles.archiveGrid}>
                  {pagedArchivePatterns.map((card) => {
                    const imageUrl = getPatternImageUrl(card.image_path);

                    return (
                      <article key={card.id} className={styles.archiveCard}>
                        <Link href={`/patterns/${card.id}`} className={styles.archiveCardLink}>
                          <div className={styles.archiveThumb}>
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
                            <p className={styles.featuredMeta}>
                              <span className={styles.popularMetaTags}>
                                <span className={styles.popularMetaTag}>{card.category ?? "\uAE30\uD0C0"}</span>
                                <span className={styles.popularMetaTag}>{card.level ?? "\uB09C\uC774\uB3C4 \uBBF8\uC815"}</span>
                              </span>
                              <span className={styles.popularLikeCount}>{"\u2665"} {card.like_count ?? 0}</span>
                            </p>
                          </div>
                        </Link>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.feedbackCard}>
                  <p className={styles.feedbackTitle}>{"\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC5B4\uC694."}</p>
                  <p className={styles.feedbackDescription}>
                    {"\uB2E4\uB978 \uAC80\uC0C9\uC5B4\uB97C \uC785\uB825\uD558\uAC70\uB098 \uBC14\uB298 \uC885\uB958\uB97C \uBC14\uAFD4\uC11C \uB2E4\uC2DC \uCC3E\uC544\uBCF4\uC138\uC694."}
                  </p>
                  <div className={styles.emptyActions}>
                    {hasSearch ? (
                      <button type="button" onClick={() => setKeyword("")} className={styles.secondaryAction}>
                        {"\uAC80\uC0C9\uC5B4 \uC9C0\uC6B0\uAE30"}
                      </button>
                    ) : null}
                    {selectedNeedleFilter !== needleFilters[0] ? (
                      <button
                        type="button"
                        onClick={() => setSelectedNeedleFilter(needleFilters[0])}
                        className={styles.secondaryAction}
                      >
                        {"\uC804\uCCB4 \uBCF4\uAE30"}
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
                    {"\uC774\uC804"}
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
                    {"\uB2E4\uC74C"}
                  </button>
                </div>
              ) : null}
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.sidePanel}>
              <div className={styles.sideFavoriteHeader}>
                <div className={styles.sideFavoriteHeading}>
                  <h2 className={styles.sideFavoriteTitle}>{"\uD0D0\uC0C9 \uD604\uD669"}</h2>
                  <p className={styles.sideFavoriteDescription}>
                    {"\uC9C0\uAE08 \uC801\uC6A9 \uC911\uC778 \uC870\uAC74\uC744 \uD55C\uB208\uC5D0 \uBCF4\uACE0 \uD0D0\uC0C9 \uBC29\uD5A5\uC744 \uC870\uC815\uD574 \uBCF4\uC138\uC694."}
                  </p>
                </div>
              </div>

              <div className={styles.sideInfoGrid}>
                <div className={styles.sideInfoItem}>
                  <span className={styles.sideInfoLabel}>{"\uAC80\uC0C9\uC5B4"}</span>
                  <strong className={styles.sideInfoValue}>{hasSearch ? keyword : "\uC804\uCCB4"}</strong>
                </div>
                <div className={styles.sideInfoItem}>
                  <span className={styles.sideInfoLabel}>{"\uBC14\uB298"}</span>
                  <strong className={styles.sideInfoValue}>{selectedNeedleFilter}</strong>
                </div>
                <div className={styles.sideInfoItem}>
                  <span className={styles.sideInfoLabel}>{"\uC815\uB82C"}</span>
                  <strong className={styles.sideInfoValue}>{archiveSort === "latest" ? "\uCD5C\uC2E0\uC21C" : "\uC778\uAE30\uC21C"}</strong>
                </div>
                <div className={styles.sideInfoItem}>
                  <span className={styles.sideInfoLabel}>{"\uACB0\uACFC \uC218"}</span>
                  <strong className={styles.sideInfoValue}>{archivePatterns.length.toLocaleString()}{"\uAC1C"}</strong>
                </div>
              </div>
            </section>

            {renderFavoritePanel()}
          </aside>
        </section>
      </div>
    </main>
  );
}



