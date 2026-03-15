import Image from "next/image";
import {
  type HomeNotification,
  type LikeSource,
} from "@/components/home/HomeNotificationBell";
import HomeMainCollectionsClient, {
  type MainPatternCard,
} from "@/components/home/HomeMainCollectionsClient";
import SideColumnClient, {
  type SideProgressItem,
} from "@/components/home/SideColumnClient";
import Header from "@/components/layout/Header";
import { workItems } from "@/data/my-work";
import { createClient as createServerClient } from "@/lib/supabase/server";
import styles from "./home-dashboard.module.css";
import heroHeaderImage from "../Image/headerlogo.png";

type PatternSummary = {
  id: string;
  title: string;
  category: string | null;
  level: string | null;
  like_count: number | null;
  image_path?: string | null;
  created_at?: string | null;
  author_nickname?: string | null;
};

type CommunityPostSummary = {
  id: string;
  title: string;
  hidden_at?: string | null;
  community_likes?: Array<{ count: number }>;
};

type CommunityCommentSummary = {
  id: string;
  post_id: string;
  author_name: string | null;
  content: string;
  created_at: string | null;
};

const calendarItems: Array<{ time: string; title: string; color: "sage" | "beige" | "line" }> = [
  { time: "2:00 pm", title: "도안 업로드 정리", color: "sage" },
  { time: "3:30 pm", title: "뜨개마당 답변 확인", color: "beige" },
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

  let candidateNames = [] as string[];

  if (user && !nickname) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", user.id)
      .maybeSingle();

    nickname = profile?.nickname ?? null;
  }

  candidateNames = Array.from(
    new Set(
      [nickname, user?.user_metadata?.name as string | undefined, user?.email?.split("@")[0]].filter(Boolean)
    )
  ) as string[];

  const communityCountPromise = (() => {
    if (!nickname && !user?.email) {
      return Promise.resolve({ count: 0, error: null });
    }

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

  const ownPostsPromise = (() => {
    if (candidateNames.length === 0) {
      return Promise.resolve({ data: [] as CommunityPostSummary[], error: null });
    }

    const filters = candidateNames
      .map((name) => `author_name.eq.${escapeFilterValue(name)}`)
      .join(",");

    return supabase
      .from("community_posts")
      .select("id, title, community_likes(count)")
      .eq("is_hidden", false)
      .or(filters)
      .order("created_at", { ascending: false })
      .limit(8);
  })();

  const hiddenCommunityPostsPromise = (() => {
    if (candidateNames.length === 0) {
      return Promise.resolve({ data: [] as CommunityPostSummary[], error: null });
    }

    const filters = candidateNames
      .map((name) => `author_name.eq.${escapeFilterValue(name)}`)
      .join(",");

    return supabase
      .from("community_posts")
      .select("id, title, hidden_at")
      .eq("is_hidden", true)
      .or(filters)
      .order("hidden_at", { ascending: false })
      .limit(3);
  })();

  const hiddenPatternsPromise = user
    ? supabase
        .from("patterns")
        .select("id, title, hidden_at")
        .eq("user_id", user.id)
        .eq("is_hidden", true)
        .order("hidden_at", { ascending: false })
        .limit(3)
    : Promise.resolve({ data: [] as Array<PatternSummary & { hidden_at?: string | null }>, error: null });

  const ownPatternLikesPromise = user
    ? supabase
        .from("patterns")
        .select("id, title, like_count")
        .eq("user_id", user.id)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(12)
    : Promise.resolve({ data: [] as Array<PatternSummary>, error: null });

  const [
    patternCountResult,
    communityCountResult,
    topPatternsResult,
    ownPostsResult,
    hiddenCommunityPostsResult,
    hiddenPatternsResult,
    ownPatternLikesResult,
  ] = await Promise.all([
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
      .select("id, title, category, level, like_count, image_path, user_id")
      .eq("is_hidden", false)
      .order("like_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    ownPostsPromise,
    hiddenCommunityPostsPromise,
    hiddenPatternsPromise,
    ownPatternLikesPromise,
  ]);

  const ownPosts = ((ownPostsResult.data ?? []) as CommunityPostSummary[]) ?? [];
  const ownPostIds = ownPosts.map((post) => post.id);

  const recentCommentsResult =
    ownPostIds.length > 0
      ? await supabase
          .from("community_comments")
          .select("id, post_id, author_name, content, created_at")
          .in("post_id", ownPostIds)
          .order("created_at", { ascending: false })
          .limit(6)
      : { data: [] as CommunityCommentSummary[], error: null };

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

  const topPatterns: MainPatternCard[] = topPatternsRows.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    level: item.level,
    like_count: item.like_count ?? 0,
    image_path: item.image_path ?? null,
    author_nickname: item.user_id ? nicknameMap.get(item.user_id) ?? null : null,
  }));

  const postTitleMap = new Map(ownPosts.map((post) => [post.id, post.title]));
  const commentNotifications = (((recentCommentsResult.data ?? []) as CommunityCommentSummary[]) ?? [])
    .filter((comment) => !candidateNames.includes(comment.author_name?.trim() ?? ""))
    .map(
      (comment): HomeNotification => ({
        id: `community-comment-${comment.id}`,
        kind: "community",
        title: postTitleMap.get(comment.post_id) ?? "내 게시글",
        description: postTitleMap.get(comment.post_id)
          ? `새 댓글이 달렸어요.`
          : "내 게시글에 새 댓글이 달렸어요.",
        href: `/community/${comment.post_id}`,
        createdAt: comment.created_at ?? new Date().toISOString(),
      })
    );

  const hiddenCommunityNotifications = (
    ((hiddenCommunityPostsResult.data ?? []) as CommunityPostSummary[]) ?? []
  ).map(
    (post): HomeNotification => ({
      id: `community-hidden-${post.id}`,
      kind: "community",
      title: "내 게시글 상태가 바뀌었어요",
      description: `"${post.title}" 게시글이 숨김 처리되었어요.`,
      href: "/community",
      createdAt: post.hidden_at ?? new Date().toISOString(),
    })
  );

  const hiddenPatternNotifications = (
    ((hiddenPatternsResult.data ?? []) as Array<PatternSummary & { hidden_at?: string | null }>) ?? []
  ).map(
    (pattern): HomeNotification => ({
      id: `pattern-hidden-${pattern.id}`,
      kind: "pattern",
      title: "내 도안 상태가 바뀌었어요",
      description: `"${pattern.title}" 도안이 숨김 처리되었어요.`,
      href: `/patterns/${pattern.id}`,
      createdAt: pattern.hidden_at ?? new Date().toISOString(),
    })
  );

  const notifications = [
    ...commentNotifications,
    ...hiddenCommunityNotifications,
    ...hiddenPatternNotifications,
  ]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 8);

  const communityLikeSources: LikeSource[] = ownPosts.map((post) => ({
    id: post.id,
    title: post.title,
    href: `/community/${post.id}`,
    likeCount: post.community_likes?.[0]?.count ?? 0,
  }));

  const patternLikeSources: LikeSource[] = (((ownPatternLikesResult.data ?? []) as Array<PatternSummary>) ?? []).map(
    (pattern) => ({
      id: pattern.id,
      title: pattern.title,
      href: `/patterns/${pattern.id}`,
      likeCount: pattern.like_count ?? 0,
    })
  );

  const profileName = nickname ?? user?.email?.split("@")[0] ?? "게스트";
  const profileEmail = user?.email ?? "로그인 후 내 아카이브를 더 풍성하게 관리해보세요.";
  const avatarSeed = profileName.trim().charAt(0).toUpperCase() || "G";

  const myPatternCount = patternCountResult.count ?? 0;
  const myCommunityCount = communityCountResult.count ?? 0;
  const myWorkCount = user ? workItems.length : 0;

  const progressItems: SideProgressItem[] = [
    { id: "net-bag-project", title: "네트백", percent: 68, note: "손잡이 길이와 마감 디테일 조정 중" },
    { id: "tulip-coaster-set", title: "튤립 코스터 세트", percent: 92, note: "마지막 정리와 촬영만 남았어요" },
    { id: "rabbit-doll-project", title: "토끼 인형", percent: 37, note: "귀 모양 수정 후 다시 이어뜨기 예정" },
  ];

  return (
    <main className={styles.page}>
      <Header />

      <section className={styles.dashboard}>
        <div className={styles.mainColumn}>
          <section className={styles.heroPanel}>
            <div className={styles.heroCopy}>
              <div className={styles.heroTitleImage}>
                <Image
                  src={heroHeaderImage}
                  alt="Hero header"
                  priority
                  className={styles.heroTitleImageAsset}
                />
              </div>
            </div>
          </section>

          <HomeMainCollectionsClient topPatterns={topPatterns} progressItems={progressItems} />
        </div>

        <SideColumnClient
          profileName={profileName}
          profileEmail={profileEmail}
          avatarSeed={avatarSeed}
          myPatternCount={myPatternCount}
          myWorkCount={myWorkCount}
          myCommunityCount={myCommunityCount}
          notifications={notifications}
          communityLikeSources={communityLikeSources}
          patternLikeSources={patternLikeSources}
          calendarItems={calendarItems}
        />
      </section>
    </main>
  );
}
