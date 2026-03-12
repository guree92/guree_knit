import Link from "next/link";
import { patternCategories, patternItems } from "@/data/patterns";

export default function CategorySection() {
  const categories = patternCategories.filter((item) => item !== "전체");
  const featuredPatterns = patternItems.slice(0, 3);

  return (
    <section className="mt-20">
      <div className="mb-8">
        <h3 className="text-3xl font-black text-slate-800">인기 카테고리</h3>
        <p className="mt-2 text-slate-600">
          만들고 싶은 작품부터 가볍게 골라보고, 바로 도안도 살펴볼 수 있어.
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
        {featuredPatterns.map((pattern, index) => (
          <Link
            key={pattern.id}
            href={`/patterns/${pattern.id}`}
            className="overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
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
                  {pattern.level}
                </span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
                  {pattern.category}
                </span>
              </div>

              <h4 className="text-lg font-bold text-slate-800">
                {pattern.title}
              </h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {pattern.desc}
              </p>

              <div className="mt-4 text-sm font-semibold text-violet-600">
                도안 보러가기 →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}