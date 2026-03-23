"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { workItems } from "@/data/my-work";
import styles from "./auth-status.module.css";

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    nickname?: string;
    name?: string;
  };
};

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 5 6v6c0 4.5 2.9 7.9 7 9 4.1-1.1 7-4.5 7-9V6l-7-3Z" />
    </svg>
  );
}

type Props = {
  compact?: boolean;
  profileCard?: boolean;
  showUserBadge?: boolean;
};

function AdminSlotPlaceholder() {
  return (
    <div className={`${styles.adminLink} ${styles.hiddenSlot}`} aria-hidden="true">
      <span className={styles.icon}><ShieldIcon /></span>
      <span className={styles.label} data-collapsible-label>
        관리자 페이지
      </span>
    </div>
  );
}

function escapeFilterValue(value: string) {
  return value.replace(/[,()]/g, (char) => `\\${char}`);
}

export default function AuthStatus({
  compact = false,
  profileCard = false,
  showUserBadge = true,
}: Props) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const pathname = usePathname();
  const safePathname = pathname || "/";
  const loginHref = `/login?returnTo=${encodeURIComponent(safePathname)}`;
  const logoutRedirect =
    safePathname.startsWith("/companion/") || safePathname === "/companion"
      ? "/companion"
      : safePathname.startsWith("/patterns/") || safePathname === "/patterns"
        ? "/patterns"
      : "/";

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [patternCount, setPatternCount] = useState(0);
  const [communityCount, setCommunityCount] = useState(0);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      const nextUser = (data.user as AuthUser | null) ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setIsAdmin(false);
        setPatternCount(0);
        setCommunityCount(0);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/admin/status", { cache: "no-store" });

      if (response.ok) {
        const result = (await response.json()) as { isAdmin?: boolean };
        setIsAdmin(Boolean(result.isAdmin));
      } else {
        setIsAdmin(false);
      }

      // Only the expanded profile card needs expensive count queries.
      if (!profileCard) {
        setPatternCount(0);
        setCommunityCount(0);
        setLoading(false);
        return;
      }

      const [profileResult, patternCountResult] = await Promise.all([
        supabase.from("profiles").select("nickname").eq("id", nextUser.id).maybeSingle(),
        supabase
          .from("patterns")
          .select("id", { count: "exact", head: true })
          .eq("user_id", nextUser.id)
          .eq("is_hidden", false),
      ]);

      const candidateNames = Array.from(
        new Set(
          [
            profileResult.data?.nickname,
            nextUser.user_metadata?.nickname as string | undefined,
            nextUser.user_metadata?.name as string | undefined,
            nextUser.email?.split("@")[0],
          ].filter(Boolean)
        )
      ) as string[];

      if (candidateNames.length > 0) {
        const filters = candidateNames
          .map((name) => `author_name.eq.${escapeFilterValue(name)}`)
          .join(",");

        const communityCountResult = await supabase
          .from("community_posts")
          .select("id", { count: "exact", head: true })
          .eq("is_hidden", false)
          .or(filters);

        setCommunityCount(communityCountResult.count ?? 0);
      } else {
        setCommunityCount(0);
      }

      setPatternCount(patternCountResult.count ?? 0);
      setLoading(false);
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      loadUser();

      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        router.refresh();
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [profileCard, router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    router.push(logoutRedirect);
    router.refresh();
  }

  if (loading) {
    return (
      <div className={styles.root}>
        <AdminSlotPlaceholder />
        {showUserBadge ? (
          <div className={`${styles.userBadge} ${styles.hiddenSlot}`} aria-hidden="true">
            <span className={`${styles.icon} ${styles.userAvatar}`}>U</span>
            <span className={styles.label} data-collapsible-label>
              사용자
            </span>
          </div>
        ) : null}
        <button type="button" className={`${styles.logoutButton} ${styles.hiddenSlot}`} aria-hidden="true" tabIndex={-1}>
          <span className={styles.icon}><LogoutIcon /></span>
          <span className={styles.label} data-collapsible-label>
            로그아웃
          </span>
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.root}>
        <Link href={loginHref} className={styles.loginLink} aria-label="로그인">
          <span className={styles.icon}><UserIcon /></span>
          <span className={styles.label} data-collapsible-label>
            로그인
          </span>
        </Link>
      </div>
    );
  }

  const displayName = user.user_metadata?.nickname ?? user.user_metadata?.name ?? user.email ?? "사용자";
  const avatarSeed = displayName.trim().charAt(0).toUpperCase() || "U";
  const workCount = user ? workItems.length : 0;

  if (compact) {
    return (
      <div className={styles.root}>
        <div className={styles.userBadge}>
          <span className={`${styles.icon} ${styles.userAvatar}`}>{avatarSeed}</span>
          <span className={styles.label} data-collapsible-label>
            {displayName}
          </span>
        </div>
      </div>
    );
  }

  if (profileCard) {
    return (
      <div className={styles.profileCard}>
        <div className={styles.profileCardHeader}>MY PROFILE</div>
        <div className={styles.profileCardBody}>
          <span className={`${styles.profileAvatar} ${styles.userAvatar}`}>{avatarSeed}</span>
          <div className={styles.profileCardIdentity}>
            <strong className={styles.profileCardName}>{displayName}</strong>
            <span className={styles.profileCardEmail}>{user.email ?? ""}</span>
          </div>
        </div>
        <div className={styles.profileCardStats}>
          <div>
            <span className={styles.profileCardStatLabel}>도안</span>
            <strong className={styles.profileCardStatValue}>{patternCount}</strong>
          </div>
          <div>
            <span className={styles.profileCardStatLabel}>뜨개마당</span>
            <strong className={styles.profileCardStatValue}>{communityCount}</strong>
          </div>
          <div>
            <span className={styles.profileCardStatLabel}>기록</span>
            <strong className={styles.profileCardStatValue}>{workCount}</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {isAdmin ? (
        <Link href="/admin" className={styles.adminLink} aria-label="관리자 페이지">
          <span className={styles.icon}><ShieldIcon /></span>
          <span className={styles.label} data-collapsible-label>
            관리자 페이지
          </span>
        </Link>
      ) : (
        <AdminSlotPlaceholder />
      )}

      {showUserBadge ? (
        <div className={styles.userBadge}>
          <span className={`${styles.icon} ${styles.userAvatar}`}>{avatarSeed}</span>
          <span className={styles.label} data-collapsible-label>
            {displayName}
          </span>
        </div>
      ) : null}

      <button onClick={handleLogout} className={styles.logoutButton} aria-label="로그아웃">
        <span className={styles.icon}><LogoutIcon /></span>
        <span className={styles.label} data-collapsible-label>
          로그아웃
        </span>
      </button>
    </div>
  );
}
