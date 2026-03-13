"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/client";
import {
  formatCommunityDate,
  mapCommunityPost,
  type CommunityPost,
  type CommunityPostRow,
} from "@/lib/community";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function CommunityDetailPage({ params }: PageProps) {
  const supabase = useMemo(() => createClient(), []);

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    async function resolveParamsAndFetch() {
      const { id } = await params;

      const { data, error } = await supabase
        .from("community_posts")
        .select(
          `
            *,
            community_likes(count)
          `
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        console.error(error);
        setIsNotFound(true);
        setIsLoading(false);
        return;
      }

      setPost(mapCommunityPost(data as CommunityPostRow));
      setIsLoading(false);
    }

    resolveParamsAndFetch();
  }, [params, supabase]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f4f1eb] px-6 py-8 text-[#3d3128] md:px-8 md:py-10">
        <div className="mx-auto max-w-4xl">
          <Header />

          <section className="mt-12 rounded-[2rem] border border-[#e4dbcf] bg-[#fffdfa] p-8 shadow-[0_10px_30px_rgba(61,49,40,0.06)]">
            <p className="text-[#6f6257]">글을 불러오는 중이야...</p>
          </section>
        </div>
      </main>
    );
  }

  if (isNotFound || !post) {
    return (
      <main className="min-h-screen bg-[#f4f1eb] px-6 py-8 text-[#3d3128] md:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          <Header />

          <section className="mt-12 rounded-[2rem] border border-dashed border-[#d8cec0] bg-[#fcfaf7] p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black text-[#3d3128]">없는 글이야</h1>
            <p className="mt-3 text-[#6f6257]">
              요청한 커뮤니티 글 정보를 찾지 못했어.
            </p>
            <Link
              href="/community"
              className="mt-6 inline-flex rounded-2xl bg-[#8a9b84] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#788a73]"
            >
              커뮤니티로 돌아가기
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1eb] px-6 py-8 text-[#3d3128] md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        <Header />

        <section className="mt-12 rounded-[2rem] border border-[#e4dbcf] bg-[#fffdfa] p-8 shadow-[0_10px_30px_rgba(61,49,40,0.06)]">
          <Link
            href="/community"
            className="mb-6 inline-flex text-sm font-semibold text-[#6f6257] transition hover:text-[#8a9b84]"
          >
            ← 커뮤니티로
          </Link>

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

          <h1 className="mt-4 text-3xl font-black text-[#3d3128] md:text-4xl">
            {post.title}
          </h1>

          <div className="mt-6 whitespace-pre-wrap rounded-[1.5rem] bg-[#f8f4ee] p-6 leading-8 text-[#5f5349]">
            {post.content}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#ddd1c3] bg-[#eee4d8] px-3 py-1 text-xs font-medium text-[#6f6257]"
              >
                #{tag}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}