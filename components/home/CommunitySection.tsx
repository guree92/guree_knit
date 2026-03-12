import Link from "next/link";
import { communityPosts } from "@/data/community";

export default function CommunitySection() {
  const recentPosts = communityPosts.slice(0, 3);

  return (
    <section className="mt-20 mb-20">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-3xl font-black text-slate-800">최근 커뮤니티 글</h3>
          <p className="mt-2 text-slate-600">
            뜨개하는 사람들의 질문, 완성작, 팁을 홈에서도 바로 볼 수 있어.
          </p>
        </div>

        <Link
          href="/community"
          className="rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
        >
          커뮤니티 전체 보기
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] bg-slate-800 p-8 text-white shadow-xl">
          <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
            COMMUNITY
          </div>

          <h3 className="mt-4 text-3xl font-black">
            함께 뜨면
            <br />
            더 오래, 더 재밌게
          </h3>

          <p className="mt-4 max-w-xl leading-7 text-white/80">
            질문하고, 팁을 공유하고, 완성작을 자랑하고, 같이 뜨기까지.
            혼자 뜨는 시간도 좋지만 함께하면 더 즐거운 뜨개 생활이 될 거야.
          </p>
        </div>

        <div className="space-y-4">
          {recentPosts.map((post) => (
            <Link
              key={post.id}
              href={`/community/${post.id}`}
              className="block rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                  {post.category}
                </span>
                <span className="text-sm text-slate-400">@{post.author}</span>
              </div>

              <h4 className="mt-4 text-xl font-bold text-slate-800">
                {post.title}
              </h4>
              <p className="mt-2 leading-7 text-slate-600">{post.preview}</p>

              <div className="mt-4 text-sm font-semibold text-slate-600">
                글 보러가기 →
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-sm">
        <div className="inline-flex rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
          MY RECORD
        </div>

        <h3 className="mt-4 text-3xl font-black text-slate-800">
          내 작품 기록도
          <br />
          예쁘게 남길 수 있게
        </h3>

        <p className="mt-4 leading-7 text-slate-600">
          사용한 실, 바늘 호수, 수정한 부분, 완성 날짜, 사진까지 정리해두면
          나중에 다시 같은 작품을 만들 때도 훨씬 편해져.
        </p>

        <Link
          href="/my-work"
          className="mt-6 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
        >
          작품기록 보러가기
        </Link>
      </div>
    </section>
  );
}