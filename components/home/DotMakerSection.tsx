import Link from "next/link";

export default function DotMakerSection() {
  return (
    <section className="mt-20">
      <div className="grid gap-6 rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">
            DOT MAKER
          </div>

          <h3 className="mt-4 text-3xl font-black text-slate-800">
            뜨개 도안용 도트 작품을
            <br />
            직접 만들어보자
          </h3>

          <p className="mt-4 max-w-xl leading-7 text-slate-600">
            원하는 크기의 표를 만들고, 색을 직접 찍고, 줄별 체크도 하면서
            뜨개용 도트를 편하게 제작할 수 있어. 완성한 작품은 PNG로 저장도 가능해.
          </p>

          <div className="mt-6">
            <Link
              href="/dot-maker"
              className="inline-flex rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white"
            >
              도트메이커로 이동
            </Link>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
          <div className="mb-4 text-sm font-semibold text-slate-500">
            미리보기
          </div>

          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex gap-[1px]">
                {Array.from({ length: 6 }).map((__, colIndex) => {
                  const filled =
                    (rowIndex === 1 && colIndex >= 1 && colIndex <= 4) ||
                    (rowIndex === 2 && colIndex >= 2 && colIndex <= 3) ||
                    (rowIndex === 3 && colIndex >= 1 && colIndex <= 4) ||
                    (rowIndex === 4 && colIndex === 2) ||
                    (rowIndex === 4 && colIndex === 3);

                  return (
                    <div
                      key={colIndex}
                      className="h-7 w-7 border border-slate-300"
                      style={{
                        backgroundColor: filled ? "#a78bfa" : "#ffffff",
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}