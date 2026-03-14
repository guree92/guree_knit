import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    return (
      <main className="min-h-screen bg-[#fcfaf6] px-6 py-8 text-[#4b3a2f] md:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          <Header />
          <section className="mt-12 rounded-[2.25rem] border border-dashed border-[#d9cec2] bg-[#f8f4ee] p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black text-[#4a392f]">관리자 설정이 필요해요</h1>
            <p className="mt-3 text-[#756457]">
              `.env.local`에 `ADMIN_EMAIL`을 추가하면 관리자 페이지를 사용할 수 있어요.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (user.email !== adminEmail) {
    return (
      <main className="min-h-screen bg-[#fcfaf6] px-6 py-8 text-[#4b3a2f] md:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          <Header />
          <section className="mt-12 rounded-[2.25rem] border border-dashed border-[#d9cec2] bg-[#f8f4ee] p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black text-[#4a392f]">접근 권한이 없어요</h1>
            <p className="mt-3 text-[#756457]">
              이 페이지는 관리자 계정으로 로그인했을 때만 볼 수 있어요.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const adminSupabase = createAdminClient();
  const [commentReportsResult, postReportsResult, patternReportsResult, hiddenPostsResult, hiddenPatternsResult] = await Promise.all([
    adminSupabase.from("community_comment_reports").select("id, is_resolved"),
    adminSupabase.from("community_post_reports").select("id, is_resolved"),
    adminSupabase.from("pattern_reports").select("id, is_resolved"),
    adminSupabase.from("community_posts").select("id", { count: "exact", head: true }).eq("is_hidden", true),
    adminSupabase.from("patterns").select("id", { count: "exact", head: true }).eq("is_hidden", true),
  ]);

  const commentReports = commentReportsResult.data ?? [];
  const postReports = postReportsResult.data ?? [];
  const patternReports = patternReportsResult.data ?? [];
  const unresolvedCommentCount = commentReports.filter((item) => !item.is_resolved).length;
  const unresolvedPostCount = postReports.filter((item) => !item.is_resolved).length;
  const unresolvedPatternCount = patternReports.filter((item) => !item.is_resolved).length;
  const hiddenPostCount = hiddenPostsResult.count ?? 0;
  const hiddenPatternCount = hiddenPatternsResult.count ?? 0;

  return (
    <main className="min-h-screen bg-[#fcfaf6] px-6 py-8 text-[#4b3a2f] md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Header />

        <section className="mt-12 rounded-[2.4rem] border border-[#e6ddd2] bg-[#f8f4ee] p-8 shadow-[0_10px_30px_rgba(91,74,60,0.06)] md:p-10">
          <div>
            <div className="inline-flex rounded-full border border-[#d9d0c6] bg-[#fdfaf6] px-4 py-2 text-sm font-semibold text-[#8f7a67]">
              ADMIN DASHBOARD
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight text-[#4a392f] md:text-5xl">
              관리자 페이지
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#756457] md:text-base">
              신고 확인과 숨김 복구를 각각 분리해서 관리할 수 있도록 정리한 관리자 대시보드예요.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-5">
          <article className="rounded-[1.8rem] border border-[#e6ddd2] bg-[#fffdf9] p-6 shadow-[0_10px_24px_rgba(91,74,60,0.04)]">
            <p className="text-sm font-semibold text-[#8f7a67]">댓글 신고</p>
            <strong className="mt-3 block text-3xl font-black text-[#4a392f]">{unresolvedCommentCount}</strong>
            <p className="mt-2 text-sm text-[#756457]">미확인 신고</p>
          </article>
          <article className="rounded-[1.8rem] border border-[#e6ddd2] bg-[#fffdf9] p-6 shadow-[0_10px_24px_rgba(91,74,60,0.04)]">
            <p className="text-sm font-semibold text-[#8f7a67]">게시글 신고</p>
            <strong className="mt-3 block text-3xl font-black text-[#4a392f]">{unresolvedPostCount}</strong>
            <p className="mt-2 text-sm text-[#756457]">미확인 신고</p>
          </article>
          <article className="rounded-[1.8rem] border border-[#e6ddd2] bg-[#fffdf9] p-6 shadow-[0_10px_24px_rgba(91,74,60,0.04)]">
            <p className="text-sm font-semibold text-[#8f7a67]">도안 신고</p>
            <strong className="mt-3 block text-3xl font-black text-[#4a392f]">{unresolvedPatternCount}</strong>
            <p className="mt-2 text-sm text-[#756457]">미확인 신고</p>
          </article>
          <article className="rounded-[1.8rem] border border-[#e6ddd2] bg-[#fffdf9] p-6 shadow-[0_10px_24px_rgba(91,74,60,0.04)]">
            <p className="text-sm font-semibold text-[#8f7a67]">숨김 게시글</p>
            <strong className="mt-3 block text-3xl font-black text-[#4a392f]">{hiddenPostCount}</strong>
            <p className="mt-2 text-sm text-[#756457]">복구 대기</p>
          </article>
          <article className="rounded-[1.8rem] border border-[#e6ddd2] bg-[#fffdf9] p-6 shadow-[0_10px_24px_rgba(91,74,60,0.04)]">
            <p className="text-sm font-semibold text-[#8f7a67]">숨김 도안</p>
            <strong className="mt-3 block text-3xl font-black text-[#4a392f]">{hiddenPatternCount}</strong>
            <p className="mt-2 text-sm text-[#756457]">복구 대기</p>
          </article>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <Link
            href="/admin/reports/comments"
            className="rounded-[2rem] border border-[#e6ddd2] bg-[#fffdf9] p-7 shadow-[0_10px_24px_rgba(91,74,60,0.04)] transition hover:-translate-y-0.5 hover:bg-[#fcf8f2]"
          >
            <p className="text-sm font-semibold text-[#8f7a67]">댓글 신고 관리</p>
            <h2 className="mt-3 text-2xl font-black text-[#4a392f]">댓글 신고 확인하기</h2>
            <p className="mt-3 text-sm leading-6 text-[#756457]">
              현재 접수된 댓글 신고를 검토하고, 확인 완료나 미확인 복구를 처리할 수 있어요.
            </p>
            <p className="mt-4 text-sm font-semibold text-[#6f8669]">미확인 {unresolvedCommentCount}건</p>
          </Link>

          <Link
            href="/admin/reports/posts"
            className="rounded-[2rem] border border-[#e6ddd2] bg-[#fffdf9] p-7 shadow-[0_10px_24px_rgba(91,74,60,0.04)] transition hover:-translate-y-0.5 hover:bg-[#fcf8f2]"
          >
            <p className="text-sm font-semibold text-[#8f7a67]">게시글 신고 관리</p>
            <h2 className="mt-3 text-2xl font-black text-[#4a392f]">게시글 신고 확인하기</h2>
            <p className="mt-3 text-sm leading-6 text-[#756457]">
              게시글 신고 내역을 검토하고, 신고 확인과 미확인 복구를 처리할 수 있어요.
            </p>
            <p className="mt-4 text-sm font-semibold text-[#6f8669]">미확인 {unresolvedPostCount}건</p>
          </Link>

          <Link
            href="/admin/reports/patterns"
            className="rounded-[2rem] border border-[#e6ddd2] bg-[#fffdf9] p-7 shadow-[0_10px_24px_rgba(91,74,60,0.04)] transition hover:-translate-y-0.5 hover:bg-[#fcf8f2]"
          >
            <p className="text-sm font-semibold text-[#8f7a67]">도안 신고 관리</p>
            <h2 className="mt-3 text-2xl font-black text-[#4a392f]">도안 신고 확인하기</h2>
            <p className="mt-3 text-sm leading-6 text-[#756457]">
              도안 신고 내역을 검토하고, 신고 확인과 미확인 복구를 처리할 수 있어요.
            </p>
            <p className="mt-4 text-sm font-semibold text-[#6f8669]">미확인 {unresolvedPatternCount}건</p>
          </Link>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <Link
            href="/admin/hidden/posts"
            className="rounded-[2rem] border border-[#e6ddd2] bg-[#fffdf9] p-7 shadow-[0_10px_24px_rgba(91,74,60,0.04)] transition hover:-translate-y-0.5 hover:bg-[#fcf8f2]"
          >
            <p className="text-sm font-semibold text-[#8f7a67]">숨김 게시글 관리</p>
            <h2 className="mt-3 text-2xl font-black text-[#4a392f]">숨김 게시글 복구하기</h2>
            <p className="mt-3 text-sm leading-6 text-[#756457]">
              숨김 처리된 커뮤니티 게시글을 모아 보고, 필요한 게시글은 다시 공개 상태로 복구할 수 있어요.
            </p>
            <p className="mt-4 text-sm font-semibold text-[#6f8669]">현재 {hiddenPostCount}건 숨김</p>
          </Link>

          <Link
            href="/admin/hidden/patterns"
            className="rounded-[2rem] border border-[#e6ddd2] bg-[#fffdf9] p-7 shadow-[0_10px_24px_rgba(91,74,60,0.04)] transition hover:-translate-y-0.5 hover:bg-[#fcf8f2]"
          >
            <p className="text-sm font-semibold text-[#8f7a67]">숨김 도안 관리</p>
            <h2 className="mt-3 text-2xl font-black text-[#4a392f]">숨김 도안 복구하기</h2>
            <p className="mt-3 text-sm leading-6 text-[#756457]">
              숨김 처리된 도안을 따로 모아 보고, 필요한 도안은 다시 목록에 노출되도록 복구할 수 있어요.
            </p>
            <p className="mt-4 text-sm font-semibold text-[#6f8669]">현재 {hiddenPatternCount}건 숨김</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
