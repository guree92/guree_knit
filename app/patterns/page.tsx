"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { patternCategories, patternItems } from "@/data/patterns";

export default function PatternsPage() {
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [keyword, setKeyword] = useState("");

  const filteredCards = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase();

    return patternItems.filter((card) => {
      const matchesCategory =
        selectedCategory === "전체" || card.category === selectedCategory;

      const matchesKeyword =
        lowerKeyword.length === 0 ||
        card.title.toLowerCase().includes(lowerKeyword) ||
        card.desc.toLowerCase().includes(lowerKeyword) ||
        card.category.toLowerCase().includes(lowerKeyword) ||
        card.level.toLowerCase().includes(lowerKeyword);

      return matchesCategory && matchesKeyword;
    });
  }, [selectedCategory, keyword]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8f4ff_48%,#eef8f2_100%)] px-6 py-8 text-slate-800 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Header />

        <section className="mt-12">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-sm backdrop-blur">
            <div className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">
              PATTERNS
            </div>

            <h1 className="mt-4 text-4xl font-black text-slate-800">
              도안 모아보기
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-slate-600">
              초보부터 숙련자까지 다양한 뜨개 도안을 한눈에 보고,
              만들고 싶은 작품을 카테고리별로 찾아볼 수 있는 페이지야.
            </p>

            <div className="mt-6">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="도안 이름, 난이도, 카테고리 검색"
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              {patternCategories.map((item) => {
                const isActive = selectedCategory === item;

                return (
                  <button
                    key={item}
                    onClick={() => setSelectedCategory(item)}
                    className={[
                      "rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition",
                      isActive
                        ? "bg-violet-500 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:shadow-md",
                    ].join(" ")}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
              결과 {filteredCards.length}개
            </div>
          </div>

          {filteredCards.length > 0 ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredCards.map((card, index) => (
                <Link
                  key={card.id}
                  href={`/patterns/${card.id}`}
                  className="overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div
                    className={`h-40 ${
                      index % 3 === 0
                        ? "bg-[linear-gradient(135deg,#efe7ff,#edf9ef,#fff2e6)]"
                        : index % 3 === 1
                        ? "bg-[linear-gradient(135deg,#fff0f5,#f3f7ff,#eefbf4)]"
                        : "bg-[linear-gradient(135deg,#eef8ff,#f5f0ff,#fff8ef)]"
                    }`}
                  />
                  <div className="p-5">
                    <div className="mb-3 flex gap-2 text-xs">
                      <span className="rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-700">
                        {card.level}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
                        {card.category}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-800">
                      {card.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {card.desc}
                    </p>

                    <div className="mt-4 text-sm font-semibold text-violet-600">
                      상세 보기 →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center shadow-sm">
              <p className="text-lg font-semibold text-slate-700">
                검색 결과가 없어
              </p>
              <p className="mt-2 text-sm text-slate-500">
                다른 검색어나 카테고리로 다시 찾아봐.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}