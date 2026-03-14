"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./auth-status.module.css";

type AuthUser = {
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

export default function AuthStatus() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUser((data.user as AuthUser | null) ?? null);

      if (data.user) {
        const response = await fetch("/api/admin/status", { cache: "no-store" });

        if (response.ok) {
          const result = (await response.json()) as { isAdmin?: boolean };
          setIsAdmin(Boolean(result.isAdmin));
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadUser();
      router.refresh();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    router.push("/");
    router.refresh();
  }

  if (loading) return null;

  if (!user) {
    return (
      <div className={styles.root}>
        <Link href="/login" className={styles.loginLink} aria-label="로그인">
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

  return (
    <div className={styles.root}>
      {isAdmin ? (
        <Link href="/admin" className={styles.adminLink} aria-label="관리자 페이지">
          <span className={styles.icon}><ShieldIcon /></span>
          <span className={styles.label} data-collapsible-label>
            관리자 페이지
          </span>
        </Link>
      ) : null}

      <div className={styles.userBadge}>
        <span className={`${styles.icon} ${styles.userAvatar}`}>{avatarSeed}</span>
        <span className={styles.label} data-collapsible-label>
          {displayName}
        </span>
      </div>

      <button onClick={handleLogout} className={styles.logoutButton} aria-label="로그아웃">
        <span className={styles.icon}><LogoutIcon /></span>
        <span className={styles.label} data-collapsible-label>
          로그아웃
        </span>
      </button>
    </div>
  );
}
