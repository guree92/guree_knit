"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFavoritePatternIds } from "@/lib/favorite-patterns";
import { getPatternImageUrl } from "@/lib/patterns";
import styles from "@/app/home-dashboard.module.css";

export type MainProgressItem = {
  id: string;
  title: string;
  percent: number;
  note: string;
};

export type MainPatternCard = {
  id: string;
  title: string;
  category: string | null;
  level: string | null;
  like_count: number | null;
  image_path: string | null;
  author_nickname?: string | null;
};

type FavoritePatternCard = {
  id: string;
  title: string;
  category: string | null;
  level: string | null;
  like_count: number | null;
  image_path: string | null;
};

type Props = {
  topPatterns: MainPatternCard[];
  progressItems: MainProgressItem[];
};

export default function HomeMainCollectionsClient({ topPatterns, progressItems }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [favoritePatterns, setFavoritePatterns] = useState<FavoritePatternCard[]>([]);
  const [isCompactTabletViewport, setIsCompactTabletViewport] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 641px) and (max-width: 900px)");
    const syncViewport = () => setIsCompactTabletViewport(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    async function loadFavoritePatterns() {
      const favoriteIds = getFavoritePatternIds();

      if (favoriteIds.length === 0) {
        setFavoritePatterns([]);
        return;
      }

      const { data, error } = await supabase
        .from("patterns")
        .select("id, title, category, level, like_count, image_path")
        .in("id", favoriteIds)
        .eq("is_hidden", false);

      if (error) {
        console.error("찜한 도안을 불러오지 못했어요.", error);
        setFavoritePatterns([]);
        return;
      }

      const rows = ((data ?? []) as FavoritePatternCard[]) ?? [];
      const order = new Map(favoriteIds.map((id, index) => [id, index]));
      rows.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
      setFavoritePatterns(rows);
    }

    function handleFavoritesChanged() {
      void loadFavoritePatterns();
    }

    void loadFavoritePatterns();
    window.addEventListener("favorite-patterns-changed", handleFavoritesChanged);
    window.addEventListener("storage", handleFavoritesChanged);

    return () => {
      window.removeEventListener("favorite-patterns-changed", handleFavoritesChanged);
      window.removeEventListener("storage", handleFavoritesChanged);
    };
  }, [supabase]);

  return (
    <section className={styles.mainCollectionsGrid}>
      <section className={styles.popularShowcase}>
        <div className={styles.sectionIntro}>
          <div>
            <p className={styles.sectionEyebrow}>POPULAR PATTERNS</p>
            <h2 className={styles.sectionTitle}>인기 도안</h2>
          </div>
          <Link href="/patterns" className={styles.sectionLink}>
            전체 보기
          </Link>
        </div>

        <div className={styles.popularShowcaseList}>
          {topPatterns.slice(0, isCompactTabletViewport ? 4 : 5).map((pattern, index) => {
            const imageUrl = pattern.image_path ? getPatternImageUrl(pattern.image_path) : "";

            return (
              <Link
                key={pattern.id}
                href={`/patterns/${pattern.id}`}
                className={styles.popularShowcaseCard}
              >
                <div className={styles.popularShowcaseThumb}>
                  <span className={styles.popularShowcaseRank}>{index + 1}</span>
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={pattern.title}
                      fill
                      className={styles.popularShowcaseImage}
                      sizes="(max-width: 900px) 100vw, 240px"
                    />
                  ) : (
                    <div className={styles.popularShowcaseFallback} />
                  )}
                </div>

                <div className={styles.popularShowcaseBody}>
                  <strong>{pattern.title}</strong>
                  <p>
                    {pattern.category ?? "기타"} · {pattern.level ?? "난이도 미정"} · @{pattern.author_nickname ?? "닉네임 없음"}
                  </p>
                  <span>♥ {pattern.like_count ?? 0}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className={styles.mainSupportColumn}>
        <section className={styles.progressFeatureCard}>
          <div className={styles.sideSectionHeader}>
            <div>
              <p className={styles.sideSectionEyebrow}>IN PROGRESS</p>
              <h2 className={styles.sideSectionTitle}>진행 중 작품</h2>
            </div>
          </div>

          <div className={styles.progressFeatureList}>
            {progressItems.map((item) => (
              <article key={item.id} className={styles.progressFeatureItem}>
                <div className={styles.progressFeatureTop}>
                  <strong>{item.title}</strong>
                  <span>{item.percent}%</span>
                </div>
                <div className={styles.progressFeatureBar}>
                  <span className={styles.progressFeatureFill} style={{ width: `${item.percent}%` }} />
                </div>
                <p>{item.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.favoriteFeatureCard}>
          <div className={styles.sideSectionHeader}>
            <div>
              <p className={styles.sideSectionEyebrow}>FAVORITES</p>
              <h2 className={styles.sideSectionTitle}>찜한 도안</h2>
            </div>
            <Link href="/patterns" className={styles.sideSectionLink}>
              도안 보기
            </Link>
          </div>

          {favoritePatterns.length > 0 ? (
            <div className={styles.favoriteFeatureList}>
              {favoritePatterns.slice(0, 3).map((pattern) => {
                const imageUrl = pattern.image_path ? getPatternImageUrl(pattern.image_path) : "";

                return (
                  <Link
                    key={pattern.id}
                    href={`/patterns/${pattern.id}`}
                    className={styles.favoriteFeatureItem}
                  >
                    <div className={styles.favoriteFeatureThumb}>
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={pattern.title}
                          fill
                          className={styles.favoriteFeatureImage}
                          sizes="84px"
                        />
                      ) : (
                        <div className={styles.favoriteFeatureFallback} />
                      )}
                    </div>

                    <div className={styles.favoriteFeatureBody}>
                      <strong>{pattern.title}</strong>
                      <p>
                        {pattern.category ?? "기타"} · {pattern.level ?? "난이도 미정"}
                      </p>
                    </div>

                    <span className={styles.favoriteFeatureLikes}>♥ {pattern.like_count ?? 0}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className={styles.favoriteFeatureEmpty}>
              <p>아직 찜한 도안이 없어요.</p>
              <span>도안 상세에서 `찜하기`를 누르면 여기에 모아볼 수 있어요.</span>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
