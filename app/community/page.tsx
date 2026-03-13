"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/client";
import {
  communityCategories,
  formatCommunityDate,
  mapCommunityPost,
  type CommunityPost,
  type CommunityPostRow,
} from "@/lib/community";

type SortOption = "latest" | "popular";

export default function CommunityPage() {
  const supabase = useMemo(() => createClient(), []);

  const [selectedCategory, setSelectedCategory] =
    useState<(typeof communityCategories)[number]>("전체");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [searchText, setSearchText] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("latest");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("community_posts")
      .select(
        `
          *,
          community_likes(count)
        `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("커뮤니티 글을 불러오지 못했어.");
      setIsLoading(false);
      return;
    }

    const rows = (data ?? []) as CommunityPostRow[];
    setPosts(rows.map(mapCommunityPost));
    setIsLoading(false);
  }

  const filteredPosts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    const searched = posts.filter((post) => {
      const matchesCategory =
        selectedCategory === "전체" || post.category === selectedCategory;

      if (!matchesCategory) return false;
      if (!keyword) return true;

      const targetText = [
        post.title,
        post.content,
        post.author,
        ...(post.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return targetText.includes(keyword);
    });

    const sorted = [...searched].sort((a, b) => {
      if (sortOption === "popular") {
        return b.likes - a.likes;
      }

      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();

      return bTime - aTime;
    });

    return sorted;
  }, [posts, searchText, selectedCategory, sortOption]);

  return (
    <main className="min-h-screen bg-[#f4f1eb] px-6 py-8 text-[#3d3128] md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Header />

        <section className="mt-12">
          <div className="rounded-[2rem] border border-[#e4dbcf] bg-[#fcfaf7] p-8 shadow-[0_10px_30px_rgba(61,49,40,0.06)]">
            <div className="inline-flex rounded-full border border-[#ddd1c3] bg-[#eee4d8] px-4 py-2 text-sm font-semibold text-[#7b6858]">
              COMMUNITY
            </div>

            <h1 className="mt-4 text-4xl font-black text-[#3d3128]">
              커뮤니티
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-[#6f6257]">
              완성작 자랑, 질문, 팁 공유, 같이 뜨기 모집까지 뜨개하는 사람들끼리
              편하게 소통할 수 있는 공간이야.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/community/write"
                className="inline-flex rounded-2xl bg-[#8a9b84] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#788a73] hover:shadow-md"
              >
                글쓰기
              </Link>
            </div>

            <div className="mt-6">
              <label
                htmlFor="community-search"
                className="mb-2 block text-sm font-semibold text-[#6f6257]"
              >
                게시글 검색
              </label>

              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  id="community-search"
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="제목, 내용, 작성자, 태그로 검색해봐"
                  className="w-full rounded-2xl border border-[#ddd4c9] bg-white px-4 py-3 text-sm text-[#3d3128] outline-none placeholder:text-[#a69486] focus:border-[#8a9b84]"
                />

                {searchText.trim() ? (
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
                    className="rounded-2xl border border-[#ddd4c9] bg-white px-5 py-3 text-sm font-semibold text-[#6f6257] transition hover:-translate-y-0.5 hover:bg-[#f8f4ee] hover:shadow-sm"
                  >
                    검색 초기화
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {communityCategories.map((item) => (
              <button
                key={item}
                onClick={() => setSelectedCategory(item)}
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition",
                  selectedCategory === item
                    ? "bg-[#8a9b84] text-white"
                    : "border border-[#ddd4c9] bg-[#fcfaf7] text-[#6f6257] hover:-translate-y-0.5 hover:shadow-md",
                ].join(" ")}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#8f8175]">
              <span>
                {searchText.trim()
                  ? `"${searchText}" 검색 결과 ${filteredPosts.length}개`
                  : `전체 게시글 ${filteredPosts.length}개`}
              </span>

              {selectedCategory !== "전체" ? (
                <span className="rounded-full bg-[#eee4d8] px-3 py-1 text-xs font-semibold text-[#7b6858]">
                  {selectedCategory}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="community-sort"
                className="text-sm font-semibold text-[#6f6257]"
              >
                정렬
              </label>
              <select
                id="community-sort"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="rounded-2xl border border-[#ddd4c9] bg-white px-4 py-3 text-sm font-semibold text-[#3d3128] outline-none focus:border-[#8a9b84]"
              >
                <option value="latest">최신순</option>
                <option value="popular">인기순</option>
              </select>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {isLoading ? (
              <div className="rounded-[2rem] border border-dashed border-[#d8cec0] bg-[#fcfaf7] px-6 py-14 text-center shadow-sm">
                <p className="text-lg font-semibold text-[#6f6257]">
                  글을 불러오는 중이야
                </p>
              </div>
            ) : filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/community/${post.id}`}
                  className="block rounded-[2rem] border border-[#e4dbcf] bg-[#fffdfa] p-6 shadow-[0_8px_20px_rgba(61,49,40,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(61,49,40,0.08)]"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[#d7e0d3] px-3 py-1 text-xs font-semibold text-[#52624d]">
                      {post.category}
                    </span>
                    <span className="text-sm text-[#9b8b7f]">@{post.author}</span>
                    <span className="text-sm text-[#9b8b7f]">
                      {formatCommunityDate(post.createdAt)}
                    </span>
                    <span className="text-sm font-semibold text-[#8a9b84]">
                      ❤ {post.likes}
                    </span>
                  </div>

                  <h2 className="mt-4 text-xl font-bold text-[#3d3128]">
                    {post.title}
                  </h2>

                  <p className="mt-2 leading-7 text-[#6f6257]">{post.preview}</p>

                  {post.tags.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={`${post.id}-${tag}`}
                          className="rounded-full border border-[#ddd1c3] bg-[#eee4d8] px-3 py-1 text-xs font-medium text-[#6f6257]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 text-sm font-semibold text-[#8a9b84]">
                    글 보러가기 →
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[2rem] border border-dashed border-[#d8cec0] bg-[#fcfaf7] px-6 py-14 text-center shadow-sm">
                <p className="text-lg font-semibold text-[#6f6257]">
                  검색 결과가 없어
                </p>
                <p className="mt-2 text-sm text-[#9b8b7f]">
                  다른 검색어를 넣어보거나 카테고리를 바꿔봐.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}