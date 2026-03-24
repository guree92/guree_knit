"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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

  return (
    <section className={styles.mainCollectionsGrid}>
      <section className={styles.popularShowcase}>
        <div className={styles.sectionIntro}>
          <div>
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
                    <span className={styles.popularMetaTags}>
                      <span className={styles.popularMetaTag}>{pattern.category ?? "기타"}</span>
                      <span className={styles.popularMetaTag}>{pattern.level ?? "난이도 미정"}</span>
                    </span>
                    <span className={styles.popularLikeCount}>♥ {pattern.like_count ?? 0}</span>
                  </p>
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
      </div>
    </section>
  );
}
