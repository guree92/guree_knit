import Link from "next/link";
import { patternCategories, patternItems } from "@/data/patterns";

export default function CategorySection() {
  const categories = patternCategories.filter((item) => item !== "전체");
  const featuredPatterns = patternItems.slice(0, 3);

  return (
    <section>
      <div className="mb-8">
        <h3 className="text-3xl font-black tracking-[-0.02em] text-[#3f342b]">
          도안 둘러보기
        </h3>
        <p className="mt-2 text-[#74695f]">
          가볍게 둘러보다가 마음에 드는 작품을 찾고, 공유된 도안이나 판매
          도안까지 자연스럽게 연결될 수 있게.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {categories.map((category, index) => (
          <div
            key={category}
            className={`rounded-full px-5 py-3 text-sm font-semibold shadow-sm ${
              index % 3 === 1
                ? "border border-[#dce6dc] bg-[#eef4ee] text-[#6f856f]"
                : "border border-[#e7dccf] bg-white text-[#5d5045]"
            }`}
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
            className="overflow-hidden rounded-[2rem] border border-[#eee3d7] bg-white/90 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              className={`h-40 ${
                index % 3 === 0
                  ? "bg-[linear-gradient(135deg,#f4eadf,#eef4ee,#fbf6ef)]"
                  : index % 3 === 1
                  ? "bg-[linear-gradient(135deg,#f7efe6,#f1f6f1,#f4eadf)]"
                  : "bg-[linear-gradient(135deg,#efe6da,#edf4ee,#f8f2ea)]"
              }`}
            />

            <div className="p-5">
              <div className="mb-3 flex gap-2 text-xs">
                <span className="rounded-full bg-[#f4eadf] px-3 py-1 font-medium text-[#8b725d]">
                  {pattern.level}
                </span>
                <span className="rounded-full bg-[#eef4ee] px-3 py-1 font-medium text-[#6f856f]">
                  {pattern.category}
                </span>
              </div>

              <h4 className="text-lg font-bold text-[#4a3d33]">
                {pattern.title}
              </h4>
              <p className="mt-2 text-sm leading-7 text-[#74695f]">
                {pattern.desc}
              </p>

              <div className="mt-4 text-sm font-semibold text-[#7c927a]">
                도안 보러가기 →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}