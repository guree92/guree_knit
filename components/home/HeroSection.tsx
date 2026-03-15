import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="grid w-full items-center gap-10 lg:grid-cols-2 lg:gap-12">
      <div className="flex flex-col justify-center">
        <div className="mb-5 inline-flex w-fit rounded-full border border-[#e9dfd2] bg-[#fffdfa] px-4 py-2 text-sm font-medium text-[#7d7064] shadow-sm">
          뜨개하는 사람들을 위한 아늑한 홈
        </div>

        <h2 className="max-w-[640px] text-[2.9rem] font-extrabold leading-[1.08] tracking-[-0.04em] text-[#3f342c] md:text-[4.3rem]">
          도안을 <span className="text-[#859b86]">나누고</span>
          <br />
          작품을 <span className="text-[#859b86]">기록하고</span>
          <br />
          함께 뜨는 공간
        </h2>

        <p className="mt-5 max-w-[640px] text-base leading-8 text-[#786d63] md:text-lg">
          도안을 공유하고, 내가 뜬 작품을 예쁘게 저장하고, 서로의 완성작을
          구경하고, 나중에는 판매까지 연결할 수 있는 뜨개 전용 뜨개마당을
          만들고 있어.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full border border-[#d9e4da] bg-[#eef4ee] px-3 py-1 text-sm font-medium text-[#6f856f]">
            도안 공유
          </span>
          <span className="rounded-full border border-[#ebe1d5] bg-[#faf5ef] px-3 py-1 text-sm font-medium text-[#8a725d]">
            작품 기록
          </span>
          <span className="rounded-full border border-[#d9e4da] bg-[#eef4ee] px-3 py-1 text-sm font-medium text-[#6f856f]">
            뜨개마당
          </span>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dot-maker"
            className="rounded-2xl bg-[#8ca08b] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#e1ebe2] transition hover:-translate-y-0.5 hover:bg-[#7d927d]"
          >
            도트메이커 시작하기
          </Link>

          <Link
            href="/patterns"
            className="rounded-2xl border border-[#e7ddd1] bg-white px-5 py-3 text-sm font-semibold text-[#5b4f45] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fffdfa] hover:shadow-md"
          >
            도안 둘러보기
          </Link>
        </div>
      </div>

      <div className="grid gap-4 rounded-[2.2rem] border border-[#eee6dc] bg-white p-5 shadow-[0_20px_60px_rgba(100,82,65,0.10)]">
        <div className="rounded-[1.75rem] bg-[#f8f2eb] p-5">
          <div className="mb-3 text-sm font-semibold text-[#8b725d]">
            오늘의 추천 도안
          </div>

          <div className="rounded-[1.45rem] border border-[#f0e8df] bg-white p-4 shadow-sm">
            <div className="text-lg font-bold text-[#453a31]">
              튤립 코스터 세트
            </div>
            <div className="mt-1 text-sm text-[#8b7d70]">
              코바늘 · 초급 · 30분 완성
            </div>
            <div className="mt-4 h-28 rounded-[1.25rem] bg-[linear-gradient(135deg,#f8efe6,#eef4ee,#fcf8f2)]" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.45rem] border border-[#dde7de] bg-[#f1f6f1] p-4">
            <div className="text-sm font-medium text-[#6f856f]">저장한 작품</div>
            <div className="mt-2 text-3xl font-black text-[#3f342c]">12</div>
          </div>

          <div className="rounded-[1.45rem] border border-[#ece1d5] bg-[#faf3eb] p-4">
            <div className="text-sm font-medium text-[#8b725d]">
              오늘 올라온 글
            </div>
            <div className="mt-2 text-3xl font-black text-[#3f342c]">38</div>
          </div>
        </div>
      </div>
    </section>
  );
}
