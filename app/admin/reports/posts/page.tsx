import Header from "@/components/layout/Header";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import AdminPostReportsClient from "./AdminPostReportsClient";

type ReportRow = {
  id: string;
  post_id: string;
  reporter_user_id: string;
  post_author_name: string | null;
  created_at: string | null;
  is_resolved: boolean | null;
  resolved_at: string | null;
};

type PostSummary = {
  id: string;
  title: string;
};

type UserSummary = {
  id: string;
  email: string | null;
  nickname: string | null;
};

export default async function AdminPostReportsPage() {
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
    .from("community_post_reports")
    .select("id, post_id, reporter_user_id, post_author_name, created_at, is_resolved, resolved_at")
    .order("created_at", { ascending: false });

  const reports = ((data ?? []) as ReportRow[]).map((item) => ({
    id: item.id,
    postId: item.post_id,
    reporterUserId: item.reporter_user_id,
    postAuthorName: item.post_author_name,
    createdAt: item.created_at,
    isResolved: Boolean(item.is_resolved),
    resolvedAt: item.resolved_at,
  }));

  const postIds = Array.from(new Set(reports.map((report) => report.postId)));
  const userIds = Array.from(new Set(reports.map((report) => report.reporterUserId)));

  const [postsResult, userSummaries] = await Promise.all([
    postIds.length > 0
      ? adminSupabase.from("community_posts").select("id, title").in("id", postIds)
      : Promise.resolve({ data: [], error: null }),
    Promise.all(
      userIds.map(async (id) => {
        const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(id);

        if (userError || !userData.user) {
          return { id, email: null, nickname: null } satisfies UserSummary;
        }

        return {
          id,
          email: userData.user.email ?? null,
          nickname:
            (userData.user.user_metadata?.nickname as string | undefined) ??
            (userData.user.user_metadata?.name as string | undefined) ??
            null,
        } satisfies UserSummary;
      })
    ),
  ]);

  const postMap = new Map(((postsResult.data ?? []) as PostSummary[]).map((item) => [item.id, item]));
  const userMap = new Map(userSummaries.map((item) => [item.id, item]));

  const normalizedReports = reports.map((report) => {
    const post = postMap.get(report.postId) ?? null;
    const reporter = userMap.get(report.reporterUserId) ?? null;

    return {
      id: report.id,
      postId: report.postId,
      postTitle: post?.title ?? null,
      postAuthorName: report.postAuthorName,
      postAuthorEmail: null,
      reporterNickname: reporter?.nickname ?? null,
      reporterEmail: reporter?.email ?? null,
      createdAt: report.createdAt,
      isResolved: report.isResolved,
      resolvedAt: report.resolvedAt,
    };
  });

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
                게시글 신고 관리
              </h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#756457] md:text-base">
                게시글 신고 목록을 접힌 카드 형태로 확인하고 미확인, 확인 완료 상태를 나눠 관리할 수 있어요.
              </p>
            </div>

            <div className="rounded-full border border-[#ddd3c8] bg-[#fdfaf6] px-4 py-2 text-sm font-medium text-[#7a6a5d] shadow-sm">
              총 {normalizedReports.length}건
            </div>
          </div>
        </section>

        {error || postsResult.error ? (
          <section className="mt-8 rounded-[2rem] border border-dashed border-[#d9cec2] bg-[#f8f4ee] p-10 text-center shadow-sm">
            <h2 className="text-xl font-black text-[#4a392f]">게시글 신고 내역을 불러오지 못했어요</h2>
            <p className="mt-3 text-[#756457]">{error?.message ?? postsResult.error?.message}</p>
          </section>
        ) : (
          <AdminPostReportsClient initialReports={normalizedReports} />
        )}
      </div>
    </main>
  );
}
