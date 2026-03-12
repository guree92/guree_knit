"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import {
  getProgressBadgeClass,
  workFilters,
  workItems,
  type WorkItem,
  type WorkProgress,
} from "@/data/my-work";
import { type WorkFilter } from "@/data/my-work";

type LocalWorkItem = WorkItem;

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-가-힣]/g, "")
      .slice(0, 40) || String(Date.now())
  );
}

export default function MyWorkPage() {
  const [works, setWorks] = useState<LocalWorkItem[]>(workItems);
  const [selectedFilter, setSelectedFilter] = useState<WorkFilter>("전체");
  const [isAdding, setIsAdding] = useState(false);

  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState<WorkProgress>("진행 중");
  const [yarn, setYarn] = useState("");
  const [note, setNote] = useState("");

  const filteredWorks = useMemo(() => {
    if (selectedFilter === "전체") return works;
    return works.filter((work) => work.progress === selectedFilter);
  }, [works, selectedFilter]);

  const summary = useMemo(() => {
    const total = works.length;
    const working = works.filter((work) => work.progress === "진행 중").length;
    const done = works.filter((work) => work.progress === "완성").length;

    return { total, working, done };
  }, [works]);

  const handleOpenAdd = () => {
    setIsAdding(true);
  };

  const resetForm = () => {
    setTitle("");
    setProgress("진행 중");
    setYarn("");
    setNote("");
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    resetForm();
  };

  const handleSubmitWork = () => {
    const trimmedTitle = title.trim();
    const trimmedYarn = yarn.trim();
    const trimmedNote = note.trim();

    if (!trimmedTitle || !trimmedYarn || !trimmedNote) {
      alert("작품명, 사용 실, 메모를 모두 입력해줘.");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    const newWork: LocalWorkItem = {
      id: `${slugify(trimmedTitle)}-${Date.now()}`,
      title: trimmedTitle,
      progress,
      yarn: trimmedYarn,
      note: trimmedNote,
      needle: "미정",
      startedAt: today,
      updatedAt: today,
      detail: trimmedNote,
      checklist: ["새 작품 생성", "세부 단계는 나중에 추가"],
    };

    setWorks((prev) => [newWork, ...prev]);
    setSelectedFilter("전체");
    handleCancelAdd();
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8f4ff_48%,#eef8f2_100%)] px-6 py-8 text-slate-800 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Header />

        <section className="mt-12">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-sm backdrop-blur">
            <div className="inline-flex rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
              MY WORK
            </div>

            <h1 className="mt-4 text-4xl font-black text-slate-800">
              내 작품 기록
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-slate-600">
              사용한 실, 바늘 호수, 진행률, 수정 메모, 완성 사진까지
              내 뜨개 작업을 기록하고 정리할 수 있는 공간이야.
            </p>

            <div className="mt-6">
              {!isAdding ? (
                <button
                  onClick={handleOpenAdd}
                  className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  작품 추가
                </button>
              ) : (
                <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        작품명
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="예: 리본 머플러"
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
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      사용 실
                    </label>
                    <input
                      type="text"
                      value={yarn}
                      onChange={(e) => setYarn(e.target.value)}
                      placeholder="예: 코튼사 / 린넨 혼방"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      메모
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="작업하면서 남기고 싶은 내용을 적어줘"
                      rows={5}
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={handleSubmitWork}
                      className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      등록하기
                    </button>

                    <button
                      onClick={handleCancelAdd}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="rounded-[2rem] bg-violet-50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="text-sm text-violet-700">전체 작품</div>
              <div className="mt-2 text-3xl font-black text-slate-800">
                {summary.total}
              </div>
            </div>

            <div className="rounded-[2rem] bg-emerald-50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="text-sm text-emerald-700">진행 중</div>
              <div className="mt-2 text-3xl font-black text-slate-800">
                {summary.working}
              </div>
            </div>

            <div className="rounded-[2rem] bg-amber-50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="text-sm text-amber-700">완성작</div>
              <div className="mt-2 text-3xl font-black text-slate-800">
                {summary.done}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {workFilters.map((filter) => {
              const isActive = selectedFilter === filter;

              return (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={[
                    "rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition",
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:shadow-md",
                  ].join(" ")}
                >
                  {filter}
                </button>
              );
            })}
          </div>

          <div className="mt-8 space-y-4">
            {filteredWorks.length > 0 ? (
              filteredWorks.map((work) => (
                <Link
                  key={work.id}
                  href={`/my-work/${work.id}`}
                  className="block rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-800">
                      {work.title}
                    </h2>
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        getProgressBadgeClass(work.progress),
                      ].join(" ")}
                    >
                      {work.progress}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    사용 실: {work.yarn}
                  </p>
                  <p className="mt-2 leading-7 text-slate-600">{work.note}</p>

                  <div className="mt-4 text-sm font-semibold text-emerald-700">
                    상세 보기 →
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center shadow-sm">
                <p className="text-lg font-semibold text-slate-700">
                  아직 이 상태의 작품이 없어
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  작품을 추가하거나 다른 필터를 눌러봐.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}