"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { getEffectiveCompanionParticipantActivityStatus, type CompanionParticipantActivityStatus } from "@/lib/companion";
import {
  getProgressBadgeClass,
  workItems,
  type WorkProgress,
} from "@/data/my-work";
import { createClient } from "@/lib/supabase/client";
import { readStoredWorkItems, writeStoredWorkItems, type StoredWorkItem } from "@/lib/my-work-storage";

const seedWorkItems: StoredWorkItem[] = workItems.map((item) => ({
  ...item,
  source: "seed",
}));

export default function MyWorkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const supabase = useMemo(() => createClient(), []);

  const [work, setWork] = useState<StoredWorkItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState<WorkProgress>("진행 중");
  const [yarn, setYarn] = useState("");
  const [note, setNote] = useState("");
  const [companionActivity, setCompanionActivity] = useState<CompanionParticipantActivityStatus | null>(null);

  useEffect(() => {
    const seedMatch = seedWorkItems.find((item) => item.id === id) ?? null;
    const localMatch = readStoredWorkItems().find((item) => item.id === id) ?? null;
    const nextWork = localMatch ?? seedMatch;

    setWork(nextWork);

    if (nextWork) {
      setTitle(nextWork.title);
      setProgress(nextWork.progress);
      setYarn(nextWork.yarn);
      setNote(nextWork.note);
    }
  }, [id]);

  useEffect(() => {
    let isCancelled = false;

    async function fetchCompanionActivity() {
      if (!work?.sourceCompanionRoomId) {
        setCompanionActivity(null);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!isCancelled) setCompanionActivity(null);
        return;
      }

      const { data, error } = await supabase
        .from("companion_participants")
        .select("role, activity_status, last_activity_at, joined_at")
        .eq("room_id", work.sourceCompanionRoomId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (isCancelled) return;

      if (error || !data) {
        if (error) console.error(error);
        setCompanionActivity(null);
        return;
      }

      setCompanionActivity(
        getEffectiveCompanionParticipantActivityStatus({
          role: data.role,
          activity_status: data.activity_status,
          last_activity_at: data.last_activity_at,
          joined_at: data.joined_at,
        })
      );
    }

    void fetchCompanionActivity();

    return () => {
      isCancelled = true;
    };
  }, [supabase, work?.sourceCompanionRoomId]);

  const isLocalWork = useMemo(() => work?.source === "local", [work]);
  const isCompanionLocked = companionActivity === "resting" || companionActivity === "waiting";
  const companionBadgeLabel =
    companionActivity === "waiting" ? "동행 복귀 대기중" : companionActivity === "resting" ? "동행 휴식 중" : null;
  const effectiveProgress = isCompanionLocked ? "중단" : work?.progress ?? "진행 중";
  const effectiveProgressLabel =
    companionActivity === "waiting"
      ? "동행 복귀 대기중"
      : companionActivity === "resting"
        ? "동행 휴식 중"
        : work?.progress ?? "진행 중";

  useEffect(() => {
    if (isCompanionLocked) {
      setIsEditing(false);
    }
  }, [isCompanionLocked]);

  function handleCancelEdit() {
    if (!work) return;

    setTitle(work.title);
    setProgress(work.progress);
    setYarn(work.yarn);
    setNote(work.note);
    setIsEditing(false);
  }

  function handleSaveEdit() {
    if (!work || !isLocalWork) return;
    if (isCompanionLocked) {
      alert("동행이 휴식 중이거나 복귀 대기 중일 때는 작품 기록을 수정할 수 없어요.");
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedYarn = yarn.trim();
    const trimmedNote = note.trim();

    if (!trimmedTitle || !trimmedYarn || !trimmedNote) {
      alert("작품명, 사용 실, 메모를 모두 입력해 주세요.");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const updatedItem: StoredWorkItem = {
      ...work,
      title: trimmedTitle,
      progress,
      yarn: trimmedYarn,
      note: trimmedNote,
      detail: trimmedNote,
      updatedAt: today,
      source: "local",
    };

    const nextLocalItems = readStoredWorkItems();
    const nextIndex = nextLocalItems.findIndex((item) => item.id === work.id);

    if (nextIndex >= 0) {
      nextLocalItems[nextIndex] = updatedItem;
    } else {
      nextLocalItems.unshift(updatedItem);
    }

    writeStoredWorkItems(nextLocalItems);
    setWork(updatedItem);
    setIsEditing(false);
    alert("작품 정보를 수정했어요.");
  }

  function handleDelete() {
    if (!work || !isLocalWork) return;
    if (isCompanionLocked) {
      alert("동행이 다시 활성화되기 전까지는 연결된 작품을 삭제할 수 없어요.");
      return;
    }

    const shouldDelete = window.confirm("이 작품을 삭제할까요?");
    if (!shouldDelete) return;

    const nextLocalItems = readStoredWorkItems().filter((item) => item.id !== work.id);
    writeStoredWorkItems(nextLocalItems);
    alert("작품을 삭제했어요.");
    router.push("/archive");
  }

  if (!work) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8f4ff_48%,#eef8f2_100%)] px-6 py-8 text-slate-800 md:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          <Header />

          <section className="mt-12 rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black text-slate-800">작품을 찾을 수 없어요.</h1>
            <p className="mt-3 text-slate-600">요청한 작업기록 정보가 없거나 이미 삭제되었어요.</p>
            <Link
              href="/archive"
              className="mt-6 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
            >
              작업기록으로 돌아가기
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
            <Link href="/archive" className="mb-6 inline-flex text-sm font-semibold text-emerald-700">
              작업기록으로
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-black text-slate-800">{work.title}</h1>
              {companionBadgeLabel ? (
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  {companionBadgeLabel}
                </span>
              ) : null}
              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  getProgressBadgeClass(effectiveProgress),
                ].join(" ")}
              >
                {effectiveProgressLabel}
              </span>
            </div>

            <p className="mt-4 max-w-2xl leading-7 text-slate-600">{work.detail}</p>
            {isCompanionLocked ? (
              <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-800">
                동행이 휴식 상태이거나 복귀 순서를 기다리는 중이라 지금은 작품 기록이 잠겨 있어요.
                {work.sourceCompanionRoomId ? (
                  <>
                    {" "}
                    <Link href={`/companion/${work.sourceCompanionRoomId}`} className="font-semibold underline underline-offset-2">
                      연결된 동행으로 이동
                    </Link>
                    해서 상태를 확인해 보세요.
                  </>
                ) : null}
              </div>
            ) : null}

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
                        type="button"
                        onClick={() => {
                          if (isCompanionLocked) {
                            alert("동행이 다시 활성화되면 작품 기록을 수정할 수 있어요.");
                            return;
                          }
                          setIsEditing(true);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        수정
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                        >
                          취소
                        </button>
                      </>
                    )}

                    {!isCompanionLocked ? (
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white"
                      >
                        삭제
                      </button>
                    ) : null}
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
                    <span className="font-semibold text-slate-800">{effectiveProgressLabel}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                    <span>사용 실</span>
                    <span className="font-semibold text-slate-800">{work.yarn}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                    <span>바늘</span>
                    <span className="font-semibold text-slate-800">{work.needle}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                    <span>시작일</span>
                    <span className="font-semibold text-slate-800">{work.startedAt}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                    <span>마지막 수정일</span>
                    <span className="font-semibold text-slate-800">{work.updatedAt}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <div className="mb-2 text-sm text-slate-500">메모</div>
                    <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                      {work.note}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">작품명</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">상태</label>
                    <select
                      value={progress}
                      onChange={(event) => setProgress(event.target.value as WorkProgress)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    >
                      <option value="진행 중">진행 중</option>
                      <option value="완성">완성</option>
                      <option value="중단">중단</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">사용 실</label>
                    <input
                      type="text"
                      value={yarn}
                      onChange={(event) => setYarn(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">메모</label>
                    <textarea
                      rows={5}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
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
