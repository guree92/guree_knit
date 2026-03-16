"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FAVORITE_PATTERNS_CHANGED_EVENT,
  getFavoritePatterns,
  type FavoritePatternCard,
} from "@/lib/favorite-patterns";
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

type Props = {
  topPatterns: MainPatternCard[];
  progressItems: MainProgressItem[];
};

export default function HomeMainCollectionsClient({ topPatterns, progressItems }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [favoritePatterns, setFavoritePatterns] = useState<FavoritePatternCard[]>([]);
  const [isCompactTabletViewport, setIsCompactTabletViewport] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
    async function syncAuthStatus() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsLoggedIn(Boolean(user));
    }

    void syncAuthStatus();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    async function loadFavoritePatterns() {
      try {
        const rows = await getFavoritePatterns();
        setFavoritePatterns(rows);
      } catch (error) {
        console.error("찜한 도안을 불러오지 못했어요.", error);
        setFavoritePatterns([]);
      }
    }

    function handleFavoritesChanged() {
      void loadFavoritePatterns();
    }

    void loadFavoritePatterns();
    window.addEventListener(FAVORITE_PATTERNS_CHANGED_EVENT, handleFavoritesChanged);

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void loadFavoritePatterns();
    });

    return () => {
      window.removeEventListener(FAVORITE_PATTERNS_CHANGED_EVENT, handleFavoritesChanged);
      listener.subscription.unsubscribe();
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

          {isLoggedIn ? (
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
          ) : (
            <div className={styles.favoriteFeatureEmpty}>
              <p>로그인을 해주세요.</p>
            </div>
          )}
        </section>

        <section className={styles.favoriteFeatureCard}>
          <div className={styles.sideSectionHeader}>
            <div>
              <p className={styles.sideSectionEyebrow}>FAVORITES</p>
              <h2 className={styles.sideSectionTitle}>찜한 도안</h2>
            </div>
            <Link href="/patterns/favorites" className={styles.sideSectionLink}>
              전체 보기
            </Link>
          </div>

          {isLoggedIn ? (
            favoritePatterns.length > 0 ? (
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
                <span>도안 상세에서 찜하기를 누르면 계정별로 여기에 모아볼 수 있어요.</span>
              </div>
            )
          ) : (
            <div className={styles.favoriteFeatureList}>
              <div className={styles.favoriteFeatureEmpty}>
                <p>로그인을 해주세요.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
