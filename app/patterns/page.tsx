import Header from "@/components/layout/Header";

const patternCards = [
  {
    title: "봄 네트백",
    level: "초급",
    category: "가방",
    desc: "가볍고 산뜻하게 들 수 있는 코바늘 네트백 도안이야.",
  },
  {
    title: "리본 머플러",
    level: "중급",
    category: "목도리",
    desc: "포근한 계절감이 느껴지는 부드러운 머플러 도안이야.",
  },
  {
    title: "토끼 인형",
    level: "중급",
    category: "인형",
    desc: "손바닥 크기로 만들기 좋은 귀여운 인형 도안이야.",
  },
  {
    title: "데일리 비니",
    level: "초급",
    category: "모자",
    desc: "무난하게 코디하기 좋은 베이직한 비니 도안이야.",
  },
  {
    title: "플라워 코스터",
    level: "초급",
    category: "소품",
    desc: "짧은 시간 안에 완성할 수 있는 꽃 모양 코스터 도안이야.",
  },
  {
    title: "포근한 조끼",
    level: "고급",
    category: "의류",
    desc: "레이어드해서 입기 좋은 니트 조끼 도안이야.",
  },
];

export default function PatternsPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8f4ff_50%,#eef8f2_100%)] px-6 py-10 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <Header />

        <section className="mt-12">
          <div className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-sm">
            <div className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">
              PATTERNS
            </div>

            <h1 className="mt-4 text-4xl font-black text-slate-800">
              도안 모아보기
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-slate-600">
              초보부터 숙련자까지 다양한 뜨개 도안을 한눈에 보고,
              만들고 싶은 작품을 카테고리별로 찾아볼 수 있는 페이지야.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {["전체", "가방", "목도리", "인형", "모자", "의류", "소품"].map(
              (item) => (
                <button
                  key={item}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                >
                  {item}
                </button>
              )
            )}
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {patternCards.map((card, index) => (
              <article
                key={card.title}
                className="overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-sm"
              >
                <div
                  className={`h-40 ${
                    index % 3 === 0
                      ? "bg-[linear-gradient(135deg,#efe7ff,#edf9ef,#fff2e6)]"
                      : index % 3 === 1
                      ? "bg-[linear-gradient(135deg,#fff0f5,#f3f7ff,#eefbf4)]"
                      : "bg-[linear-gradient(135deg,#eef8ff,#f5f0ff,#fff8ef)]"
                  }`}
                />
                <div className="p-5">
                  <div className="mb-3 flex gap-2 text-xs">
                    <span className="rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-700">
                      {card.level}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
                      {card.category}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-slate-800">
                    {card.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {card.desc}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}