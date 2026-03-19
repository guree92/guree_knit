"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CommunityPostForm from "@/components/community/CommunityPostForm";
import Header from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/client";
import { mapCommunityPost, type CommunityPostRow } from "@/lib/community";

function canManagePost(
  post: { author: string; authorEmail: string | null; ownerName?: string | null },
  user: { email?: string | null; user_metadata?: { nickname?: string; name?: string } } | null
) {
  if (!user) return false;

  const email = user.email?.trim().toLowerCase() ?? "";

  if (post.authorEmail && email && post.authorEmail.trim().toLowerCase() === email) {
    return true;
  }

  const candidateNames = new Set(
    [
      user.user_metadata?.nickname,
      user.user_metadata?.name,
      user.email?.split("@")[0],
    ]
      .map((item) => item?.trim())
      .filter(Boolean)
  );

  return candidateNames.has(post.ownerName?.trim() || post.author.trim());
}

export default function CommunityEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [initialValues, setInitialValues] = useState<{
    id: string;
    category: "완성작" | "질문" | "정보공유" | "같이뜨기";
    title: string;
    body: string;
    tags: string[];
    extraFields: Record<string, string>;
    imagePath: string | null;
  } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);

      if (!id || typeof id !== "string") {
        setErrorMessage("게시글 정보를 확인할 수 없어요.");
        setLoading(false);
        return;
      }

      const [
        {
          data: { user },
        },
        { data, error },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("community_posts").select("*").eq("id", id).single(),
      ]);

      if (error || !data) {
        setErrorMessage("게시글을 찾을 수 없어요.");
        setLoading(false);
        return;
      }

      const post = mapCommunityPost(data as CommunityPostRow);

      if (!canManagePost(post, user)) {
        setErrorMessage("작성자만 게시글을 수정할 수 있어요.");
        setLoading(false);
        return;
      }

      setInitialValues({
        id: post.id,
        category: post.category,
        title: post.title,
        body: post.content,
        tags: post.tags,
        extraFields: post.extraFields,
        imagePath: post.imagePath,
      });
      setLoading(false);
    }

    void load();
  }, [id, supabase]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f1eb] px-6 py-8 text-[#3d3128] md:px-8 md:py-10">
        <div className="mx-auto max-w-5xl">
          <Header />
          <section className="mt-12 rounded-[2rem] border border-[#e4dbcf] bg-[#fffdfa] p-8 shadow-[0_10px_30px_rgba(61,49,40,0.06)]">
            <p className="text-[#6f6257]">수정할 게시글을 불러오는 중이에요...</p>
          </section>
        </div>
      </main>
    );
  }

  if (!initialValues) {
    return (
      <main className="min-h-screen bg-[#f4f1eb] px-6 py-8 text-[#3d3128] md:px-8 md:py-10">
        <div className="mx-auto max-w-5xl">
          <Header />
          <section className="mt-12 rounded-[2rem] border border-dashed border-[#d8cec0] bg-[#fcfaf7] p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black text-[#3d3128]">수정 페이지를 열 수 없어요</h1>
            <p className="mt-3 text-[#6f6257]">{errorMessage || "게시글 정보를 다시 확인해 주세요."}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/community"
                className="inline-flex rounded-2xl border border-[#ddd4c9] bg-white px-5 py-3 text-sm font-semibold text-[#6f6257]"
              >
                뜨개마당으로
              </Link>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex rounded-2xl bg-[#8a9b84] px-5 py-3 text-sm font-semibold text-white"
              >
                뒤로 가기
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <CommunityPostForm
      mode="edit"
      postId={initialValues.id}
      initialValues={initialValues}
    />
  );
}
