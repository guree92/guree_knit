"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import Header from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/client";
import {
  communityCategories,
  formatCommunityDate,
  mapCommunityPost,
  type CommunityPost,
  type CommunityPostRow,
} from "@/lib/community";
import styles from "./community-page.module.css";

type SortOption = "latest" | "popular";

const POSTS_PER_PAGE = 6;

function getFallbackToneClass(category: CommunityPost["category"]) {
  switch (category) {
    case "질문":
      return styles.boardFallbackQuestion;
    case "정보공유":
      return styles.boardFallbackInfo;
    case "같이뜨기":
      return styles.boardFallbackTogether;
    case "완성작":
    default:
      return styles.boardFallbackShowcase;
  }
}

function getCategoryToneClass(category: (typeof communityCategories)[number]) {
  switch (category) {
    case "완성작":
      return styles.categoryToneShowcase;
    case "질문":
      return styles.categoryToneQuestion;
    case "정보공유":
      return styles.categoryToneInfo;
    case "같이뜨기":
      return styles.categoryToneTogether;
    default:
      return "";
  }
}

function getCategoryPillToneClass(category: CommunityPost["category"]) {
  switch (category) {
    case "완성작":
      return styles.categoryPillShowcase;
    case "질문":
      return styles.categoryPillQuestion;
    case "정보공유":
      return styles.categoryPillInfo;
    case "같이뜨기":
      return styles.categoryPillTogether;
    default:
      return "";
  }
}

