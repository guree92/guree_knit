"use client";

import Link from "next/link";
import { useState } from "react";

type HiddenPostItem = {
  id: string;
  title: string;
  authorName: string | null;
  createdAt: string | null;
  hiddenAt: string | null;
};

type Props = {
  initialPosts: HiddenPostItem[];
};

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function AdminHiddenPostsClient({ initialPosts }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleRestore(postId: string) {
    const confirmed = window.confirm("이 게시글의 숨김 처리를 해제할까요?");
    if (!confirmed) return;

    setPendingId(postId);

    const response = await fetch(`/api/admin/community/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: false }),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      alert(result?.message ?? "숨김 해제에 실패했어요.");
      setPendingId(null);
      return;
    }

    setPosts((current) => current.filter((post) => post.id !== postId));
    setPendingId(null);
  }

  if (posts.length === 0) {
    return (
      <section className="mt-8 rounded-[2rem] border border-dashed border-[#d9cec2] bg-[#f8f4ee] p-10 text-center shadow-sm">
        <h2 className="text-xl font-black text-[#4a392f]">숨김 게시글이 없어요</h2>
        <p className="mt-3 text-[#756457]">현재 숨김 처리된 커뮤니티 게시글이 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="mt-8 grid gap-4">
      {posts.map((post) => (
        <article
          key={post.id}
          className="rounded-[1.8rem] border border-[#e6ddd2] bg-[#fffdf9] p-6 shadow-[0_10px_24px_rgba(91,74,60,0.04)]"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#8f7a67]">숨김 게시글</p>
              <h2 className="mt-2 text-2xl font-black text-[#4a392f]">{post.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#756457]">
                작성자 @{post.authorName ?? "알 수 없음"} · 작성일 {formatDate(post.createdAt)} · 숨김일 {" "}
                {formatDate(post.hiddenAt)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/community/${post.id}`}
                className="inline-flex items-center justify-center rounded-[1.1rem] border border-[#ddd4c9] bg-white px-4 py-2.5 text-sm font-semibold text-[#6f6257] transition hover:bg-[#f5f0e9]"
              >
                상세 보기
              </Link>
              <button
                type="button"
                onClick={() => handleRestore(post.id)}
                disabled={pendingId === post.id}
                className="inline-flex items-center justify-center rounded-[1.1rem] bg-[#8a9b84] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#788a73] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingId === post.id ? "복구 중..." : "숨김 해제"}
              </button>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
