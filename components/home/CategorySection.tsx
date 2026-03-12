const categories = ["가방", "목도리", "인형", "모자", "의류", "소품"];

export default function CategorySection() {
  return (
    <section className="mt-20">
      <div className="mb-8">
        <h3 className="text-3xl font-black text-slate-800">인기 카테고리</h3>
        <p className="mt-2 text-slate-600">
          만들고 싶은 작품부터 가볍게 골라볼 수 있어.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <div
            key={category}
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm"
          >
            {category}
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <article className="overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-sm">
          <div className="h-40 bg-[linear-gradient(135deg,#efe7ff,#edf9ef,#fff2e6)]" />
          <div className="p-5">
            <div className="mb-3 flex gap-2 text-xs">
              <span className="rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-700">
                초급
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
                가방
              </span>
            </div>
            <h4 className="text-lg font-bold text-slate-800">
              봄에 들기 좋은 네트백
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              가볍게 뜨기 좋은 코바늘 가방 도안 예시 카드야.
            </p>
          </div>
        </article>

        <article className="overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-sm">
          <div className="h-40 bg-[linear-gradient(135deg,#fff0f5,#f3f7ff,#eefbf4)]" />
          <div className="p-5">
            <div className="mb-3 flex gap-2 text-xs">
              <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">
                중급
              </span>
              <span className="rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-700">
                인형
              </span>
            </div>
            <h4 className="text-lg font-bold text-slate-800">
              손바닥만 한 토끼 인형
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              작은 소품이나 인형 뜨개를 좋아하는 사람들을 위한 예시 카드야.
            </p>
          </div>
        </article>

        <article className="overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-sm">
          <div className="h-40 bg-[linear-gradient(135deg,#eef8ff,#f5f0ff,#fff8ef)]" />
          <div className="p-5">
            <div className="mb-3 flex gap-2 text-xs">
              <span className="rounded-full bg-rose-100 px-3 py-1 font-medium text-rose-700">
                인기
              </span>
              <span className="rounded-full bg-lime-100 px-3 py-1 font-medium text-lime-700">
                소품
              </span>
            </div>
            <h4 className="text-lg font-bold text-slate-800">
              꽃 모양 코스터 세트
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              짧은 시간 안에 완성 가능한 소품류 도안 예시 카드야.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}