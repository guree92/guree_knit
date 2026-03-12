"use client";

import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";

type PostCategory = "완성작" | "질문" | "팁공유" | "같이뜨기";

type CommunityPost = {
  id: number;
  category: PostCategory;
  title: string;
  author: string;
  preview: string;
};

const categories = ["전체", "완성작", "질문", "팁공유", "같이뜨기"] as const;

const initialPosts: CommunityPost[] = [
  {
    id: 1,
    category: "완성작",
    title: "첫 인형 뜨개 완성했어!",
    author: "ribbie",
    preview: "생각보다 시간이 오래 걸렸지만 너무 귀엽게 나와서 만족해.",
  },
  {
    id: 2,
    category: "질문",
    title: "코바늘 6호로 네트백 뜨면 너무 흐물할까?",
    author: "knitday",
    preview: "실이 얇은 편인데 바늘 호수를 어느 정도로 잡아야 할지 고민이야.",
  },
  {
    id: 3,
    category: "팁공유",
    title: "실 정리 깔끔하게 하는 방법",
    author: "woolnote",
    preview: "남은 실이 많아질 때 나는 이렇게 보관해두고 있어.",
  },
  {
    id: 4,
    category: "같이뜨기",
    title: "봄 코스터 같이 뜰 사람 구해요",
    author: "momo",
    preview: "난이도는 쉬운 편이라 초보도 같이 할 수 있어.",
  },
];

export default function CommunityPage() {
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof categories)[number]>("전체");
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [isWriting, setIsWriting] = useState(false);

  const [writeCategory, setWriteCategory] = useState<PostCategory>("완성작");
  const [writeTitle, setWriteTitle] = useState("");
  const [writeContent, setWriteContent] = useState("");

  const filteredPosts = useMemo(() => {
    if (selectedCategory === "전체") return posts;
    return posts.filter((post) => post.category === selectedCategory);
  }, [posts, selectedCategory]);

  const handleOpenWrite = () => {
    setIsWriting(true);
  };

  const handleCancelWrite = () => {
    setIsWriting(false);
    setWriteCategory("완성작");
    setWriteTitle("");
    setWriteContent("");
  };

  const handleSubmitPost = () => {
    const title = writeTitle.trim();
    const content = writeContent.trim();

    if (!title || !content) {
      alert("제목과 내용을 모두 입력해줘.");
      return;
    }

    const newPost: CommunityPost = {
      id: Date.now(),
      category: writeCategory,
      title,
      author: "me",
      preview: content,
    };

    setPosts((prev) => [newPost, ...prev]);
    handleCancelWrite();
    setSelectedCategory("전체");
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8f4ff_48%,#eef8f2_100%)] px-6 py-8 text-slate-800 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Header />

        <section className="mt-12">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-sm backdrop-blur">
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

            <div className="mt-6">
              {!isWriting ? (
                <button
                  onClick={handleOpenWrite}
                  className="rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  글쓰기
                </button>
              ) : (
                <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        카테고리
                      </label>
                      <select
                        value={writeCategory}
                        onChange={(e) =>
                          setWriteCategory(e.target.value as PostCategory)
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                      >
                        <option value="완성작">완성작</option>
                        <option value="질문">질문</option>
                        <option value="팁공유">팁공유</option>
                        <option value="같이뜨기">같이뜨기</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        제목
                      </label>
                      <input
                        type="text"
                        value={writeTitle}
                        onChange={(e) => setWriteTitle(e.target.value)}
                        placeholder="제목을 입력해줘"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      내용
                    </label>
                    <textarea
                      value={writeContent}
                      onChange={(e) => setWriteContent(e.target.value)}
                      placeholder="내용을 입력해줘"
                      rows={5}
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={handleSubmitPost}
                      className="rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      등록하기
                    </button>

                    <button
                      onClick={handleCancelWrite}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {categories.map((item, index) => (
              <button
                key={item}
                onClick={() => setSelectedCategory(item)}
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition",
                  selectedCategory === item
                    ? "bg-slate-800 text-white"
                    : index === 0
                    ? "border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:shadow-md"
                    : "border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:shadow-md",
                ].join(" ")}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-8 space-y-4">
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
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
              ))
            ) : (
              <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center shadow-sm">
                <p className="text-lg font-semibold text-slate-700">
                  아직 이 카테고리 글이 없어
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  첫 글을 직접 남겨봐.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}