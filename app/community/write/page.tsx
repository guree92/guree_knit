"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/client";
import { type PostCategory } from "@/lib/community";

export default function CommunityWritePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [writeCategory, setWriteCategory] = useState<PostCategory>("완성작");
  const [writeTitle, setWriteTitle] = useState("");
  const [writeContent, setWriteContent] = useState("");

  const handleSubmitPost = async () => {
    const title = writeTitle.trim();
    const content = writeContent.trim();

    if (!title || !content) {
      alert("제목과 내용을 모두 입력해줘.");
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const authorName =
        user?.user_metadata?.nickname ||
        user?.user_metadata?.name ||
        user?.email?.split("@")[0] ||
        "익명";

      const { error } = await supabase.from("community_posts").insert({
        category: writeCategory,
        title,
        content,
        author_name: authorName,
        user_id: user?.id ?? null,
        tags: [writeCategory, "new"],
      });

      if (error) {
        throw new Error(error.message);
      }

      router.push("/community");
      router.refresh();
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어.";

      alert(`글 등록에 실패했어: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f1eb] px-6 py-8 text-[#3d3128] md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        <Header />

        <section className="mt-12 rounded-[2rem] border border-[#e4dbcf] bg-[#fcfaf7] p-8 shadow-[0_10px_30px_rgba(61,49,40,0.06)]">
          <Link
            href="/community"
            className="inline-flex text-sm font-semibold text-[#6f6257] transition hover:text-[#8a9b84]"
          >
            ← 커뮤니티로
          </Link>

          <div className="mt-6 inline-flex rounded-full border border-[#ddd1c3] bg-[#eee4d8] px-4 py-2 text-sm font-semibold text-[#7b6858]">
            WRITE POST
          </div>

          <h1 className="mt-4 text-3xl font-black text-[#3d3128] md:text-4xl">
            게시글 작성
          </h1>

          <p className="mt-3 leading-7 text-[#6f6257]">
            완성작 자랑, 질문, 팁 공유, 같이뜨기 모집 글을 자유롭게 남겨봐.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-[180px_1fr]">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6f6257]">
                카테고리
              </label>
              <select
                value={writeCategory}
                onChange={(e) => setWriteCategory(e.target.value as PostCategory)}
                className="w-full rounded-2xl border border-[#ddd4c9] bg-white px-4 py-3 text-sm text-[#3d3128] outline-none focus:border-[#8a9b84]"
              >
                <option value="완성작">완성작</option>
                <option value="질문">질문</option>
                <option value="팁공유">팁공유</option>
                <option value="같이뜨기">같이뜨기</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6f6257]">
                제목
              </label>
              <input
                type="text"
                value={writeTitle}
                onChange={(e) => setWriteTitle(e.target.value)}
                placeholder="제목을 입력해줘"
                className="w-full rounded-2xl border border-[#ddd4c9] bg-white px-4 py-3 text-sm text-[#3d3128] outline-none placeholder:text-[#a69486] focus:border-[#8a9b84]"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-[#6f6257]">
              내용
            </label>
            <textarea
              value={writeContent}
              onChange={(e) => setWriteContent(e.target.value)}
              placeholder="내용을 입력해줘"
              rows={10}
              className="w-full resize-none rounded-2xl border border-[#ddd4c9] bg-white px-4 py-3 text-sm leading-7 text-[#3d3128] outline-none placeholder:text-[#a69486] focus:border-[#8a9b84]"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleSubmitPost}
              disabled={isSubmitting}
              className="rounded-2xl bg-[#8a9b84] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#788a73] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "등록중..." : "등록하기"}
            </button>

            <Link
              href="/community"
              className="inline-flex rounded-2xl border border-[#ddd4c9] bg-white px-5 py-3 text-sm font-semibold text-[#6f6257] transition hover:-translate-y-0.5 hover:bg-[#f8f4ee] hover:shadow-sm"
            >
              취소
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}