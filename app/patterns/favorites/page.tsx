import Link from "next/link";
import Header from "@/components/layout/Header";
import FavoritePatternsClient from "./FavoritePatternsClient";
import { isFavoritePatternsTableMissingError } from "@/lib/favorite-patterns";
import { type PatternItem } from "@/lib/patterns";
import { createClient as createServerClient } from "@/lib/supabase/server";
import styles from "./favorites-page.module.css";

type FavoriteRow = {
  pattern_id: string;
  created_at: string | null;
};

type FavoritePatternsPageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

export default async function FavoritePatternsPage({ searchParams }: FavoritePatternsPageProps) {
  const supabase = await createServerClient();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedPage = Number.parseInt(resolvedSearchParams?.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <Header />

          <section className={styles.feedbackShell}>
            <div className={styles.feedbackCard}>
              <p className={styles.sectionEyebrow}>Favorites</p>
              <h1 className={styles.feedbackTitle}>
                {"\ucc1c\ud55c \ub3c4\uc548\uc740 \ub85c\uadf8\uc778 \ud6c4 \ud655\uc778\ud560 \uc218 \uc788\uc5b4\uc694."}
              </h1>
              <div className={styles.feedbackActions}>
                <Link href="/login" className={styles.primaryAction}>
                  {"\ub85c\uadf8\uc778\ud558\uae30"}
                </Link>
                <Link href="/patterns" className={styles.secondaryLinkAction}>
                  {"\ub3c4\uc548 \ub458\ub7ec\ubcf4\uae30"}
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
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
        <main className={styles.page}>
          <div className={styles.shell}>
            <Header />

            <section className={styles.feedbackShell}>
              <div className={styles.feedbackCard}>
                <p className={styles.sectionEyebrow}>Favorites</p>
                <h1 className={styles.feedbackTitle}>
                  {"\ucc1c \uae30\ub2a5\uc774 \uc544\uc9c1 \uc900\ube44\ub418\uc9c0 \uc54a\uc558\uc5b4\uc694."}
                </h1>
                <p className={styles.feedbackDescription}>
                  {"Supabase\uc5d0 `pattern_favorites` \ud14c\uc774\ube14\uc744 \ub9cc\ub4e4\uba74 \uacc4\uc815\ubcc4 \ucc1c \ub3c4\uc548 \ubcf4\uad00\ud568\uc744 \ubc14\ub85c \uc0ac\uc6a9\ud560 \uc218 \uc788\uc5b4\uc694."}
                </p>
                <div className={styles.feedbackActions}>
                  <Link href="/patterns" className={styles.secondaryLinkAction}>
                    {"\ub3c4\uc548 \ubaa9\ub85d\uc73c\ub85c"}
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </main>
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

  const collectionPanel = (
    <section className={styles.sidePanel}>
      <p className={styles.sectionEyebrow}>Collection</p>
      <h2 className={styles.sideTitle}>{"\ub0b4 \ub3c4\uc548 \ubcf4\uad00\ud568"}</h2>
      <div className={styles.sideInfoList}>
        <div className={styles.sideInfoItem}>
          <span>{"\ucc1c\ud55c \ub3c4\uc548"}</span>
          <strong>{`${favoritePatterns.length}\uac1c`}</strong>
        </div>
      </div>
      <p className={styles.sideDescription}>
        {"\ub9c8\uc74c\uc5d0 \ub4dc\ub294 \ub3c4\uc548\uc744 \ubaa8\uc544 \ub450\uace0 \ub2e4\uc74c \uc791\uc5c5 \ud6c4\ubcf4\ub97c \ucc9c\ucc9c\ud788 \uace8\ub77c\ubcf4\uc138\uc694."}
      </p>
      <div className={styles.sideActions}>
        <Link href="/patterns" className={styles.sideLink}>
          {"\uc804\uccb4 \ub3c4\uc548 \ubcf4\uae30"}
        </Link>
        <Link href="/patterns/new" className={styles.sideLink}>
          {"\uc0c8 \ub3c4\uc548 \ub4f1\ub85d"}
        </Link>
      </div>
    </section>
  );

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Header />

        <section className={styles.workspace}>
          <div className={styles.mainColumn}>
            <section className={styles.hero}>
              <div className={styles.heroTop}>
                <div className={styles.heroBadge}>Pattern Archive</div>
                <div className={styles.heroActions}>
                  <Link href="/patterns" className={styles.secondaryLinkAction}>
                    {"\uc804\uccb4 \ub3c4\uc548"}
                  </Link>
                  <Link href="/patterns/new" className={styles.primaryAction}>
                    {"\ub3c4\uc548 \ub4f1\ub85d"}
                  </Link>
                </div>
              </div>

              <div className={styles.heroIntro}>
                <h1 className={styles.heroTitle}>{"\ucc1c\ud55c \ub3c4\uc548"}</h1>
              </div>
            </section>

            <div className={styles.mobileCollectionPanel}>{collectionPanel}</div>

            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.sectionEyebrow}>Favorites</p>
                  <h2 className={styles.sectionTitle}>{"\uc800\uc7a5\ud55c \ub3c4\uc548 \ubaa9\ub85d"}</h2>
                </div>
              </div>

              <FavoritePatternsClient initialItems={favoritePatternItems} initialPage={page} />
            </section>
          </div>

          <aside className={styles.sideColumn}>
            {collectionPanel}
          </aside>
        </section>
      </div>
    </main>
  );
}
