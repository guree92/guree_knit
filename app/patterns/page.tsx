"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { patternCategories } from "@/data/patterns";
import {
  getPatternImageUrl,
  getPatterns,
  type PatternItem,
} from "@/lib/patterns";

export default function PatternsPage() {
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof patternCategories)[number]>("전체");
  const [keyword, setKeyword] = useState("");
  const [patternItems, setPatternItems] = useState<PatternItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPatterns() {
      try {
        const data = await getPatterns();
        setPatternItems(data);
      } catch (error) {
        console.error("도안 목록 불러오기 실패", error);
      } finally {
        setLoading(false);
      }
    }

    loadPatterns();
  }, []);

  const filteredCards = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase();

    return patternItems.filter((card) => {
      const matchesCategory =
        selectedCategory === "전체" || card.category === selectedCategory;

      const matchesKeyword =
        lowerKeyword.length === 0 ||
        card.title.toLowerCase().includes(lowerKeyword) ||
        card.description.toLowerCase().includes(lowerKeyword) ||
        card.category.toLowerCase().includes(lowerKeyword) ||
        card.level.toLowerCase().includes(lowerKeyword) ||
        (card.author_nickname ?? "").toLowerCase().includes(lowerKeyword);

      return matchesCategory && matchesKeyword;
    });
  }, [patternItems, selectedCategory, keyword]);

  return (
    <main className="min-h-screen bg-[#fcfaf6] px-6 py-8 text-[#4b3a2f] md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Header />

        <section className="mt-12">
          <div className="overflow-hidden rounded-[2.25rem] border border-[#e6ddd2] bg-[#f8f4ee] p-8 shadow-[0_10px_30px_rgba(91,74,60,0.06)] md:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex rounded-full border border-[#d9d0c6] bg-[#fdfaf6] px-4 py-2 text-sm font-semibold text-[#8f7a67]">
                  PATTERNS
                </div>

                <h1 className="mt-5 text-4xl font-black leading-tight text-[#4a392f] md:text-5xl">
                  도안 둘러보기
                </h1>

                <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#756457] md:text-base">
                  코바늘, 대바늘, 소품부터 가방까지
                  <br className="hidden sm:block" />
                  Knit.GUREE의 도안을 차분한 톤으로 한눈에 모아볼 수 있어.
                </p>
              </div>

              <Link
                href="/patterns/new"
                className="inline-flex items-center justify-center rounded-[1.3rem] bg-[#96a792] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(150,167,146,0.28)] transition hover:-translate-y-0.5 hover:bg-[#879a83] hover:shadow-[0_14px_28px_rgba(150,167,146,0.34)]"
              >
                + 도안 등록
              </Link>
            </div>

            <div className="mt-7">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="도안 이름, 작성자, 난이도, 카테고리 검색"
                className="w-full rounded-[1.5rem] border border-[#ddd3c8] bg-[#fffdf9] px-5 py-3.5 text-sm text-[#4b3a2f] outline-none transition placeholder:text-[#aa9a8c] focus:border-[#9aaa97] focus:ring-4 focus:ring-[#dfe7db]"
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
                      "rounded-full px-4 py-2.5 text-sm font-semibold transition",
                      isActive
                        ? "border border-[#96a792] bg-[#96a792] text-white shadow-[0_8px_20px_rgba(150,167,146,0.28)]"
                        : "border border-[#ddd3c8] bg-[#fdfaf6] text-[#6f6054] shadow-sm hover:-translate-y-0.5 hover:bg-[#f6f1ea]",
                    ].join(" ")}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            <div className="rounded-full border border-[#ddd3c8] bg-[#fdfaf6] px-4 py-2 text-sm font-medium text-[#7a6a5d] shadow-sm">
              결과 {filteredCards.length}개
            </div>
          </div>

          {loading ? (
            <div className="mt-8 rounded-[2rem] border border-[#e3d9cd] bg-[#f8f4ee] px-6 py-14 text-center shadow-sm">
              <p className="text-sm text-[#8f7f73]">도안 불러오는 중...</p>
            </div>
          ) : filteredCards.length > 0 ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredCards.map((card, index) => {
                const imageUrl = getPatternImageUrl(card.image_path);

                return (
                  <Link
                    key={card.id}
                    href={`/patterns/${card.id}`}
                    className="group overflow-hidden rounded-[2rem] border border-[#e3d9cd] bg-[#fffdf9] shadow-[0_10px_24px_rgba(91,74,60,0.05)] transition hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(91,74,60,0.09)]"
                  >
                    <div className="overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={card.title}
                          className="h-48 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div
                          className={`h-48 ${
                            index % 3 === 0
                              ? "bg-[linear-gradient(135deg,#f3ede4_0%,#e4ebe2_55%,#f8f4ee_100%)]"
                              : index % 3 === 1
                              ? "bg-[linear-gradient(135deg,#f7f1ea_0%,#ece7df_50%,#e3ebe5_100%)]"
                              : "bg-[linear-gradient(135deg,#e9efe8_0%,#f5efe6_52%,#f8f4ee_100%)]"
                          }`}
                        />
                      )}
                    </div>

                    <div className="p-5">
                      <div className="mb-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-[#d7ddd2] bg-[#edf3ea] px-3 py-1 font-semibold text-[#6f8669]">
                          {card.level}
                        </span>
                        <span className="rounded-full border border-[#e4d7cb] bg-[#f6eee6] px-3 py-1 font-semibold text-[#8b725d]">
                          {card.category}
                        </span>
                      </div>

                      <h2 className="text-xl font-black text-[#4a392f] transition group-hover:text-[#6f8669]">
                        {card.title}
                      </h2>

                      <p className="mt-2 text-sm text-[#8b7b6e]">
                        작성자 · {card.author_nickname ?? "알 수 없음"}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-[#77685d]">
                        {card.description}
                      </p>

                      <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[#8b7b6e]">
                        <span>🤍</span>
                        <span>{card.like_count ?? 0}</span>
                      </div>

                      <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#6f8669]">
                        상세 보기
                        <span className="transition group-hover:translate-x-1">
                          →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-[2rem] border border-dashed border-[#d9cec2] bg-[#f8f4ee] px-6 py-14 text-center shadow-sm">
              <p className="text-lg font-bold text-[#5a493d]">
                검색 결과가 없어
              </p>
              <p className="mt-2 text-sm text-[#8b7b6e]">
                다른 검색어나 카테고리로 다시 찾아봐.
              </p>

              <Link
                href="/patterns/new"
                className="mt-6 inline-flex items-center justify-center rounded-[1.3rem] bg-[#96a792] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(150,167,146,0.28)] transition hover:bg-[#879a83]"
              >
                새 도안 등록하러 가기
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}