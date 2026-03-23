"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const safePathname = pathname || "/";
  const logoutRedirect =
    safePathname.startsWith("/companion/") || safePathname === "/companion"
      ? "/companion"
      : safePathname.startsWith("/patterns/") || safePathname === "/patterns"
        ? "/patterns"
      : "/";

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push(logoutRedirect);
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
