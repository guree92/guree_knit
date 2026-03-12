import Header from "@/components/layout/Header";

const works = [
  {
    title: "튤립 코스터 세트",
    progress: "완성",
    yarn: "코튼사",
    note: "선물용으로 하나 더 만들 예정",
  },
  {
    title: "네트백",
    progress: "진행 중",
    yarn: "린넨 혼방",
    note: "손잡이 길이 조금 더 늘릴지 고민 중",
  },
  {
    title: "토끼 인형",
    progress: "중단",
    yarn: "아크릴사",
    note: "귀 부분 모양 수정 필요",
  },
];

export default function MyWorkPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8f4ff_50%,#eef8f2_100%)] px-6 py-10 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <Header />

        <section className="mt-12">
          <div className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-sm">
            <div className="inline-flex rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
              MY WORK
            </div>

            <h1 className="mt-4 text-4xl font-black text-slate-800">
              내 작품 기록
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-slate-600">
              사용한 실, 바늘 호수, 진행률, 수정 메모, 완성 사진까지
              내 뜨개 작업을 기록하고 정리할 수 있는 공간이야.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="rounded-[2rem] bg-violet-50 p-6 shadow-sm">
              <div className="text-sm text-violet-700">전체 작품</div>
              <div className="mt-2 text-3xl font-black text-slate-800">12</div>
            </div>

            <div className="rounded-[2rem] bg-emerald-50 p-6 shadow-sm">
              <div className="text-sm text-emerald-700">진행 중</div>
              <div className="mt-2 text-3xl font-black text-slate-800">4</div>
            </div>

            <div className="rounded-[2rem] bg-amber-50 p-6 shadow-sm">
              <div className="text-sm text-amber-700">완성작</div>
              <div className="mt-2 text-3xl font-black text-slate-800">8</div>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {works.map((work) => (
              <article
                key={work.title}
                className="rounded-[2rem] border border-white/60 bg-white/90 p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-800">
                    {work.title}
                  </h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {work.progress}
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-500">사용 실: {work.yarn}</p>
                <p className="mt-2 leading-7 text-slate-600">{work.note}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}