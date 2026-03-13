const features = [
  {
    title: "도안 공유 & 판매",
    desc: "무료 도안을 나누고, 나중에는 유료 도안까지 연결해서 나만의 뜨개 작업을 소개할 수 있어.",
    badge: "PATTERN",
    badgeClass: "bg-[#f4eadf] text-[#8b725d]",
  },
  {
    title: "작품 기록장",
    desc: "사용한 실, 바늘 호수, 진행률, 완성 사진까지 내 뜨개 작업을 차곡차곡 남길 수 있어.",
    badge: "RECORD",
    badgeClass: "bg-[#eef4ee] text-[#6f856f]",
  },
  {
    title: "커뮤니티",
    desc: "완성작 자랑, 질문, 팁 공유, 같이 뜨기 모집까지 뜨개하는 사람들끼리 편하게 소통할 수 있어.",
    badge: "COMMUNITY",
    badgeClass: "bg-white text-[#7a6d61] border border-[#e8ddd0]",
  },
];

export default function FeatureSection() {
  return (
    <section>
      <div className="mb-8">
        <h3 className="text-3xl font-black tracking-[-0.02em] text-[#3f342b]">
          이런 기능이 들어갈 거야
        </h3>
        <p className="mt-2 text-[#74695f]">
          도안, 기록, 공유, 판매까지 뜨개 생활에 필요한 흐름을 한곳에 담고 싶어.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="rounded-[2rem] border border-[#eee3d7] bg-white/80 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${feature.badgeClass}`}
            >
              {feature.badge}
            </div>

            <h4 className="mt-4 text-xl font-bold text-[#4a3d33]">
              {feature.title}
            </h4>
            <p className="mt-3 text-sm leading-7 text-[#74695f]">
              {feature.desc}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}