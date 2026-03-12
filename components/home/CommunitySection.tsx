export default function CommunitySection() {
  return (
    <section className="mt-20 mb-20">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[2rem] bg-slate-800 p-8 text-white shadow-xl">
          <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
            COMMUNITY
          </div>

          <h3 className="mt-4 text-3xl font-black">
            함께 뜨면
            <br />
            더 오래, 더 재밌게
          </h3>

          <p className="mt-4 max-w-xl leading-7 text-white/80">
            질문하고, 팁을 공유하고, 완성작을 자랑하고, 같이 뜨기까지.
            혼자 뜨는 시간도 좋지만 함께하면 더 즐거운 뜨개 생활이 될 거야.
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-sm">
          <div className="inline-flex rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
            MY RECORD
          </div>

          <h3 className="mt-4 text-3xl font-black text-slate-800">
            내 작품 기록도
            <br />
            예쁘게 남길 수 있게
          </h3>

          <p className="mt-4 leading-7 text-slate-600">
            사용한 실, 바늘 호수, 수정한 부분, 완성 날짜, 사진까지 정리해두면
            나중에 다시 같은 작품을 만들 때도 훨씬 편해져.
          </p>
        </div>
      </div>
    </section>
  );
}