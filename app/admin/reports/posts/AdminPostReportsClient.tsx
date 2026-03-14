"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

type ReportItem = {
  id: string;
  postId: string;
  postTitle: string | null;
  postAuthorName: string | null;
  postAuthorEmail: string | null;
  reporterNickname: string | null;
  reporterEmail: string | null;
  createdAt: string | null;
  isResolved: boolean;
  resolvedAt: string | null;
};

type Props = {
  initialReports: ReportItem[];
};

type TabKey = "pending" | "resolved";

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function AdminPostReportsClient({ initialReports }: Props) {
  const [reports, setReports] = useState(initialReports);
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const [pendingReportId, setPendingReportId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pendingReports = useMemo(
    () => reports.filter((report) => !report.isResolved),
    [reports]
  );
  const resolvedReports = useMemo(
    () => reports.filter((report) => report.isResolved),
    [reports]
  );

  const visibleReports = activeTab === "pending" ? pendingReports : resolvedReports;

  function updateReportStatus(reportId: string, nextResolved: boolean) {
    setPendingReportId(reportId);

    startTransition(async () => {
      const response = await fetch(`/api/admin/post-reports/${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isResolved: nextResolved }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;

        alert(result?.message ?? "신고 상태 변경에 실패했어요.");
        setPendingReportId(null);
        return;
      }

      const result = (await response.json()) as {
        report: {
          id: string;
          is_resolved: boolean;
          resolved_at: string | null;
        };
      };

      setReports((current) =>
        current.map((report) =>
          report.id === reportId
            ? {
                ...report,
                isResolved: result.report.is_resolved,
                resolvedAt: result.report.resolved_at,
              }
            : report
        )
      );
      setPendingReportId(null);
    });
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={[
            "rounded-full px-4 py-2 text-sm font-semibold transition",
            activeTab === "pending"
              ? "bg-[#8a9b84] text-white shadow-[0_10px_18px_rgba(111,130,107,0.22)]"
              : "border border-[#ddd3c8] bg-[#fffdf9] text-[#6f6054] hover:bg-[#f3ede6]",
          ].join(" ")}
        >
          미확인 신고 {pendingReports.length}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("resolved")}
          className={[
            "rounded-full px-4 py-2 text-sm font-semibold transition",
            activeTab === "resolved"
              ? "bg-[#8a9b84] text-white shadow-[0_10px_18px_rgba(111,130,107,0.22)]"
              : "border border-[#ddd3c8] bg-[#fffdf9] text-[#6f6054] hover:bg-[#f3ede6]",
          ].join(" ")}
        >
          신고 확인 {resolvedReports.length}
        </button>
      </div>

      {visibleReports.length > 0 ? (
        <div className="mt-5 space-y-4">
          {visibleReports.map((report) => {
            const isOpen = openReportId === report.id;
            const isSaving = isPending && pendingReportId === report.id;

            return (
              <article
                key={report.id}
                className="rounded-[2rem] border border-[#e3d9cd] bg-[#fffdf9] p-6 shadow-[0_10px_24px_rgba(91,74,60,0.05)]"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <button
                    type="button"
                    onClick={() => setOpenReportId(isOpen ? null : report.id)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b8b7f]">
                        Post Report
                      </p>
                      <h2 className="mt-2 truncate text-xl font-black text-[#4a392f] md:text-2xl">
                        {report.postTitle ?? "삭제된 게시글"}
                      </h2>
                      <p className="mt-2 text-sm text-[#8b7b6e]">
                        접수 시각 · {formatDate(report.createdAt)}
                      </p>
                    </div>
                    <span className="rounded-full border border-[#ddd3c8] bg-[#f8f4ee] px-4 py-2 text-sm font-semibold text-[#6f6054]">
                      {isOpen ? "접기" : "열기"}
                    </span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    {activeTab === "pending" ? (
                      <button
                        type="button"
                        onClick={() => updateReportStatus(report.id, true)}
                        disabled={isSaving}
                        className="rounded-full bg-[#8a9b84] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#788a73] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSaving ? "처리 중..." : "신고 확인"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => updateReportStatus(report.id, false)}
                        disabled={isSaving}
                        className="rounded-full border border-[#ddd3c8] bg-[#fffdf9] px-4 py-2 text-sm font-semibold text-[#6f6054] transition hover:bg-[#f3ede6] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSaving ? "복구 중..." : "미확인으로 복구"}
                      </button>
                    )}
                  </div>
                </div>

                {isOpen ? (
                  <div className="mt-5 space-y-4 border-t border-[#efe5da] pt-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-[1.4rem] border border-[#e7ddd1] bg-[#f8f4ee] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9b8b7f]">
                          신고자
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#5a493d]">
                          {report.reporterNickname ?? "닉네임 없음"}
                        </p>
                        <p className="mt-1 break-all text-sm text-[#7b6c60]">
                          {report.reporterEmail ?? "이메일 없음"}
                        </p>
                      </div>

                      <div className="rounded-[1.4rem] border border-[#e7ddd1] bg-[#f8f4ee] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9b8b7f]">
                          게시글 작성자
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#5a493d]">
                          {report.postAuthorName ?? "알 수 없음"}
                        </p>
                        <p className="mt-1 break-all text-sm text-[#7b6c60]">
                          {report.postAuthorEmail ?? "이메일 없음"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[1.6rem] border border-[#e7ddd1] bg-[#f8f4ee] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9b8b7f]">
                        신고된 게시글
                      </p>
                      <p className="mt-3 text-lg font-black text-[#4a392f]">
                        {report.postTitle ?? "삭제된 게시글"}
                      </p>
                      {report.postId ? (
                        <Link
                          href={`/community/${report.postId}`}
                          className="mt-4 inline-flex text-sm font-semibold text-[#6f8669] transition hover:text-[#55714f]"
                        >
                          해당 게시글로 이동
                        </Link>
                      ) : null}
                    </div>

                    {report.isResolved ? (
                      <p className="text-sm text-[#8b7b6e]">
                        확인 시각 · {formatDate(report.resolvedAt)}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <section className="mt-5 rounded-[2rem] border border-dashed border-[#d9cec2] bg-[#f8f4ee] p-10 text-center shadow-sm">
          <h2 className="text-xl font-black text-[#4a392f]">
            {activeTab === "pending" ? "미확인 신고가 없어요" : "확인 완료된 신고가 없어요"}
          </h2>
          <p className="mt-3 text-[#756457]">
            {activeTab === "pending"
              ? "현재 확인할 게시글 신고 내역이 없습니다."
              : "아직 처리 완료된 게시글 신고가 없습니다."}
          </p>
        </section>
      )}
    </section>
  );
}
