import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import Header from "@/components/layout/Header";
import FavoritePatternsClient from "./FavoritePatternsClient";
import FavoritesExplorePanel from "./FavoritesExplorePanel";
import { isFavoritePatternsTableMissingError } from "@/lib/favorite-patterns";
import { type PatternItem } from "@/lib/patterns";
import { createClient as createServerClient } from "@/lib/supabase/server";
import styles from "./favorites-page.module.css";
import heroHeaderImage from "../../../Image/headerlogo.png";

type FavoriteRow = {
  pattern_id: string;
  created_at: string | null;
};

type FavoritePatternsPageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

function FavoritesFrame({
  mainContent,
  sideContent,
}: {
  mainContent: ReactNode;
  sideContent?: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Header />

        <section className={styles.heroPanel}>
          <div className={styles.heroCopy}>
            <div className={styles.heroTitleImage}>
              <Image
                src={heroHeaderImage}
                alt="Hero header"
                priority
                unoptimized
                className={styles.heroTitleImageAsset}
              />
            </div>
          </div>
        </section>

        <section className={styles.workspace}>
          <div className={styles.mainColumn}>{mainContent}</div>
          {sideContent ? <aside className={styles.sideColumn}>{sideContent}</aside> : null}
        </section>
      </div>
    </main>
  );
}

export default async function FavoritePatternsPage({ searchParams }: FavoritePatternsPageProps) {
  const supabase = await createServerClient();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedPage = Number.parseInt(resolvedSearchParams?.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const returnTo = page === 1 ? "/patterns/favorites" : `/patterns/favorites?page=${page}`;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <FavoritesFrame
        mainContent={
          <section className={styles.feedbackShell}>
            <div className={styles.feedbackCard}>
              <h1 className={styles.feedbackTitle}>찜한 도안은 로그인 후 확인할 수 있어요.</h1>
              <div className={styles.feedbackActions}>
                <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} className={styles.primaryAction}>
                  로그인하기
                </Link>
                <Link href="/patterns" className={styles.secondaryLinkAction}>
                  도안 둘러보기
                </Link>
              </div>
            </div>
          </section>
        }
      />
    );
  }

  const { data: favoriteRows, error: favoriteError } = await supabase
    .from("pattern_favorites")
    .select("pattern_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (favoriteError) {
    if (isFavoritePatternsTableMissingError(favoriteError)) {
      return (
        <FavoritesFrame
          mainContent={
            <section className={styles.feedbackShell}>
              <div className={styles.feedbackCard}>
                <h1 className={styles.feedbackTitle}>찜 기능이 아직 준비되지 않았어요.</h1>
                <p className={styles.feedbackDescription}>
                  Supabase에 `pattern_favorites` 테이블을 만들면 계정별 보관함을 바로 사용할 수 있어요.
                </p>
                <div className={styles.feedbackActions}>
                  <Link href="/patterns" className={styles.secondaryLinkAction}>
                    도안 목록으로
                  </Link>
                </div>
              </div>
            </section>
          }
        />
      );
    }

    throw new Error(favoriteError.message);
  }

  const orderedFavorites = (favoriteRows ?? []) as FavoriteRow[];
  const favoriteIds = orderedFavorites.map((row) => row.pattern_id);
  let favoritePatterns: PatternItem[] = [];

  if (favoriteIds.length > 0) {
    const { data: patternRows, error: patternError } = await supabase
      .from("patterns")
      .select("*")
      .in("id", favoriteIds)
      .eq("is_hidden", false);

    if (patternError) {
      throw new Error(patternError.message);
    }

    const patternItems = (patternRows ?? []) as PatternItem[];
    const userIds = Array.from(new Set(patternItems.map((item) => item.user_id).filter(Boolean))) as string[];
    let nicknameMap = new Map<string, string | null>();

    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, nickname")
        .in("id", userIds);

      if (profileError) {
        throw new Error(profileError.message);
      }

      nicknameMap = new Map(
        ((profiles ?? []) as Array<{ id: string; nickname: string | null }>).map((profile) => [
          profile.id,
          profile.nickname,
        ])
      );
    }

    const patternMap = new Map(
      patternItems.map((item) => [
        item.id,
        {
          ...item,
          author_nickname: item.user_id ? nicknameMap.get(item.user_id) ?? null : null,
        },
      ])
    );

    favoritePatterns = favoriteIds.reduce<PatternItem[]>((items, favoriteId) => {
      const pattern = patternMap.get(favoriteId);

      if (pattern) {
        items.push(pattern);
      }

      return items;
    }, []);
  }

  const favoritePatternItems = favoritePatterns.map((pattern) => ({
    ...pattern,
    saved_at: orderedFavorites.find((row) => row.pattern_id === pattern.id)?.created_at ?? null,
  }));

  const explorePanel = <FavoritesExplorePanel initialItems={favoritePatternItems} />;

  const collectionPanel = (
    <section className={styles.sidePanel}>
      <h2 className={styles.sideTitle}>찜한 도안</h2>

      <div className={styles.sideInfoList}>
        <div className={styles.sideInfoItem}>
          <span>총 보관 수</span>
          <strong>{favoritePatterns.length.toLocaleString()}개</strong>
        </div>
      </div>

      <p className={styles.sideDescription}>
        마음에 드는 도안을 모아두고 다음 작업 후보를 빠르게 찾아보세요.
      </p>

      <div className={styles.sideActions}>
        <Link href="/patterns" className={styles.sideLink}>
          전체 도안 보기
        </Link>
        <Link href="/patterns/new" className={styles.sideLink}>
          도안 등록
        </Link>
      </div>
    </section>
  );

  return (
    <FavoritesFrame
      mainContent={
        <>
          <section className={styles.hero}>
            <div className={styles.heroTop}>
              <div className={styles.heroIntro}>
                <h1 className={styles.heroTitle}>찜한 도안</h1>
                <p className={styles.heroDescription}>
                  저장한 도안을 한곳에서 확인하고, 다음 뜨개 작업을 더 빠르게 시작해 보세요.
                </p>
              </div>
              <div className={`${styles.heroActions} ${styles.heroActionsInline}`}>
                <Link href="/patterns" className={styles.secondaryLinkAction}>
                  전체 도안
                </Link>
                <Link href="/patterns/new" className={styles.primaryAction}>
                  도안 등록
                </Link>
              </div>
            </div>
          </section>

          <div className={styles.mobileCollectionPanel}>{explorePanel}</div>
          <div className={styles.mobileCollectionPanel}>{collectionPanel}</div>

          <section className={`${styles.sectionBlock} ${styles.favoritesListSection}`}>
            <FavoritePatternsClient initialItems={favoritePatternItems} initialPage={page} />
          </section>
        </>
      }
      sideContent={
        <>
          {explorePanel}
          {collectionPanel}
        </>
      }
    />
  );
}
