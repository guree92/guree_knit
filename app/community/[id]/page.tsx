import Link from "next/link";
import Header from "@/components/layout/Header";
import { getCommunityPostById } from "@/data/community";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CommunityDetailPage({ params }: PageProps) {
  const { id } = await params;
  const post = getCommunityPostById(id);

  if (!post) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8f4ff_48%,#eef8f2_100%)] px-6 py-8 text-slate-800 md:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          <Header />

          <section className="mt-12 rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black text-slate-800">
              없는 글이야
            </h1>
            <p className="mt-3 text-slate-600">
              요청한 커뮤니티 글 정보를 찾지 못했어.
            </p>
            <Link
              href="/community"
              className="mt-6 inline-flex rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white"
            >
              커뮤니티로 돌아가기
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8f4ff_48%,#eef8f2_100%)] px-6 py-8 text-slate-800 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        <Header />

        <section className="mt-12 rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-sm">
          <Link
            href="/community"
            className="mb-6 inline-flex text-sm font-semibold text-slate-600"
          >
            ← 커뮤니티로
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
              {post.category}
            </span>
            <span className="text-sm text-slate-400">@{post.author}</span>
          </div>

          <h1 className="mt-4 text-3xl font-black text-slate-800 md:text-4xl">
            {post.title}
          </h1>

          <div className="mt-6 rounded-[1.5rem] bg-slate-50 p-6 leading-8 text-slate-700">
            {post.content}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
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