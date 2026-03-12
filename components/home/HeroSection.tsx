import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="grid w-full gap-10 lg:grid-cols-2">
      <div className="flex flex-col justify-center">
        <div className="mb-4 inline-flex w-fit rounded-full bg-white/80 px-4 py-2 text-sm shadow-sm">
          뜨개하는 사람들을 위한 아늑한 공간
        </div>

        <h2 className="text-4xl font-black leading-tight md:text-6xl">
          실 한 올로 이어지는
          <br />
          우리들의 뜨개 홈
        </h2>

        <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 md:text-lg">
          도안을 찾고, 작품을 기록하고, 서로의 완성작을 구경하고,
          도트 작품까지 직접 만들 수 있는 뜨개 전용 홈페이지야.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dot-maker"
            className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200"
          >
            도트메이커 시작하기
          </Link>

          <button className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            도안 둘러보기
          </button>
        </div>
      </div>

      <div className="grid gap-4 rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-xl backdrop-blur">
        <div className="rounded-[1.5rem] bg-violet-50 p-5">
          <div className="mb-3 text-sm font-semibold text-violet-700">
            오늘의 추천
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-lg font-bold">튤립 코스터 세트</div>
            <div className="mt-1 text-sm text-slate-500">
              코바늘 · 초급 · 30분 완성
            </div>
            <div className="mt-4 h-28 rounded-2xl bg-[linear-gradient(135deg,#f4e8ff,#eaf8ef)]" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.5rem] bg-emerald-50 p-4">
            <div className="text-sm text-emerald-700">진행 중 작품</div>
            <div className="mt-2 text-3xl font-black">12</div>
          </div>

          <div className="rounded-[1.5rem] bg-amber-50 p-4">
            <div className="text-sm text-amber-700">오늘 올라온 글</div>
            <div className="mt-2 text-3xl font-black">38</div>
          </div>
        </div>
      </div>
    </section>
  );
}