import Link from "next/link";
import Header from "@/components/layout/Header";
import { getPatternById } from "@/data/patterns";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PatternDetailPage({ params }: PageProps) {
  const { id } = await params;
  const pattern = getPatternById(id);

  if (!pattern) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8f4ff_48%,#eef8f2_100%)] px-6 py-8 text-slate-800 md:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          <Header />

          <section className="mt-12 rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black text-slate-800">
              없는 도안이야
            </h1>
            <p className="mt-3 text-slate-600">
              요청한 도안 정보를 찾지 못했어.
            </p>
            <Link
              href="/patterns"
              className="mt-6 inline-flex rounded-2xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white"
            >
              도안 목록으로 돌아가기
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8f4ff_48%,#eef8f2_100%)] px-6 py-8 text-slate-800 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Header />

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-sm">
            <Link
              href="/patterns"
              className="mb-6 inline-flex text-sm font-semibold text-violet-600"
            >
              ← 도안 목록으로
            </Link>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-700">
                {pattern.level}
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
                {pattern.category}
              </span>
            </div>

            <h1 className="mt-4 text-4xl font-black text-slate-800">
              {pattern.title}
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-slate-600">
              {pattern.desc}
            </p>

            <div className="mt-8 h-64 rounded-[2rem] bg-[linear-gradient(135deg,#efe7ff,#edf9ef,#fff2e6)]" />
          </div>

          <div className="space-y-5">
            <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800">기본 정보</h2>

              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span>난이도</span>
                  <span className="font-semibold text-slate-800">
                    {pattern.level}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span>카테고리</span>
                  <span className="font-semibold text-slate-800">
                    {pattern.category}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span>사용 실</span>
                  <span className="font-semibold text-slate-800">
                    {pattern.yarn}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span>바늘</span>
                  <span className="font-semibold text-slate-800">
                    {pattern.needle}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>완성 크기</span>
                  <span className="font-semibold text-slate-800">
                    {pattern.size}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800">뜨개 팁</h2>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                {pattern.tips.map((tip) => (
                  <li
                    key={tip}
                    className="rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}