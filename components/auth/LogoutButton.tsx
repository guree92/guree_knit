"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full border border-[#d8cfc2] bg-white/80 px-4 py-2 text-sm font-bold text-[#7d6d60] transition hover:bg-[#faf6f0]"
    >
      로그아웃
    </button>
  );
}