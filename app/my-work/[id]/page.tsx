"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import {
  getProgressBadgeClass,
  workItems,
  type WorkItem,
  type WorkProgress,
} from "@/data/my-work";

type EditableWorkItem = WorkItem & {
  source?: "seed" | "local";
};

export default function MyWorkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [work, setWork] = useState<EditableWorkItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState<WorkProgress>("진행 중");
  const [yarn, setYarn] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const base = workItems.find((item) => item.id === id);
    let localMatch: EditableWorkItem | null = null;

    try {
      const raw = localStorage.getItem("knit_my_work_extra");
      if (raw) {
        const parsed = JSON.parse(raw) as EditableWorkItem[];
        if (Array.isArray(parsed)) {
          const found = parsed.find((item) => item.id === id);
          if (found) {
            localMatch = { ...found, source: "local" };
          }
        }
      }
    } catch (error) {
      console.error(error);
    }

    const finalWork = localMatch ?? (base ? { ...base, source: "seed" as const } : null);

    setWork(finalWork);

    if (finalWork) {
      setTitle(finalWork.title);
      setProgress(finalWork.progress);
      setYarn(finalWork.yarn);
      setNote(finalWork.note);
    }
  }, [id]);

  const isLocalWork = useMemo(() => work?.source === "local", [work]);

  const handleStartEdit = () => {
    if (!work || !isLocalWork) return;
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (!work) return;
    setTitle(work.title);
    setProgress(work.progress);
    setYarn(work.yarn);
    setNote(work.note);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (!work || !isLocalWork) return;

    const trimmedTitle = title.trim();
    const trimmedYarn = yarn.trim();
    const trimmedNote = note.trim();

    if (!trimmedTitle || !trimmedYarn || !trimmedNote) {
      alert("작품명, 사용 실, 메모를 모두 입력해줘.");
      return;
    }

    try {
      const raw = localStorage.getItem("knit_my_work_extra");
      const parsed = raw ? (JSON.parse(raw) as EditableWorkItem[]) : [];

      const today = new Date().toISOString().slice(0, 10);

      const updatedItem: EditableWorkItem = {
        ...work,
        title: trimmedTitle,
        progress,
        yarn: trimmedYarn,
        note: trimmedNote,
        detail: trimmedNote,
        updatedAt: today,
        source: "local",
      };

      const next = parsed.map((item) =>
        item.id === work.id ? updatedItem : item
      );

      localStorage.setItem("knit_my_work_extra", JSON.stringify(next));
      setWork(updatedItem);
      setIsEditing(false);
      alert("작품 정보를 수정했어.");
    } catch (error) {
      console.error(error);
      alert("수정 중 오류가 발생했어.");
    }
  };

  const handleDelete = () => {
    if (!work || !isLocalWork) return;

    const ok = window.confirm("이 작품을 삭제할까?");
    if (!ok) return;

    try {
      const raw = localStorage.getItem("knit_my_work_extra");
      const parsed = raw ? (JSON.parse(raw) as EditableWorkItem[]) : [];
      const next = parsed.filter((item) => item.id !== work.id);

      localStorage.setItem("knit_my_work_extra", JSON.stringify(next));
      alert("작품을 삭제했어.");
      router.push("/my-work");
    } catch (error) {
      console.error(error);
      alert("삭제 중 오류가 발생했어.");
    }
  };

  if (!work) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8f4ff_48%,#eef8f2_100%)] px-6 py-8 text-slate-800 md:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          <Header />

          <section className="mt-12 rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black text-slate-800">
              없는 작품이야
            </h1>
            <p className="mt-3 text-slate-600">
              요청한 작품 기록 정보를 찾지 못했어.
            </p>
            <Link
              href="/my-work"
              className="mt-6 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
            >
              작품기록으로 돌아가기
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8f4ff_48%,#eef8f2_100%)] px-6 py-8 text-slate-800 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Header />

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-sm">
            <Link
              href="/my-work"
              className="mb-6 inline-flex text-sm font-semibold text-emerald-700"
            >
              ← 작품기록으로
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-black text-slate-800">
                {work.title}
              </h1>
              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  getProgressBadgeClass(work.progress),
                ].join(" ")}
              >
                {work.progress}
              </span>
            </div>

            <p className="mt-4 max-w-2xl leading-7 text-slate-600">
              {work.detail}
            </p>

            <div className="mt-8 h-64 rounded-[2rem] bg-[linear-gradient(135deg,#eefcf5,#f3f0ff,#fff7ee)]" />
          </div>

          <div className="space-y-5">
            <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-800">기본 정보</h2>

                {isLocalWork ? (
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <button
                        onClick={handleStartEdit}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        수정
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                        >
                          저장
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                        >
                          취소
                        </button>
                      </>
                    )}

                    <button
                      onClick={handleDelete}
                      className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white"
                    >
                      삭제
                    </button>
                  </div>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    기본 예시 데이터
                  </span>
                )}
              </div>

              {!isEditing ? (
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                    <span>상태</span>
                    <span className="font-semibold text-slate-800">
                      {work.progress}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                    <span>사용 실</span>
                    <span className="font-semibold text-slate-800">
                      {work.yarn}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                    <span>바늘</span>
                    <span className="font-semibold text-slate-800">
                      {work.needle}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                    <span>시작일</span>
                    <span className="font-semibold text-slate-800">
                      {work.startedAt}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                    <span>최근 수정일</span>
                    <span className="font-semibold text-slate-800">
                      {work.updatedAt}
                    </span>
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <div className="mb-2 text-sm text-slate-500">한줄 메모</div>
                    <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                      {work.note}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      작품명
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      상태
                    </label>
                    <select
                      value={progress}
                      onChange={(e) => setProgress(e.target.value as WorkProgress)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    >
                      <option value="진행 중">진행 중</option>
                      <option value="완성">완성</option>
                      <option value="중단">중단</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      사용 실
                    </label>
                    <input
                      type="text"
                      value={yarn}
                      onChange={(e) => setYarn(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      메모
                    </label>
                    <textarea
                      rows={5}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800">진행 체크</h2>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                {work.checklist.map((item) => (
                  <li key={item} className="rounded-2xl bg-slate-50 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}