import Link from "next/link";
import { communityPosts } from "@/data/community";

export default function CommunitySection() {
  const recentPosts = communityPosts.slice(0, 3);

  return (
    <section className="pb-2">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-3xl font-black tracking-[-0.02em] text-[#3f342c]">
            최근 뜨개마당 글
          </h3>
          <p className="mt-2 text-[#75695f]">
            질문도 올리고, 완성작도 자랑하고, 뜨개 팁도 편하게 나눌 수 있어.
          </p>
        </div>

        <Link
          href="/community"
          className="rounded-2xl bg-[#8ca08b] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#7d927d] hover:shadow-md"
        >
          뜨개마당 전체 보기
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-[#dce5dc] bg-[#f4f8f4] p-8 text-[#3f342c] shadow-sm">
          <div className="inline-flex rounded-full border border-[#dbe5dc] bg-white px-4 py-2 text-sm font-semibold text-[#6f856f]">
            COMMUNITY
          </div>

          <h3 className="mt-4 text-3xl font-black tracking-[-0.03em]">
            함께 뜨면
            <br />
            더 오래, 더 재밌게
          </h3>

          <p className="mt-4 max-w-xl leading-8 text-[#617261]">
            질문하고, 팁을 공유하고, 완성작을 자랑하고, 같이 뜨기까지.
            혼자 뜨는 시간도 좋지만 함께하면 더 즐거운 뜨개 생활이 될 거야.
          </p>
        </div>

        <div className="space-y-4">
          {recentPosts.map((post) => (
            <Link
              key={post.id}
              href={`/community/${post.id}`}
              className="block rounded-[2rem] border border-[#efe6dc] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[#dbe5dc] bg-[#eef4ee] px-3 py-1 text-xs font-semibold text-[#6f856f]">
                  {post.category}
                </span>
                <span className="text-sm text-[#9a8c7e]">@{post.author}</span>
              </div>

              <h4 className="mt-4 text-xl font-bold text-[#453a31]">
                {post.title}
              </h4>
              <p className="mt-2 leading-7 text-[#75695f]">{post.preview}</p>

              <div className="mt-4 text-sm font-semibold text-[#7f957f]">
                글 보러가기 →
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-[2rem] border border-[#efe6dc] bg-white p-8 shadow-sm">
        <div className="inline-flex rounded-full border border-[#ece1d5] bg-[#faf3eb] px-4 py-2 text-sm font-semibold text-[#8b725d]">
          MY RECORD
        </div>

        <h3 className="mt-4 text-3xl font-black tracking-[-0.03em] text-[#3f342c]">
          내 작품 기록도
          <br />
          예쁘게 남길 수 있게
        </h3>

        <p className="mt-4 leading-8 text-[#75695f]">
          사용한 실, 바늘 호수, 수정한 부분, 완성 날짜, 사진까지 정리해두면
          나중에 다시 같은 작품을 만들 때도 편하고, 다른 사람과 공유할 때도 더
          보기 좋아져.
        </p>

        <Link
          href="/my-work"
          className="mt-6 inline-flex rounded-2xl bg-[#8ca08b] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#7d927d] hover:shadow-md"
        >
          작품기록 보러가기
        </Link>
      </div>
    </section>
  );
}
