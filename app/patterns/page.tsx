"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { patternCategories } from "@/data/patterns";
import { getPatternImageUrl, getPatterns, type PatternItem } from "@/lib/patterns";
import styles from "./patterns-page.module.css";

function formatPatternDate(value?: string) {
  if (!value) return "날짜 미정";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 미정";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function makePreview(content: string, maxLength = 92) {
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength)}...`;
}

function getLevelLabel(level: string) {
  if (level.includes("초") || level.includes("珥")) return "입문";
  if (level.includes("중") || level.includes("以")) return "중급";
  if (level.includes("고") || level.includes("怨")) return "심화";
  return level;
}

export default function PatternsPage() {
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof patternCategories)[number]>(patternCategories[0]);
  const [keyword, setKeyword] = useState("");
  const [patternItems, setPatternItems] = useState<PatternItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPatterns() {
      try {
        const data = await getPatterns();
        setPatternItems(data);
      } catch (error) {
        console.error("도안 목록을 불러오지 못했어요.", error);
        alert("도안 목록을 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    }

    loadPatterns();
  }, []);

  const filteredPatterns = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase();

    return patternItems.filter((card) => {
      const matchesCategory =
        selectedCategory === patternCategories[0] || card.category === selectedCategory;

      if (!matchesCategory) return false;
      if (!lowerKeyword) return true;

      const targetText = [
        card.title,
        card.description,
        card.category,
        card.level,
        card.author_nickname ?? "",
        card.yarn,
      ]
        .join(" ")
        .toLowerCase();

      return targetText.includes(lowerKeyword);
    });
  }, [keyword, patternItems, selectedCategory]);

  const featuredPatterns = filteredPatterns.slice(0, 3);
  const archivePatterns = filteredPatterns.slice(0, 6);
  const compactPatterns = filteredPatterns.slice(0, 5);
  const hasSearch = keyword.trim().length > 0;
  const totalLikes = useMemo(
    () => patternItems.reduce((sum, item) => sum + (item.like_count ?? 0), 0),
    [patternItems]
  );
  const newestPattern = filteredPatterns[0] ?? patternItems[0] ?? null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Header />

        <section className={styles.workspace}>
          <div className={styles.mainColumn}>
            <section className={styles.hero}>
              <div className={styles.heroTop}>
                <div className={styles.heroBadge}>Pattern Archive</div>
                <Link href="/patterns/new" className={styles.primaryAction}>
                  도안 등록
                </Link>
              </div>

              <div className={styles.heroIntro}>
                <div>
                  <h1 className={styles.heroTitle}>도안 라이브러리</h1>
                  <p className={styles.heroDescription}>
                    메인 화이트 톤 위에 세이지그린과 베이지 포인트만 남겨,
                    필요한 정보는 빠르게 찾고 도안은 더 부드럽게 둘러볼 수 있게 정리했어요.
                  </p>
                </div>
              </div>

              <div className={styles.filterPanel}>
                <div className={styles.searchRow}>
                  <label htmlFor="pattern-search" className={styles.searchLabel}>
                    도안 검색
                  </label>
                  <div className={styles.searchBox}>
                    <input
                      id="pattern-search"
                      type="text"
                      value={keyword}
                      onChange={(event) => setKeyword(event.target.value)}
                      placeholder="도안 이름, 설명, 작성자, 재료로 검색해 보세요"
                      className={styles.searchInput}
                    />

                    {hasSearch ? (
                      <button type="button" onClick={() => setKeyword("")} className={styles.clearButton}>
                        지우기
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className={styles.categoryList}>
                  {patternCategories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSelectedCategory(item)}
                      className={selectedCategory === item ? styles.categoryChipActive : styles.categoryChip}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.sectionEyebrow}>Featured</p>
                  <h2 className={styles.sectionTitle}>추천 도안</h2>
                </div>
                <span className={styles.sectionMeta}>현재 {filteredPatterns.length}개 표시 중</span>
              </div>

              {loading ? (
                <div className={styles.feedbackCard}>
                  <p className={styles.feedbackTitle}>도안을 불러오는 중이에요.</p>
                  <p className={styles.feedbackDescription}>추천 도안을 정리하고 있어요.</p>
                </div>
              ) : featuredPatterns.length > 0 ? (
                <div className={styles.featuredGrid}>
                  {featuredPatterns.map((card, index) => {
                    const imageUrl = getPatternImageUrl(card.image_path);

                    return (
                      <Link
                        key={card.id}
                        href={`/patterns/${card.id}`}
                        className={index === 0 ? styles.featuredCardAccent : styles.featuredCard}
                      >
                        <div className={styles.featuredCardHeader}>
                          <div>
                            <p className={styles.featuredLabel}>Shared with knitters</p>
                            <div className={styles.avatarRow}>
                              <span className={styles.avatarBubble}>K</span>
                              <span className={styles.avatarBubble}>G</span>
                              <span className={styles.avatarBubble}>N</span>
                            </div>
                          </div>
                          <span className={styles.featuredLevel}>{getLevelLabel(card.level)}</span>
                        </div>

                        <div className={styles.featuredBody}>
                          <p className={styles.featuredMeta}>CATEGORY</p>
                          <h3 className={styles.featuredTitle}>{card.title}</h3>
                          <p className={styles.featuredCaption}>{card.category}</p>
                        </div>

                        {imageUrl ? (
                          <div className={styles.featuredThumbWrap}>
                            <Image
                              src={imageUrl}
                              alt={card.title}
                              fill
                              className={styles.featuredThumb}
                              sizes="(max-width: 960px) 100vw, 30vw"
                            />
                          </div>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.feedbackCard}>
                  <p className={styles.feedbackTitle}>보여줄 추천 도안이 아직 없어요.</p>
                  <p className={styles.feedbackDescription}>검색 조건을 바꾸거나 새 도안을 등록해 보세요.</p>
                </div>
              )}
            </section>

            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.sectionEyebrow}>Archive</p>
                  <h2 className={styles.sectionTitle}>도안 목록</h2>
                </div>
                <span className={styles.sectionMeta}>최근 업데이트 기준</span>
              </div>

              {loading ? (
                <div className={styles.feedbackCard}>
                  <p className={styles.feedbackTitle}>목록을 준비하고 있어요.</p>
                  <p className={styles.feedbackDescription}>도안 정보와 메타 데이터를 정리하는 중이에요.</p>
                </div>
              ) : archivePatterns.length > 0 ? (
                <div className={styles.tableCard}>
                  <div className={styles.tableHeader}>
                    <span>도안</span>
                    <span>난이도</span>
                    <span>업데이트</span>
                    <span>좋아요</span>
                  </div>

                  <div className={styles.tableBody}>
                    {archivePatterns.map((card) => (
                      <Link key={card.id} href={`/patterns/${card.id}`} className={styles.tableRow}>
                        <div className={styles.tablePatternCell}>
                          <div className={styles.tableThumb}>
                            {card.image_path ? (
                              <Image
                                src={getPatternImageUrl(card.image_path)}
                                alt={card.title}
                                fill
                                className={styles.tableThumbImage}
                                sizes="56px"
                              />
                            ) : (
                              <div className={styles.tableThumbFallback} />
                            )}
                          </div>
                          <div className={styles.tablePatternText}>
                            <strong>{card.title}</strong>
                            <span>@{card.author_nickname ?? "닉네임 없음"}</span>
                            <p>{makePreview(card.description, 72)}</p>
                          </div>
                        </div>
                        <span className={styles.tableText}>{card.level}</span>
                        <span className={styles.tableText}>{formatPatternDate(card.created_at)}</span>
                        <span className={styles.tableText}>♥ {card.like_count ?? 0}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.feedbackCard}>
                  <p className={styles.feedbackTitle}>검색 결과가 없어요.</p>
                  <p className={styles.feedbackDescription}>
                    다른 검색어를 입력하거나 카테고리를 바꿔서 다시 찾아보세요.
                  </p>
                  <div className={styles.emptyActions}>
                    {hasSearch ? (
                      <button type="button" onClick={() => setKeyword("")} className={styles.secondaryAction}>
                        검색어 지우기
                      </button>
                    ) : null}
                    {selectedCategory !== patternCategories[0] ? (
                      <button
                        type="button"
                        onClick={() => setSelectedCategory(patternCategories[0])}
                        className={styles.secondaryAction}
                      >
                        전체 카테고리 보기
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </section>

            {compactPatterns.length > 0 ? (
              <section className={styles.sectionBlock}>
                <div className={styles.sectionHeading}>
                  <div>
                    <p className={styles.sectionEyebrow}>Quick Shelf</p>
                    <h2 className={styles.sectionTitle}>빠르게 둘러보기</h2>
                  </div>
                </div>

                <div className={styles.compactRow}>
                  {compactPatterns.map((card) => (
                    <Link key={card.id} href={`/patterns/${card.id}`} className={styles.compactCard}>
                      <span className={styles.compactCategory}>{card.category}</span>
                      <strong className={styles.compactTitle}>{card.title}</strong>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.sidePanel}>
              <div className={styles.sideSearchBox}>
                <span className={styles.sideSearchLabel}>Search archive</span>
                <span className={styles.sideSearchIcon}>⌕</span>
              </div>

              <div className={styles.sideSection}>
                <h2 className={styles.sideTitle}>Statistic</h2>
                <div className={styles.statStack}>
                  <div className={styles.metricCard}>
                    <div>
                      <strong>전체 도안</strong>
                      <span>현재 보관 중</span>
                    </div>
                    <div className={styles.metricCircle}>{patternItems.length}</div>
                  </div>
                  <div className={styles.metricCard}>
                    <div>
                      <strong>검색 결과</strong>
                      <span>현재 필터 기준</span>
                    </div>
                    <div className={styles.metricCircle}>{filteredPatterns.length}</div>
                  </div>
                  <div className={styles.metricCard}>
                    <div>
                      <strong>좋아요 합계</strong>
                      <span>전체 누적 반응</span>
                    </div>
                    <div className={styles.metricCircle}>{totalLikes}</div>
                  </div>
                </div>
              </div>

              <div className={styles.sideSection}>
                <div className={styles.spotlightCard}>
                  <p className={styles.spotlightEyebrow}>Highlight</p>
                  <h3 className={styles.spotlightTitle}>{newestPattern?.title ?? "새 도안을 기다리고 있어요"}</h3>
                  <p className={styles.spotlightText}>
                    {newestPattern
                      ? `${newestPattern.author_nickname ?? "닉네임 없음"}님의 최신 도안이에요.`
                      : "등록된 최신 도안이 아직 없어요."}
                  </p>
                  {newestPattern ? (
                    <Link href={`/patterns/${newestPattern.id}`} className={styles.spotlightAction}>
                      도안 보러 가기
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
