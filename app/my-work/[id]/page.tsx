import Link from "next/link";
import Header from "@/components/layout/Header";
import { getProgressBadgeClass, getWorkById } from "@/data/my-work";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MyWorkDetailPage({ params }: PageProps) {
  const { id } = await params;
  const work = getWorkById(id);

  if (!work) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8f4ff_48%,#eef8f2_100%)] px-6 py-8 text-slate-800 md:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          <Header />

          <section className="mt-12 rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black text-slate-800">
              없는 작품이야
            </h1>
            <p className="mt-3 text-slate-600">
              요청한 작품 기록 정보를 찾지 못했어.
            </p>
            <Link
              href="/my-work"
              className="mt-6 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
            >
              작품기록으로 돌아가기
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
              href="/my-work"
              className="mb-6 inline-flex text-sm font-semibold text-emerald-700"
            >
              ← 작품기록으로
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-black text-slate-800">
                {work.title}
              </h1>
              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  getProgressBadgeClass(work.progress),
                ].join(" ")}
              >
                {work.progress}
              </span>
            </div>

            <p className="mt-4 max-w-2xl leading-7 text-slate-600">
              {work.detail}
            </p>

            <div className="mt-8 h-64 rounded-[2rem] bg-[linear-gradient(135deg,#eefcf5,#f3f0ff,#fff7ee)]" />
          </div>

          <div className="space-y-5">
            <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800">기본 정보</h2>

              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span>상태</span>
                  <span className="font-semibold text-slate-800">
                    {work.progress}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span>사용 실</span>
                  <span className="font-semibold text-slate-800">
                    {work.yarn}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span>바늘</span>
                  <span className="font-semibold text-slate-800">
                    {work.needle}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span>시작일</span>
                  <span className="font-semibold text-slate-800">
                    {work.startedAt}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>최근 수정일</span>
                  <span className="font-semibold text-slate-800">
                    {work.updatedAt}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800">진행 체크</h2>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                {work.checklist.map((item) => (
                  <li key={item} className="rounded-2xl bg-slate-50 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800">한줄 메모</h2>
              <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                {work.note}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}