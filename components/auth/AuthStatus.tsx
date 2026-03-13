"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AuthStatus() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
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
    router.push("/");
    router.refresh();
  }

  if (loading) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-full px-5 py-2 text-sm font-semibold border border-[#e6ddd2] bg-[#f8f4ee] text-[#6f6258] transition hover:bg-[#eef3ec] hover:text-[#5d7460]"
      >
        로그인
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full bg-[#f3f6f3] px-4 py-2 text-sm font-semibold text-[#5d7460]">
        {user.user_metadata?.nickname ?? user.email}
      </span>

      <button
        onClick={handleLogout}
        className="rounded-full px-4 py-2 text-sm font-semibold border border-[#e6ddd2] bg-white text-[#6f6258] transition hover:bg-[#f4f7f4]"
      >
        로그아웃
      </button>
    </div>
  );
}