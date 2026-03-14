"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthUser = {
  email?: string | null;
  user_metadata?: {
    nickname?: string;
    name?: string;
  };
};

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
      <Link
        href="/login"
        className="rounded-full border border-[#e6ddd2] bg-[#f8f4ee] px-5 py-2 text-sm font-semibold text-[#6f6258] transition hover:bg-[#eef3ec] hover:text-[#5d7460]"
      >
        로그인
      </Link>
    );
  }

  const displayName = user.user_metadata?.nickname ?? user.user_metadata?.name ?? user.email;

  return (
    <div className="flex items-center gap-2">
      {isAdmin ? (
        <Link
          href="/admin/reports"
          className="rounded-full border border-[#d6cec2] bg-[#f6efe6] px-4 py-2 text-sm font-semibold text-[#7a6047] transition hover:bg-[#efe4d7]"
        >
          관리자 페이지
        </Link>
      ) : null}

      <span className="rounded-full bg-[#f3f6f3] px-4 py-2 text-sm font-semibold text-[#5d7460]">
        {displayName}
      </span>

      <button
        onClick={handleLogout}
        className="rounded-full border border-[#e6ddd2] bg-white px-4 py-2 text-sm font-semibold text-[#6f6258] transition hover:bg-[#f4f7f4]"
      >
        로그아웃
      </button>
    </div>
  );
}
