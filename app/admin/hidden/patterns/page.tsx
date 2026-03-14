import Header from "@/components/layout/Header";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import AdminHiddenPatternsClient from "./AdminHiddenPatternsClient";

type HiddenPatternRow = {
  id: string;
  title: string;
  user_id: string | null;
  created_at: string | null;
  hidden_at: string | null;
};

type UserSummary = {
  id: string;
  nickname: string | null;
};

export default async function AdminHiddenPatternsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!process.env.ADMIN_EMAIL || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/admin");
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("patterns")
    .select("id, title, user_id, created_at, hidden_at")
    .eq("is_hidden", true)
    .order("hidden_at", { ascending: false });

  const rows = (data ?? []) as HiddenPatternRow[];
  const authorIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean))) as string[];

  const profilesResult =
    authorIds.length > 0
      ? await adminSupabase.from("profiles").select("id, nickname").in("id", authorIds)
      : { data: [], error: null };

  const userMap = new Map(
    ((profilesResult.data ?? []) as UserSummary[]).map((profile) => [profile.id, profile.nickname])
  );

  const patterns = rows.map((pattern) => ({
    id: pattern.id,
    title: pattern.title,
    authorName: pattern.user_id ? userMap.get(pattern.user_id) ?? null : null,
    createdAt: pattern.created_at,
    hiddenAt: pattern.hidden_at,
  }));

  return (
    <main className="min-h-screen bg-[#fcfaf6] px-6 py-8 text-[#4b3a2f] md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        <Header />

        <section className="mt-12 rounded-[2.25rem] border border-[#e6ddd2] bg-[#f8f4ee] p-8 shadow-[0_10px_30px_rgba(91,74,60,0.06)] md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-[#d9d0c6] bg-[#fdfaf6] px-4 py-2 text-sm font-semibold text-[#8f7a67]">
                ADMIN
              </div>
              <h1 className="mt-5 text-4xl font-black leading-tight text-[#4a392f] md:text-5xl">
                숨김 도안 관리
              </h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#756457] md:text-base">
                관리자에 의해 숨김 처리된 도안을 확인하고, 필요하면 다시 복구할 수 있어요.
              </p>
            </div>

            <div className="rounded-full border border-[#ddd3c8] bg-[#fdfaf6] px-4 py-2 text-sm font-medium text-[#7a6a5d] shadow-sm">
              총 {patterns.length}건
            </div>
          </div>
        </section>

        {error ? (
          <section className="mt-8 rounded-[2rem] border border-dashed border-[#d9cec2] bg-[#f8f4ee] p-10 text-center shadow-sm">
            <h2 className="text-xl font-black text-[#4a392f]">숨김 도안을 불러오지 못했어요</h2>
            <p className="mt-3 text-[#756457]">{error.message}</p>
          </section>
        ) : (
          <AdminHiddenPatternsClient initialPatterns={patterns} />
        )}
      </div>
    </main>
  );
}

