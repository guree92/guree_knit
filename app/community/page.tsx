import Header from "@/components/layout/Header";

const posts = [
  {
    category: "완성작",
    title: "첫 인형 뜨개 완성했어!",
    author: "ribbie",
    preview: "생각보다 시간이 오래 걸렸지만 너무 귀엽게 나와서 만족해.",
  },
  {
    category: "질문",
    title: "코바늘 6호로 네트백 뜨면 너무 흐물할까?",
    author: "knitday",
    preview: "실이 얇은 편인데 바늘 호수를 어느 정도로 잡아야 할지 고민이야.",
  },
  {
    category: "팁공유",
    title: "실 정리 깔끔하게 하는 방법",
    author: "woolnote",
    preview: "남은 실이 많아질 때 나는 이렇게 보관해두고 있어.",
  },
  {
    category: "같이뜨기",
    title: "봄 코스터 같이 뜰 사람 구해요",
    author: "momo",
    preview: "난이도는 쉬운 편이라 초보도 같이 할 수 있어.",
  },
];

export default function CommunityPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8f4ff_50%,#eef8f2_100%)] px-6 py-10 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <Header />

        <section className="mt-12">
          <div className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-sm">
            <div className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              COMMUNITY
            </div>

            <h1 className="mt-4 text-4xl font-black text-slate-800">
              커뮤니티
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-slate-600">
              완성작 자랑, 질문, 팁 공유, 같이 뜨기 모집까지
              뜨개하는 사람들끼리 편하게 소통할 수 있는 공간이야.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {["전체", "완성작", "질문", "팁공유", "같이뜨기"].map((item) => (
              <button
                key={item}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-8 space-y-4">
            {posts.map((post) => (
              <article
                key={post.title}
                className="rounded-[2rem] border border-white/60 bg-white/90 p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                    {post.category}
                  </span>
                  <span className="text-sm text-slate-400">@{post.author}</span>
                </div>

                <h2 className="mt-4 text-xl font-bold text-slate-800">
                  {post.title}
                </h2>
                <p className="mt-2 leading-7 text-slate-600">{post.preview}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}