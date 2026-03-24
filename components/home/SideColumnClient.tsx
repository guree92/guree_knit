"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import HomeNotificationBell, {
  type HomeNotification,
  type LikeSource,
} from "@/components/home/HomeNotificationBell";
import { createClient } from "@/lib/supabase/client";
import styles from "@/app/home-dashboard.module.css";

export type SideProgressItem = {
  id: string;
  title: string;
  percent: number;
  note: string;
};

type Props = {
  userId: string | null;
  candidateNames: string[];
  profileName: string;
  profileEmail: string;
  avatarSeed: string;
  initialPatternCount: number;
  myWorkCount: number;
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
  created_at: string | null;
};

type PatternSummary = {
  id: string;
  title: string;
  like_count: number | null;
  hidden_at?: string | null;
};

function escapeFilterValue(value: string) {
  return value.replace(/"/g, '\\"');
}

export default function SideColumnClient({
  userId,
  candidateNames,
  profileName,
  profileEmail,
  avatarSeed,
  initialPatternCount,
  myWorkCount,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const isGuest = profileName === "게스트";
  const [myPatternCount, setMyPatternCount] = useState(initialPatternCount);
  const [myCommunityCount, setMyCommunityCount] = useState(0);
  const [notifications, setNotifications] = useState<HomeNotification[]>([]);
  const [communityLikeSources, setCommunityLikeSources] = useState<LikeSource[]>([]);
  const [patternLikeSources, setPatternLikeSources] = useState<LikeSource[]>([]);

  useEffect(() => {
    if (isGuest || !userId) return;

    let isCancelled = false;
    const filters = candidateNames
      .filter(Boolean)
      .map((name) => `author_name.eq.${escapeFilterValue(name)}`)
      .join(",");

    async function loadSideData() {
      const [
        patternCountResult,
        ownPostsResult,
        hiddenCommunityPostsResult,
        hiddenPatternsResult,
        ownPatternLikesResult,
        communityCountResult,
      ] = await Promise.all([
        supabase
          .from("patterns")
          .select("id", { count: "exact", head: true })
          .eq("is_hidden", false)
          .eq("user_id", userId),
        filters
          ? supabase
              .from("community_posts")
              .select("id, title, community_likes(count)")
              .eq("is_hidden", false)
              .or(filters)
              .order("created_at", { ascending: false })
              .limit(8)
          : Promise.resolve({ data: [] as CommunityPostSummary[] }),
        filters
          ? supabase
              .from("community_posts")
              .select("id, title, hidden_at")
              .eq("is_hidden", true)
              .or(filters)
              .order("hidden_at", { ascending: false })
              .limit(3)
          : Promise.resolve({ data: [] as CommunityPostSummary[] }),
        supabase
          .from("patterns")
          .select("id, title, hidden_at")
          .eq("user_id", userId)
          .eq("is_hidden", true)
          .order("hidden_at", { ascending: false })
          .limit(3),
        supabase
          .from("patterns")
          .select("id, title, like_count")
          .eq("user_id", userId)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(12),
        filters
          ? supabase
              .from("community_posts")
              .select("id", { count: "exact", head: true })
              .eq("is_hidden", false)
              .or(filters)
          : Promise.resolve({ count: 0 }),
      ]);

      if (isCancelled) return;

      const ownPosts = (ownPostsResult.data ?? []) as CommunityPostSummary[];
      const ownPostIds = ownPosts.map((post) => post.id);
      const recentCommentsResult =
        ownPostIds.length > 0
          ? await supabase
              .from("community_comments")
              .select("id, post_id, author_name, created_at")
              .in("post_id", ownPostIds)
              .order("created_at", { ascending: false })
              .limit(6)
          : { data: [] as CommunityCommentSummary[] };

      if (isCancelled) return;

      const postTitleMap = new Map(ownPosts.map((post) => [post.id, post.title]));
      const commentNotifications = ((recentCommentsResult.data ?? []) as CommunityCommentSummary[])
        .filter((comment) => !candidateNames.includes(comment.author_name?.trim() ?? ""))
        .map(
          (comment): HomeNotification => ({
            id: `community-comment-${comment.id}`,
            kind: "community",
            title: postTitleMap.get(comment.post_id) ?? "내 게시글",
            description: postTitleMap.get(comment.post_id)
              ? "새 댓글이 달렸어요."
              : "내 게시글에 새 댓글이 달렸어요.",
            href: `/community/${comment.post_id}`,
            createdAt: comment.created_at ?? new Date().toISOString(),
          })
        );

      const hiddenCommunityNotifications = ((hiddenCommunityPostsResult.data ?? []) as CommunityPostSummary[]).map(
        (post): HomeNotification => ({
          id: `community-hidden-${post.id}`,
          kind: "community",
          title: "내 게시글 상태가 바뀌었어요",
          description: `"${post.title}" 게시글이 숨김 처리되었어요.`,
          href: "/community",
          createdAt: post.hidden_at ?? new Date().toISOString(),
        })
      );

      const hiddenPatternNotifications = ((hiddenPatternsResult.data ?? []) as PatternSummary[]).map(
        (pattern): HomeNotification => ({
          id: `pattern-hidden-${pattern.id}`,
          kind: "pattern",
          title: "내 도안 상태가 바뀌었어요",
          description: `"${pattern.title}" 도안이 숨김 처리되었어요.`,
          href: `/patterns/${pattern.id}`,
          createdAt: pattern.hidden_at ?? new Date().toISOString(),
        })
      );

      setNotifications(
        [...commentNotifications, ...hiddenCommunityNotifications, ...hiddenPatternNotifications]
          .sort(
            (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
          )
          .slice(0, 8)
      );
      setCommunityLikeSources(
        ownPosts.map((post) => ({
          id: post.id,
          title: post.title,
          href: `/community/${post.id}`,
          likeCount: post.community_likes?.[0]?.count ?? 0,
        }))
      );
      setPatternLikeSources(
        ((ownPatternLikesResult.data ?? []) as PatternSummary[]).map((pattern) => ({
          id: pattern.id,
          title: pattern.title,
          href: `/patterns/${pattern.id}`,
          likeCount: pattern.like_count ?? 0,
        }))
      );
      setMyPatternCount(patternCountResult.count ?? 0);
      setMyCommunityCount(communityCountResult.count ?? 0);
    }

    void loadSideData();

    return () => {
      isCancelled = true;
    };
  }, [candidateNames, isGuest, supabase, userId]);

  return (
    <aside className={styles.sideColumn}>
      <section className={`${styles.profileCard} ${styles.desktopProfileCard}`}>
        <div className={styles.profileBody}>
          <div className={styles.profileAvatar}>{avatarSeed}</div>
          <div className={styles.profileIdentity}>
            <div
              className={`${styles.profileIdentityMain} ${isGuest ? styles.profileIdentityMainGuest : ""}`}
            >
              <div className={styles.profileNameRow}>
                <h2 className={styles.profileName}>{profileName}</h2>
                {!isGuest ? (
                  <HomeNotificationBell
                    notifications={notifications}
                    communityLikeSources={communityLikeSources}
                    patternLikeSources={patternLikeSources}
                    buttonClassName={styles.profileNotificationButton}
                  />
                ) : null}
              </div>
              <p className={styles.profileLocation}>{profileEmail}</p>
            </div>
          </div>
        </div>

        {isGuest ? (
          <Link href="/login?returnTo=%2F" className={styles.profileLoginBand}>
            로그인하기
          </Link>
        ) : (
          <div className={styles.profileMetaGrid}>
            <div>
              <span className={styles.metaLabel}>도안</span>
              <strong className={styles.metaValue}>{myPatternCount}</strong>
            </div>
            <div>
              <span className={styles.metaLabel}>뜨개마당</span>
              <strong className={styles.metaValue}>{myCommunityCount}</strong>
            </div>
            <div>
              <span className={styles.metaLabel}>기록</span>
              <strong className={styles.metaValue}>{myWorkCount}</strong>
            </div>
          </div>
        )}
      </section>
    </aside>
  );
}
