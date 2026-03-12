const features = [
  {
    title: "도안 모아보기",
    desc: "초보부터 숙련자까지 난이도별 도안을 한눈에 보고 원하는 작품을 찾아볼 수 있어.",
  },
  {
    title: "작품 기록장",
    desc: "사용한 실, 바늘 호수, 진행률, 완성 사진까지 내 뜨개 작업을 차곡차곡 남길 수 있어.",
  },
  {
    title: "커뮤니티",
    desc: "완성작 자랑, 질문, 팁 공유, 같이 뜨기 모집까지 뜨개하는 사람들끼리 편하게 소통할 수 있어.",
  },
];

export default function FeatureSection() {
  return (
    <section className="mt-20">
      <div className="mb-8">
        <h3 className="text-3xl font-black text-slate-800">이런 기능이 있어</h3>
        <p className="mt-2 text-slate-600">
          뜨개하는 사람들이 자주 찾는 기능을 한곳에 모아둘 거야.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-sm"
          >
            <h4 className="text-xl font-bold text-slate-800">{feature.title}</h4>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {feature.desc}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}