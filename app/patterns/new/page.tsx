"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { patternCategories } from "@/data/patterns";

const levelOptions = ["초급", "중급", "고급"] as const;
const categoryOptions = patternCategories.filter(
  (item) => item !== "전체"
) as Array<(typeof patternCategories)[number]>;

function makeId(text: string) {
  const trimmed = text.trim();

  if (!trimmed) return "";

  return trimmed
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-가-힣]/g, "");
}

export default function NewPatternPage() {
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<(typeof levelOptions)[number]>("초급");
  const [category, setCategory] =
    useState<(typeof categoryOptions)[number]>("가방");
  const [desc, setDesc] = useState("");
  const [yarn, setYarn] = useState("");
  const [needle, setNeedle] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [tips, setTips] = useState(["", "", ""]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const previewId = useMemo(() => makeId(title), [title]);

  const sizeText =
    width.trim() || height.trim()
      ? `가로 ${width.trim() || "0"}cm × 세로 ${height.trim() || "0"}cm`
      : "";

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  function updateTip(index: number, value: string) {
    setTips((prev) => prev.map((tip, i) => (i === index ? value : tip)));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreviewUrl("");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanedTips = tips.map((tip) => tip.trim()).filter(Boolean);
    const finalId = previewId || `pattern-${Date.now()}`;

    const newPattern = {
      id: finalId,
      title: title.trim(),
      level,
      category,
      desc: desc.trim(),
      yarn: yarn.trim(),
      needle: needle.trim(),
      size: sizeText,
      tips: cleanedTips,
      imageName: imageFile?.name ?? "",
    };

    console.log("새 도안 데이터", newPattern);
    console.log("대표 이미지 파일", imageFile);
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8f4ff_48%,#eef8f2_100%)] px-6 py-8 text-slate-800 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Header />

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-sm"
          >
            <Link
              href="/patterns"
              className="inline-flex text-sm font-semibold text-violet-600"
            >
              ← 도안 목록으로
            </Link>

            <div className="mt-6 inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">
              NEW PATTERN
            </div>

            <h1 className="mt-4 text-3xl font-black text-slate-800 md:text-4xl">
              새 도안 등록
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              기본 정보와 대표 이미지를 함께 등록해보자. 지금은 저장 테스트 전
              단계라서, 제출하면 콘솔에 데이터가 찍히게 해둘게.
            </p>

            <div className="mt-8 grid gap-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  도안 제목
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 봄 네트백"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    난이도
                  </span>
                  <select
                    value={level}
                    onChange={(e) =>
                      setLevel(e.target.value as (typeof levelOptions)[number])
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  >
                    {levelOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    카테고리
                  </span>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(
                        e.target.value as (typeof categoryOptions)[number]
                      )
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  >
                    {categoryOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  도안 설명
                </span>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="이 도안이 어떤 작품인지, 어떤 느낌인지 적어줘."
                  rows={5}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    사용 실
                  </span>
                  <input
                    type="text"
                    value={yarn}
                    onChange={(e) => setYarn(e.target.value)}
                    placeholder="예: 코튼 혼방사"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    바늘
                  </span>
                  <input
                    type="text"
                    value={needle}
                    onChange={(e) => setNeedle(e.target.value)}
                    placeholder="예: 코바늘 5호"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </label>
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  완성 크기
                </span>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      width: "100%",
                      flexWrap: "nowrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#475569",
                        }}
                      >
                        가로
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        placeholder="0"
                        className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          width: "100%",
                        }}
                      />

                      <span
                        style={{
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          fontSize: "14px",
                          color: "#64748b",
                        }}
                      >
                        cm
                      </span>
                    </div>

                    <span
                      style={{
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        fontSize: "18px",
                        fontWeight: 700,
                        color: "#94a3b8",
                      }}
                    >
                      ×
                    </span>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#475569",
                        }}
                      >
                        세로
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="0"
                        className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          width: "100%",
                        }}
                      />

                      <span
                        style={{
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          fontSize: "14px",
                          color: "#64748b",
                        }}
                      >
                        cm
                      </span>
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  숫자만 입력하면 자동으로 cm 단위로 표시돼.
                </p>
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  대표 이미지
                </span>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:bg-slate-100">
                    <span className="text-sm font-semibold text-slate-700">
                      이미지 업로드
                    </span>
                    <span className="mt-2 text-xs text-slate-500">
                      JPG, PNG, WEBP 파일을 선택해줘.
                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>

                  {imageFile ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-700">
                          {imageFile.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={removeImage}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                      >
                        이미지 제거
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="mb-2 block text-sm font-semibold text-slate-700">
                  뜨개 팁
                </div>

                <div className="grid gap-3">
                  {tips.map((tip, index) => (
                    <input
                      key={index}
                      type="text"
                      value={tip}
                      onChange={(e) => updateTip(index, e.target.value)}
                      placeholder={`팁 ${index + 1}`}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  ))}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="inline-flex rounded-2xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-600"
                >
                  도안 등록 테스트
                </button>

                <Link
                  href="/patterns"
                  className="inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  취소
                </Link>
              </div>

              {submitted ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  제출됐어. 개발자 도구 콘솔에서 데이터와 이미지 파일이 잘
                  찍혔는지 확인해봐.
                </div>
              ) : null}
            </div>
          </form>

          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800">미리보기</h2>

              <div className="mt-4 rounded-[2rem] border border-slate-100 bg-slate-50 p-5">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-700">
                    {level}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
                    {category}
                  </span>
                </div>

                <h3 className="mt-4 text-2xl font-black text-slate-800">
                  {title.trim() || "도안 제목이 여기에 보여"}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {desc.trim() ||
                    "도안 설명을 입력하면 여기에 미리 보이게 할 수 있어."}
                </p>

                <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white">
  {imagePreviewUrl ? (
    <img
      src={imagePreviewUrl}
      alt="대표 이미지 미리보기"
      className="h-56 w-full object-cover"
    />
  ) : (
    <div className="h-40 bg-[linear-gradient(135deg,#efe7ff,#edf9ef,#fff2e6)]" />
  )}
</div>

                <div className="mt-5 space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                    <span>id</span>
                    <span className="font-semibold text-slate-800">
                      {previewId || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                    <span>사용 실</span>
                    <span className="font-semibold text-slate-800">
                      {yarn.trim() || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                    <span>바늘</span>
                    <span className="font-semibold text-slate-800">
                      {needle.trim() || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                    <span>완성 크기</span>
                    <span className="font-semibold text-slate-800">
                      {sizeText || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span>대표 이미지</span>
                    <span className="truncate font-semibold text-slate-800">
                      {imageFile?.name || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800">
                이번 단계 목표
              </h2>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li className="rounded-2xl bg-slate-50 px-4 py-3">
                  1. 대표 이미지 선택하면 오른쪽 미리보기에 바로 반영되는지 확인
                </li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3">
                  2. 이미지 제거 버튼이 정상 동작하는지 확인
                </li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3">
                  3. 제출하면 콘솔에 이미지 파일 정보가 함께 찍히는지 확인
                </li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}