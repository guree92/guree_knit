"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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

export default function CommunityPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const paginationRef = useRef<HTMLElement | null>(null);

  const [selectedCategory, setSelectedCategory] =
    useState<(typeof communityCategories)[number]>(communityCategories[0]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [searchText, setSearchText] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("latest");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingHideId, setPendingHideId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      setIsLoading(true);

      const [postsResponse, adminResponse] = await Promise.all([
        supabase
          .from("community_posts")
          .select(`*, community_likes(count)`)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false }),
        fetch("/api/admin/status", { cache: "no-store" }),
      ]);

      if (postsResponse.error) {
        console.error(postsResponse.error);
        alert("커뮤니티 글을 불러오지 못했어요.");
        setIsLoading(false);
        return;
      }

      if (adminResponse.ok) {
        const result = (await adminResponse.json()) as { isAdmin?: boolean };
        setIsAdmin(Boolean(result.isAdmin));
      } else {
        setIsAdmin(false);
      }

      const rows = (postsResponse.data ?? []) as CommunityPostRow[];
      setPosts(rows.map(mapCommunityPost));
      setIsLoading(false);
    }

    fetchPosts();
  }, [supabase]);

  const filteredPosts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    const searched = posts.filter((post) => {
      const matchesCategory =
        selectedCategory === communityCategories[0] || post.category === selectedCategory;

      if (!matchesCategory) return false;
      if (!keyword) return true;

      const targetText = [post.title, post.content, post.author, ...post.tags].join(" ").toLowerCase();
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

  async function handleHidePost(postId: string) {
    const shouldHide = window.confirm("이 게시글을 숨김 처리할까요?");
    if (!shouldHide) return;

    setPendingHideId(postId);

    const response = await fetch(`/api/admin/community/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: true }),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      alert(result?.message ?? "게시글 숨김 처리에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setPendingHideId(null);
      return;
    }

    setPosts((current) => current.filter((post) => post.id !== postId));
    router.refresh();
    setPendingHideId(null);
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Header />

        <section className={styles.hero}>
          <div className={styles.heroBadge}>Community Lounge</div>

          <div className={styles.heroHeader}>
            <div>
              <h1 className={styles.heroTitle}>뜨개 커뮤니티</h1>
              <p className={styles.heroDescription}>
                완성작 자랑부터 질문, 정보 공유, 같이 뜨기 모집까지. 편하게 둘러보고
                빠르게 찾아보는 커뮤니티 게시판이에요.
              </p>
            </div>

            <Link href="/community/write" className={styles.primaryAction}>
              글 쓰기
            </Link>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>전체 글</span>
              <strong className={styles.statValue}>{posts.length}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>오늘 올라온 새글</span>
              <strong className={styles.statValue}>{todayPostCount}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>정렬 방식</span>
              <strong className={styles.statValue}>
                {sortOption === "latest" ? "최신순" : "인기순"}
              </strong>
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
                  className={styles.clearButton}
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
                  className={selectedCategory === item ? styles.categoryChipActive : styles.categoryChip}
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

          <div className={styles.resultBar}>
            <div className={styles.resultText}>
              {hasSearch ? (
                <span>
                  <strong>&quot;{searchText}&quot;</strong> 검색 결과 <strong>{filteredPosts.length}개</strong>
                </span>
              ) : (
                <span>
                  전체 게시글 <strong>{filteredPosts.length}개</strong>
                </span>
              )}
            </div>

            {selectedCategory !== communityCategories[0] ? (
              <span className={styles.resultChip}>{selectedCategory}</span>
            ) : (
              <span className={styles.resultHint}>카테고리를 선택하면 글을 더 빠르게 찾을 수 있어요.</span>
            )}
          </div>
        </section>

        <section className={styles.listSection}>
          {isLoading ? (
            <div className={styles.feedbackCard}>
              <p className={styles.feedbackTitle}>글을 불러오는 중이에요.</p>
              <p className={styles.feedbackDescription}>최신 글과 인기 글을 정리하고 있어요.</p>
            </div>
          ) : filteredPosts.length > 0 ? (
            <>
              <div className={styles.cardGrid}>
                {paginatedPosts.map((post) => (
                  <article key={post.id} className={styles.postCard}>
                    <Link href={`/community/${post.id}`} className={styles.postCardLink}>
                      <div className={styles.cardTop}>
                        <span className={styles.categoryPill}>{post.category}</span>
                        <div className={styles.cardTopMeta}>
                          <span>{formatCommunityDate(post.createdAt)}</span>
                          <span>@{post.author}</span>
                          <span className={styles.likesPill}>♥ {post.likes}</span>
                        </div>
                      </div>

                      <h2 className={styles.cardTitle}>{post.title}</h2>
                      <p className={styles.cardPreview}>{post.preview}</p>

                      <div className={styles.cardFooter}>
                        {post.tags.length > 0 ? (
                          <div className={styles.tagList}>
                            {post.tags.map((tag) => (
                              <span key={`${post.id}-${tag}`} className={styles.tag}>
                                #{tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.tagSpacer} />
                        )}
                        <span className={styles.readMore}>자세히 보기</span>
                      </div>
                    </Link>

                    {isAdmin ? (
                      <div className={styles.cardActions}>
                        <button
                          type="button"
                          onClick={() => handleHidePost(post.id)}
                          disabled={pendingHideId === post.id}
                          className={styles.dangerButton}
                        >
                          {pendingHideId === post.id ? "숨김 중..." : "관리자 숨김"}
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>

              {totalPages > 1 ? (
                <nav ref={paginationRef} className={styles.pagination} aria-label="커뮤니티 페이지 이동">
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
                          className={safeCurrentPage === page ? styles.pageNumberActive : styles.pageNumber}
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
    </main>
  );
}