export default function CommunityPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const paginationRef = useRef<HTMLElement | null>(null);
  const writeHref = "/login?returnTo=%2Fcommunity%2Fwrite";

  const [selectedCategory, setSelectedCategory] =
    useState<(typeof communityCategories)[number]>(communityCategories[0]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [searchText, setSearchText] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("latest");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function fetchPosts() {
      setIsLoading(true);

      const postsResponse = await supabase
        .from("community_posts")
        .select(`*, community_likes(count)`)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false });

      if (postsResponse.error) {
        console.error(postsResponse.error);
        alert("뜨개마당 글을 불러오지 못했어요.");
        setIsLoading(false);
        return;
      }

      const rows = (postsResponse.data ?? []) as CommunityPostRow[];
      setPosts(rows.map(mapCommunityPost));
      setIsLoading(false);
    }

    fetchPosts();
  }, [supabase]);

  useEffect(() => {
    async function loadAuthState() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setIsLoggedIn(Boolean(session?.user));
    }

    void loadAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const filteredPosts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    const searched = posts.filter((post) => {
      const extraFields = post.extraFields ?? {};
      const matchesCategory =
        selectedCategory === communityCategories[0] || post.category === selectedCategory;

      if (!matchesCategory) return false;
      if (!keyword) return true;

      const targetText = [
        post.title,
        post.content,
        post.author,
        ...post.tags,
        ...Object.values(extraFields),
      ]
        .join(" ")
        .toLowerCase();
      return targetText.includes(keyword);
    });

    return [...searched].sort((a, b) => {
      if (sortOption === "popular") {
        return b.likes - a.likes;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [posts, searchText, selectedCategory, sortOption]);

  const hasSearch = searchText.trim().length > 0;
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const todayPostCount = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return posts.filter((post) => {
      const createdAt = new Date(post.createdAt);
      return !Number.isNaN(createdAt.getTime()) && createdAt >= startOfToday;
    }).length;
  }, [posts]);
  const paginatedPosts = filteredPosts.slice(
    (safeCurrentPage - 1) * POSTS_PER_PAGE,
    safeCurrentPage * POSTS_PER_PAGE
  );
  const categorySummaries = communityCategories
    .filter((item) => item !== communityCategories[0])
    .map((item) => ({
      name: item,
      count: posts.filter((post) => post.category === item).length,
    }));
  const highlightedPosts = [...posts]
    .sort((a, b) => {
      const likeGap = b.likes - a.likes;
      if (likeGap !== 0) return likeGap;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 3);

  function moveToPage(nextPage: number) {
    const normalizedPage = Math.min(Math.max(nextPage, 1), totalPages);

    if (normalizedPage === safeCurrentPage) return;

    setCurrentPage(normalizedPage);

    requestAnimationFrame(() => {
      const node = paginationRef.current;
      if (!node) return;

      const { bottom } = node.getBoundingClientRect();
      const targetY = Math.max(0, window.scrollY + bottom - window.innerHeight + 24);

      window.scrollTo({ top: targetY, behavior: "smooth" });
    });
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Header />
        <div className={styles.workspace}>
          <div className={styles.mainColumn}>
            <section className={styles.hero}>
              <div className={styles.heroTop}>
                <div className={styles.heroBadge}>Community Lounge</div>
                <div className={styles.heroActions}>
                  <Link
                    href={isLoggedIn ? "/community/write" : writeHref}
                    className={styles.primaryAction}
                  >
                    글 쓰기
                  </Link>
                </div>
              </div>

              <div className={styles.heroIntro}>
                <div>
                  <h1 className={styles.heroTitle}>뜨개마당</h1>
                </div>
              </div>

            </section>

            <section className={styles.filterPanel}>
              <div className={styles.searchRow}>
                <label htmlFor="community-search" className={styles.searchLabel}>
                  게시글 검색
                </label>
                <div className={styles.searchBox}>
                  <input
                    id="community-search"
                    type="text"
                    value={searchText}
                    onChange={(event) => {
                      setSearchText(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="제목, 내용, 작성자, 태그로 검색해 보세요"
                    className={styles.searchInput}
                  />

                  {hasSearch ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchText("");
                        setCurrentPage(1);
                      }}
                      className={styles.secondaryAction}
                    >
                      지우기
                    </button>
                  ) : null}
                </div>
              </div>

              <div className={styles.toolbar}>
                <div className={styles.categoryList}>
                  {communityCategories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(item);
                        setCurrentPage(1);
                      }}
                      className={
                        [
                          selectedCategory === item ? styles.categoryChipActive : styles.categoryChip,
                          getCategoryToneClass(item),
                        ].join(" ").trim()
                      }
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <div className={styles.sortBox}>
                  <label htmlFor="community-sort" className={styles.sortLabel}>
                    정렬
                  </label>
                  <select
                    id="community-sort"
                    value={sortOption}
                    onChange={(event) => {
                      setSortOption(event.target.value as SortOption);
                      setCurrentPage(1);
                    }}
                    className={styles.sortSelect}
                  >
                    <option value="latest">최신순</option>
                    <option value="popular">인기순</option>
                  </select>
                </div>
              </div>

              {selectedCategory !== communityCategories[0] ? (
                <div className={styles.resultBar}>
                  <span className={styles.resultChip}>{selectedCategory}</span>
                </div>
              ) : null}
            </section>

            <section className={styles.listSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>지금 뜨개마당에서 나누는 이야기</h2>
              </div>

              {isLoading ? (
                <div className={styles.feedbackCard}>
                  <p className={styles.feedbackTitle}>글을 불러오는 중이에요.</p>
                  <p className={styles.feedbackDescription}>
                    최신 글과 인기 글을 정리하고 있어요.
                  </p>
                </div>
              ) : filteredPosts.length > 0 ? (
                <>
                  <div className={styles.boardList}>
                    <div className={styles.boardHeader} aria-hidden="true">
                      <span>미리보기</span>
                      <span>게시글</span>
                      <span>정보</span>
                    </div>
                    {paginatedPosts.map((post) => {
                      const extraFields = post.extraFields ?? {};
                      const hasExtraFields = Object.values(extraFields).some((value) => value.trim());

                      return (
                        <article key={post.id} className={styles.boardRow}>
                          <Link href={`/community/${post.id}`} className={styles.boardLink}>
                            <div className={styles.boardThumbCell}>
                              {post.imageUrl ? (
                                <div className={styles.boardMedia}>
                                  <Image
                                    src={post.imageUrl}
                                    alt={`${post.title} 첨부 이미지`}
                                    fill
                                    sizes="120px"
                                    className={styles.cardImage}
                                  />
                                </div>
                              ) : (
                                <div
                                  className={`${styles.boardFallback} ${getFallbackToneClass(post.category)}`}
                                >
                                  <span className={styles.boardFallbackLabel}>{post.category}</span>
                                </div>
                              )}
                            </div>

                            <div className={styles.boardMain}>
                              <div className={styles.boardTitleRow}>
                                <span
                                  className={`${styles.categoryPill} ${getCategoryPillToneClass(post.category)}`}
                                >
                                  {post.category}
                                </span>
                                <h2 className={styles.cardTitle}>{post.title}</h2>
                              </div>

                              <p className={styles.cardPreview}>{post.preview}</p>

                              {hasExtraFields ? (
                                <div className={styles.extraFieldList}>
                                  {Object.entries(extraFields).map(([key, value]) =>
                                    value.trim() ? (
                                      <span key={`${post.id}-${key}`} className={styles.extraFieldChip}>
                                        {value}
                                      </span>
                                    ) : null
                                  )}
                                </div>
                              ) : null}

                              {post.tags.length > 0 ? (
                                <div className={styles.tagList}>
                                  {post.tags.map((tag) => (
                                    <span key={`${post.id}-${tag}`} className={styles.tag}>
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>

                            <div className={styles.boardMeta}>
                              <div className={styles.boardMetaTop}>
                                <span>{formatCommunityDate(post.createdAt)}</span>
                                <span>@{post.author}</span>
                              </div>
                              <span className={styles.likesPill}>♥ {post.likes}</span>
                              <span className={styles.readMore}>자세히 보기</span>
                            </div>
                          </Link>

                        </article>
                      );
                    })}
                  </div>

                  {totalPages > 1 ? (
                    <nav
                      ref={paginationRef}
                      className={styles.pagination}
                      aria-label="뜨개마당 페이지 이동"
                    >
                      <button
                        type="button"
                        onClick={() => moveToPage(safeCurrentPage - 1)}
                        disabled={safeCurrentPage === 1}
                        className={styles.pageNavButton}
                      >
                        이전
                      </button>

                      <div className={styles.pageNumberList}>
                        {Array.from({ length: totalPages }, (_, index) => {
                          const page = index + 1;

                          return (
                            <button
                              key={page}
                              type="button"
                              onClick={() => moveToPage(page)}
                              aria-current={safeCurrentPage === page ? "page" : undefined}
                              className={
                                safeCurrentPage === page
                                  ? styles.pageNumberActive
                                  : styles.pageNumber
                              }
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => moveToPage(safeCurrentPage + 1)}
                        disabled={safeCurrentPage === totalPages}
                        className={styles.pageNavButton}
                      >
                        다음
                      </button>
                    </nav>
                  ) : null}
                </>
              ) : (
                <div className={styles.feedbackCard}>
                  <p className={styles.feedbackTitle}>검색 결과가 없어요.</p>
                  <p className={styles.feedbackDescription}>
                    다른 검색어를 입력하거나 카테고리와 정렬 조건을 바꿔보세요.
                  </p>

                  {(hasSearch || selectedCategory !== communityCategories[0]) && (
                    <div className={styles.emptyActions}>
                      {hasSearch ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchText("");
                            setCurrentPage(1);
                          }}
                          className={styles.secondaryAction}
                        >
                          검색어 지우기
                        </button>
                      ) : null}
                      {selectedCategory !== communityCategories[0] ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory(communityCategories[0]);
                            setCurrentPage(1);
                          }}
                          className={styles.secondaryAction}
                        >
                          전체 카테고리 보기
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.sidePanel}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>한눈에 보기</h2>
              </div>

              <div className={styles.sideStatsGrid}>
                <article className={styles.statCard}>
                  <span className={styles.statLabel}>전체 글</span>
                  <strong className={styles.statValue}>{posts.length}</strong>
                </article>
                <article className={styles.statCard}>
                  <span className={styles.statLabel}>오늘 올라온 새글</span>
                  <strong className={styles.statValue}>{todayPostCount}</strong>
                </article>
              </div>
            </section>

            <section className={styles.sidePanel}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>지금 반응 좋은 글</h2>
              </div>

              <div className={styles.sideStack}>
                {highlightedPosts.map((post) => (
                  <Link key={post.id} href={`/community/${post.id}`} className={styles.highlightCard}>
                    <span
                      className={`${styles.highlightCategory} ${getCategoryPillToneClass(post.category)}`}
                    >
                      {post.category}
                    </span>
                    <strong className={styles.highlightTitle}>{post.title}</strong>
                    <span className={styles.highlightMeta}>♥ {post.likes} · @{post.author}</span>
                  </Link>
                ))}
              </div>
            </section>

          </aside>
        </div>
      </div>
    </main>
  );
}





