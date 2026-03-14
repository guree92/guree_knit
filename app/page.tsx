import Image from "next/image";
import Link from "next/link";
import Header from "@/components/layout/Header";
import { workItems } from "@/data/my-work";
import { createClient as createServerClient } from "@/lib/supabase/server";
import styles from "./home-dashboard.module.css";
import heroHeaderImage from "../Image/Header image.png";

type PatternSummary = {
  id: string;
  title: string;
  category: string | null;
  level: string | null;
  like_count: number | null;
  author_nickname?: string | null;
};

const calendarItems = [
  { time: "2:00 pm", title: "도안 업로드 정리", color: "sage" },
  { time: "3:30 pm", title: "커뮤니티 답변 확인", color: "beige" },
  { time: "5:00 pm", title: "작품 기록 업데이트", color: "line" },
  { time: "8:00 pm", title: "같이뜨기 글 작성", color: "sage" },
];

function escapeFilterValue(value: string) {
  return value.replace(/"/g, '\\"');
}

export default async function HomePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nickname =
    (user?.user_metadata?.nickname as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    null;

  if (user && !nickname) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", user.id)
      .maybeSingle();

    nickname = profile?.nickname ?? null;
  }

  const communityCountPromise = (() => {
    if (!nickname && !user?.email) {
      return Promise.resolve({ count: 0, error: null });
    }

    const candidateNames = Array.from(
      new Set(
        [nickname, user?.user_metadata?.name as string | undefined, user?.email?.split("@")[0]].filter(
          Boolean
        )
      )
    ) as string[];

    if (candidateNames.length === 0) {
      return Promise.resolve({ count: 0, error: null });
    }

    const filters = candidateNames
      .map((name) => `author_name.eq.${escapeFilterValue(name)}`)
      .join(",");

    return supabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("is_hidden", false)
      .or(filters);
  })();

  const [patternCountResult, communityCountResult, topPatternsResult] = await Promise.all([
    user
      ? supabase
          .from("patterns")
          .select("id", { count: "exact", head: true })
          .eq("is_hidden", false)
          .eq("user_id", user.id)
      : Promise.resolve({ count: 0, error: null }),
    communityCountPromise,
    supabase
      .from("patterns")
      .select("id, title, category, level, like_count, user_id")
      .eq("is_hidden", false)
      .order("like_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const topPatternsRows = (topPatternsResult.data ?? []) as Array<
    PatternSummary & { user_id?: string | null }
  >;

  const topPatternUserIds = Array.from(
    new Set(topPatternsRows.map((item) => item.user_id).filter(Boolean))
  ) as string[];

  let nicknameMap = new Map<string, string | null>();

  if (topPatternUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nickname")
      .in("id", topPatternUserIds);

    nicknameMap = new Map(
      ((profiles ?? []) as Array<{ id: string; nickname: string | null }>).map((profile) => [
        profile.id,
        profile.nickname,
      ])
    );
  }

  const topPatterns: PatternSummary[] = topPatternsRows.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    level: item.level,
    like_count: item.like_count ?? 0,
    author_nickname: item.user_id ? nicknameMap.get(item.user_id) ?? null : null,
  }));

  const profileName = nickname ?? user?.email?.split("@")[0] ?? "게스트";
  const profileEmail = user?.email ?? "로그인 후 내 아카이브를 더 풍성하게 관리해보세요.";
  const profileRole = user ? "내 뜨개 아카이브" : "로그인하면 내 기록이 모여요";
  const avatarSeed = profileName.trim().charAt(0).toUpperCase() || "G";

  const myPatternCount = patternCountResult.count ?? 0;
  const myCommunityCount = communityCountResult.count ?? 0;
  const myWorkCount = user ? workItems.length : 0;

  const quickStats = [
    { label: "내 작품 기록", value: String(myWorkCount), note: "현재 작업장에 저장됨" },
    { label: "내 게시글", value: String(myCommunityCount), note: "커뮤니티에 작성한 글" },
    { label: "내 도안", value: String(myPatternCount), note: "내가 등록한 패턴" },
  ];

  return (
    <main className={styles.page}>
      <Header />

      <section className={styles.dashboard}>
        <div className={styles.mainColumn}>
          <div className={styles.topBar}>
            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="도안, 작품, 커뮤니티 글을 검색해 보세요"
                className={styles.searchInput}
              />
              <span className={styles.searchIcon}>⌕</span>
            </div>

            <div className={styles.topActions}>
              <button type="button" className={styles.iconButton} aria-label="알림">
                ●
              </button>
              <button type="button" className={styles.iconButton} aria-label="설정">
                ✦
              </button>
            </div>
          </div>

          <section className={styles.heroPanel}>
            <div className={styles.heroCopy}>
              <div className={styles.heroBadge}>뜨개하는 사람들을 위한 아늑한 홈</div>
              <div className={styles.heroTitleImage}>
                <Image
                  src={heroHeaderImage}
                  alt="Hero header"
                  priority
                  className={styles.heroTitleImageAsset}
                />
              </div>
              <p className={styles.heroDescription}>
                도안을 공유하고, 내가 뜬 작품을 예쁘게 저장하고, 서로의 완성작을 구경하고,
                나중에는 판매까지 연결할 수 있는 뜨개 전용 커뮤니티를 만들고 있어.
              </p>

              <div className={styles.heroActions}>
                <Link href="/patterns" className={styles.primaryButton}>
                  도안 둘러보기
                </Link>
                <Link href="/dot-maker" className={styles.secondaryButton}>
                  도트메이커 시작하기
                </Link>
              </div>
            </div>

            <div className={styles.heroIllustration}>
              <div className={styles.illustrationCard}>
                <div className={styles.yarnBall} />
                <div className={styles.knittingNeedleOne} />
                <div className={styles.knittingNeedleTwo} />
                <div className={styles.floatingCard}>
                  <span>오늘의 추천 도안</span>
                  <strong>튤립 코스터 세트</strong>
                  <p>코바늘 · 초급 · 30분 완성</p>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.statsGrid}>
            {quickStats.map((item) => (
              <article key={item.label} className={styles.statCard}>
                <p className={styles.statLabel}>{item.label}</p>
                <strong className={styles.statValue}>{item.value}</strong>
                <span className={styles.statNote}>{item.note}</span>
              </article>
            ))}
          </section>

          <section className={styles.contentRow}>
            <section className={styles.popularSection}>
              <div className={styles.sectionIntro}>
                <div>
                  <p className={styles.sectionEyebrow}>POPULAR PATTERNS</p>
                  <h2 className={styles.sectionTitle}>인기 도안 Top 5</h2>
                </div>
                <Link href="/patterns" className={styles.sectionLink}>
                  전체 보기
                </Link>
              </div>

              <div className={styles.rankList}>
                {topPatterns.map((pattern, index) => (
                  <Link
                    key={pattern.id}
                    href={`/patterns/${pattern.id}`}
                    className={styles.rankCard}
                  >
                    <span className={styles.rankNumber}>{index + 1}</span>
                    <div className={styles.rankBody}>
                      <strong className={styles.rankTitle}>{pattern.title}</strong>
                      <p className={styles.rankMeta}>
                        {pattern.category ?? "기타"} · {pattern.level ?? "난이도 미정"} · @
                        {pattern.author_nickname ?? "닉네임 없음"}
                      </p>
                    </div>
                    <span className={styles.rankLikes}>♥ {pattern.like_count ?? 0}</span>
                  </Link>
                ))}
              </div>
            </section>

            <section className={styles.dotMakerSection}>
              <div className={styles.sectionIntro}>
                <div>
                  <p className={styles.sectionEyebrow}>DOT MAKER</p>
                  <h2 className={styles.sectionTitle}>도트메이커로 빠르게 도안화</h2>
                </div>
              </div>

              <p className={styles.makerDescription}>
                이미지를 도트 패턴으로 바꿔서 뜨개 도안의 초안을 빠르게 만들 수 있어요.
                색을 단순화하고 격자를 확인하면서, 커뮤니티에 올릴 도안 아이디어를 가볍게
                시작해보세요.
              </p>

              <div className={styles.makerHighlights}>
                <div className={styles.makerPill}>이미지 업로드</div>
                <div className={styles.makerPill}>도트 변환</div>
                <div className={styles.makerPill}>격자 확인</div>
              </div>

              <Link href="/dot-maker" className={styles.makerAction}>
                도트메이커 열기
              </Link>
            </section>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.profileCard}>
            <div className={styles.profileHeader}>MY PROFILE</div>
            <div className={styles.profileBody}>
              <div className={styles.profileAvatar}>{avatarSeed}</div>
              <div>
                <h2 className={styles.profileName}>{profileName}</h2>
                <p className={styles.profileRole}>{profileRole}</p>
                <p className={styles.profileLocation}>{profileEmail}</p>
              </div>
            </div>

            <div className={styles.profileMetaGrid}>
              <div>
                <span className={styles.metaLabel}>도안</span>
                <strong className={styles.metaValue}>{myPatternCount}</strong>
              </div>
              <div>
                <span className={styles.metaLabel}>기록</span>
                <strong className={styles.metaValue}>{myWorkCount}</strong>
              </div>
              <div>
                <span className={styles.metaLabel}>커뮤니티</span>
                <strong className={styles.metaValue}>{myCommunityCount}</strong>
              </div>
            </div>
          </section>

          <section className={styles.calendarCard}>
            <div className={styles.calendarHeader}>
              <h2>MY CALENDAR</h2>
              <span>April</span>
            </div>

            <div className={styles.calendarDays}>
              <span>Sun</span>
              <span className={styles.dayActive}>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div className={styles.calendarNumbers}>
              <span>12</span>
              <span className={styles.numberActive}>13</span>
              <span>14</span>
              <span>15</span>
              <span>16</span>
              <span>17</span>
              <span>18</span>
            </div>

            <div className={styles.scheduleList}>
              {calendarItems.map((item) => (
                <div key={`${item.time}-${item.title}`} className={styles.scheduleItem}>
                  <span className={styles.scheduleTime}>{item.time}</span>
                  <span
                    className={
                      item.color === "sage"
                        ? styles.dotSage
                        : item.color === "beige"
                          ? styles.dotBeige
                          : styles.dotLine
                    }
                  />
                  <span className={styles.scheduleTitle}>{item.title}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
