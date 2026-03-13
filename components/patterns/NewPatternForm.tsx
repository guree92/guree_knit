"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { patternCategories } from "@/data/patterns";
import { createClient } from "@/lib/supabase/client";

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

export default function NewPatternForm() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<(typeof levelOptions)[number]>("초급");
  const [category, setCategory] =
    useState<(typeof categoryOptions)[number]>("가방");
  const [description, setDescription] = useState("");
  const [yarn, setYarn] = useState("");
  const [needle, setNeedle] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [gaugeStitches, setGaugeStitches] = useState("");
  const [gaugeRows, setGaugeRows] = useState("");
  const [tips, setTips] = useState(["", "", ""]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const previewId = useMemo(() => makeId(title), [title]);

  const sizeText =
    width.trim() || height.trim()
      ? `가로 ${width.trim() || "0"}cm X 세로 ${height.trim() || "0"}cm`
      : "";

  const gaugeText =
    gaugeStitches.trim() || gaugeRows.trim()
      ? `${gaugeStitches.trim() || "0"}코 X ${gaugeRows.trim() || "0"}단`
      : "";

  const finalSizeText = [sizeText, gaugeText].filter(Boolean).join("\n");

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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!title.trim()) {
      alert("도안 제목을 입력해줘.");
      return;
    }

    setSubmitting(true);
    setSubmitted(false);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("유저 조회 오류", userError);
      }

      if (!user) {
        alert("로그인 후 등록할 수 있어.");
        router.push("/login");
        return;
      }

      const cleanedTips = tips.map((tip) => tip.trim()).filter(Boolean);
      const finalId = `${previewId || "pattern"}-${Date.now()}`;

      let imagePath = "";

      if (imageFile) {
        const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${Date.now()}.${ext}`;
        imagePath = `${user.id}/${finalId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("pattern-images")
          .upload(imagePath, imageFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }
      }

      const { error: insertError } = await supabase.from("patterns").insert({
        id: finalId,
        user_id: user.id,
        title: title.trim(),
        level,
        category,
        description: description.trim(),
        yarn: yarn.trim(),
        needle: needle.trim(),
        size: finalSizeText,
        tips: cleanedTips,
        image_path: imagePath,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setSubmitted(true);
      router.push(`/patterns/${finalId}`);
      router.refresh();
    } catch (error) {
      console.error("도안 등록 실패", error);

      const message =
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어.";

      alert(`도안 등록 실패: ${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fcfaf6] px-6 py-8 text-[#4b3a2f] md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Header />

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[2.25rem] border border-[#e6ddd2] bg-[#f8f4ee] p-8 shadow-[0_10px_30px_rgba(91,74,60,0.06)]"
          >
            <Link
              href="/patterns"
              className="inline-flex text-sm font-semibold text-[#7b9274] transition hover:text-[#5f7759]"
            >
              ← 도안 목록으로
            </Link>

            <div className="mt-6 inline-flex rounded-full border border-[#d9d0c6] bg-[#fdfaf6] px-4 py-2 text-sm font-semibold text-[#8f7a67]">
              NEW PATTERN
            </div>

            <h1 className="mt-4 text-3xl font-black text-[#4a392f] md:text-4xl">
              새 도안 등록
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-[#756457]">
              기본 정보와 대표 이미지를 함께 등록해보자.
              차분한 톤으로 미리보기까지 바로 확인할 수 있게 해뒀어.
            </p>

            <div className="mt-8 grid gap-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#5f5044]">
                  도안 제목
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 봄 네트백"
                  className="w-full rounded-[1.4rem] border border-[#ddd3c8] bg-[#fffdf9] px-4 py-3 text-sm text-[#4b3a2f] outline-none transition placeholder:text-[#aa9a8c] focus:border-[#9aaa97] focus:ring-4 focus:ring-[#dfe7db]"
                />
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#5f5044]">
                    난이도
                  </span>
                  <select
                    value={level}
                    onChange={(e) =>
                      setLevel(e.target.value as (typeof levelOptions)[number])
                    }
                    className="w-full rounded-[1.4rem] border border-[#ddd3c8] bg-[#fffdf9] px-4 py-3 text-sm text-[#4b3a2f] outline-none transition focus:border-[#9aaa97] focus:ring-4 focus:ring-[#dfe7db]"
                  >
                    {levelOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#5f5044]">
                    카테고리
                  </span>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(
                        e.target.value as (typeof categoryOptions)[number]
                      )
                    }
                    className="w-full rounded-[1.4rem] border border-[#ddd3c8] bg-[#fffdf9] px-4 py-3 text-sm text-[#4b3a2f] outline-none transition focus:border-[#9aaa97] focus:ring-4 focus:ring-[#dfe7db]"
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
                <span className="mb-2 block text-sm font-semibold text-[#5f5044]">
                  도안 설명
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="이 도안이 어떤 작품인지, 어떤 느낌인지 적어줘."
                  rows={5}
                  className="w-full resize-none rounded-[1.4rem] border border-[#ddd3c8] bg-[#fffdf9] px-4 py-3 text-sm leading-6 text-[#4b3a2f] outline-none transition placeholder:text-[#aa9a8c] focus:border-[#9aaa97] focus:ring-4 focus:ring-[#dfe7db]"
                />
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#5f5044]">
                    사용 실
                  </span>
                  <input
                    type="text"
                    value={yarn}
                    onChange={(e) => setYarn(e.target.value)}
                    placeholder="예: 코튼 혼방사"
                    className="w-full rounded-[1.4rem] border border-[#ddd3c8] bg-[#fffdf9] px-4 py-3 text-sm text-[#4b3a2f] outline-none transition placeholder:text-[#aa9a8c] focus:border-[#9aaa97] focus:ring-4 focus:ring-[#dfe7db]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#5f5044]">
                    바늘
                  </span>
                  <input
                    type="text"
                    value={needle}
                    onChange={(e) => setNeedle(e.target.value)}
                    placeholder="예: 코바늘 5호"
                    className="w-full rounded-[1.4rem] border border-[#ddd3c8] bg-[#fffdf9] px-4 py-3 text-sm text-[#4b3a2f] outline-none transition placeholder:text-[#aa9a8c] focus:border-[#9aaa97] focus:ring-4 focus:ring-[#dfe7db]"
                  />
                </label>
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold text-[#5f5044]">
                  완성 크기
                </span>

                <div className="rounded-[1.6rem] border border-[#e1d7cb] bg-[#fffdf9] px-4 py-4">
                  <div className="flex w-full flex-nowrap items-center gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span className="whitespace-nowrap text-sm font-semibold text-[#6a5b4f]">
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
                        className="w-full min-w-0 flex-1 rounded-[1.2rem] border border-transparent bg-[#f5f0e9] px-4 py-3 text-sm text-[#4b3a2f] outline-none placeholder:text-[#aa9a8c] focus:border-[#d7ddd2] focus:bg-white focus:ring-2 focus:ring-[#e5ece1]"
                      />
                      <span className="whitespace-nowrap text-sm text-[#857569]">
                        cm
                      </span>
                    </div>

                    <span className="whitespace-nowrap text-lg font-bold text-[#b4a79a]">
                      ×
                    </span>

                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span className="whitespace-nowrap text-sm font-semibold text-[#6a5b4f]">
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
                        className="w-full min-w-0 flex-1 rounded-[1.2rem] border border-transparent bg-[#f5f0e9] px-4 py-3 text-sm text-[#4b3a2f] outline-none placeholder:text-[#aa9a8c] focus:border-[#d7ddd2] focus:bg-white focus:ring-2 focus:ring-[#e5ece1]"
                      />
                      <span className="whitespace-nowrap text-sm text-[#857569]">
                        cm
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[1.2rem] bg-[#f8f4ee] px-4 py-4">
                    <span className="mb-3 block text-sm font-semibold text-[#6a5b4f]">
                      게이지
                    </span>

                    <div className="flex w-full flex-nowrap items-center gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={gaugeStitches}
                          onChange={(e) => setGaugeStitches(e.target.value)}
                          placeholder="0"
                          className="w-full min-w-0 flex-1 rounded-[1.2rem] border border-transparent bg-white px-4 py-3 text-sm text-[#4b3a2f] outline-none placeholder:text-[#aa9a8c] focus:border-[#d7ddd2] focus:ring-2 focus:ring-[#e5ece1]"
                        />
                        <span className="whitespace-nowrap text-sm text-[#857569]">
                          코
                        </span>
                      </div>

                      <span className="whitespace-nowrap text-lg font-bold text-[#b4a79a]">
                        *
                      </span>

                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={gaugeRows}
                          onChange={(e) => setGaugeRows(e.target.value)}
                          placeholder="0"
                          className="w-full min-w-0 flex-1 rounded-[1.2rem] border border-transparent bg-white px-4 py-3 text-sm text-[#4b3a2f] outline-none placeholder:text-[#aa9a8c] focus:border-[#d7ddd2] focus:ring-2 focus:ring-[#e5ece1]"
                        />
                        <span className="whitespace-nowrap text-sm text-[#857569]">
                          단
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-xs text-[#8b7b6e]">
                  숫자만 입력하면 크기와 게이지 형식이 자동으로 만들어져.
                </p>
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold text-[#5f5044]">
                  대표 이미지
                </span>

                <div className="rounded-[1.6rem] border border-[#e1d7cb] bg-[#fffdf9] p-4">
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-[1.3rem] border border-dashed border-[#d8cec2] bg-[#f6f1ea] px-6 py-8 text-center transition hover:bg-[#f1ebe4]">
                    <span className="text-sm font-semibold text-[#5f5044]">
                      이미지 업로드
                    </span>
                    <span className="mt-2 text-xs text-[#8b7b6e]">
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
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.3rem] border border-[#e5ddd3] bg-[#f8f4ee] px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#5c4c40]">
                          {imageFile.name}
                        </p>
                        <p className="mt-1 text-xs text-[#8b7b6e]">
                          {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={removeImage}
                        className="rounded-xl border border-[#ddd3c8] bg-[#fffdf9] px-3 py-2 text-xs font-semibold text-[#6f6054] transition hover:bg-[#f6f1ea]"
                      >
                        이미지 제거
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="mb-2 block text-sm font-semibold text-[#5f5044]">
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
                      className="w-full rounded-[1.4rem] border border-[#ddd3c8] bg-[#fffdf9] px-4 py-3 text-sm text-[#4b3a2f] outline-none transition placeholder:text-[#aa9a8c] focus:border-[#9aaa97] focus:ring-4 focus:ring-[#dfe7db]"
                    />
                  ))}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex rounded-[1.3rem] bg-[#96a792] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(150,167,146,0.28)] transition hover:bg-[#879a83] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "등록 중..." : "도안 등록"}
                </button>

                <Link
                  href="/patterns"
                  className="inline-flex rounded-[1.3rem] border border-[#ddd3c8] bg-[#fffdf9] px-5 py-3 text-sm font-semibold text-[#6f6054] transition hover:bg-[#f6f1ea]"
                >
                  취소
                </Link>
              </div>

              {submitted ? (
                <div className="rounded-[1.4rem] border border-[#d5e0d2] bg-[#edf3ea] px-4 py-3 text-sm text-[#62785d]">
                  도안이 정상 등록됐어.
                </div>
              ) : null}
            </div>
          </form>

          <aside className="space-y-5">
            <div className="rounded-[2.25rem] border border-[#e6ddd2] bg-[#f8f4ee] p-6 shadow-[0_10px_30px_rgba(91,74,60,0.06)]">
              <h2 className="text-xl font-black text-[#4a392f]">미리보기</h2>

              <div className="mt-4 rounded-[2rem] border border-[#e5ddd3] bg-[#fffdf9] p-5">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-[#d7ddd2] bg-[#edf3ea] px-3 py-1 font-semibold text-[#6f8669]">
                    {level}
                  </span>
                  <span className="rounded-full border border-[#e4d7cb] bg-[#f6eee6] px-3 py-1 font-semibold text-[#8b725d]">
                    {category}
                  </span>
                </div>

                <h3 className="mt-4 text-2xl font-black text-[#4a392f]">
                  {title.trim() || "도안 제목이 여기에 보여"}
                </h3>

                <p className="mt-3 text-sm leading-6 text-[#77685d]">
                  {description.trim() ||
                    "도안 설명을 입력하면 여기에 미리 보이게 할 수 있어."}
                </p>

                <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-[#ebe3d9] bg-white">
                  {imagePreviewUrl ? (
                    <img
                      src={imagePreviewUrl}
                      alt="대표 이미지 미리보기"
                      className="h-56 w-full object-cover"
                    />
                  ) : (
                    <div className="h-44 bg-[linear-gradient(135deg,#f3ede4_0%,#e4ebe2_55%,#f8f4ee_100%)]" />
                  )}
                </div>

                <div className="mt-5 space-y-2 text-sm text-[#77685d]">
                  <div className="flex justify-between gap-4 border-b border-[#eee5db] pb-2">
                    <span>id</span>
                    <span className="font-semibold text-[#4a392f]">
                      {previewId || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-b border-[#eee5db] pb-2">
                    <span>사용 실</span>
                    <span className="font-semibold text-[#4a392f]">
                      {yarn.trim() || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-b border-[#eee5db] pb-2">
                    <span>바늘</span>
                    <span className="font-semibold text-[#4a392f]">
                      {needle.trim() || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-b border-[#eee5db] pb-2">
                    <span>완성 크기</span>
                    <span className="font-semibold text-[#4a392f]">
                      {sizeText || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-b border-[#eee5db] pb-2">
                    <span>게이지</span>
                    <span className="font-semibold text-[#4a392f]">
                      {gaugeText || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span>대표 이미지</span>
                    <span className="truncate font-semibold text-[#4a392f]">
                      {imageFile?.name || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2.25rem] border border-[#e6ddd2] bg-[#f8f4ee] p-6 shadow-[0_10px_30px_rgba(91,74,60,0.06)]">
              <h2 className="text-xl font-black text-[#4a392f]">
                이번 단계 목표
              </h2>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#756457]">
                <li className="rounded-[1.3rem] border border-[#e7ddd1] bg-[#fffdf9] px-4 py-3">
                  1. 대표 이미지 선택하면 오른쪽 미리보기에 바로 반영
                </li>
                <li className="rounded-[1.3rem] border border-[#e7ddd1] bg-[#fffdf9] px-4 py-3">
                  2. 등록하면 Storage + DB 둘 다 저장
                </li>
                <li className="rounded-[1.3rem] border border-[#e7ddd1] bg-[#fffdf9] px-4 py-3">
                  3. 등록 직후 목록 페이지에서 새 도안이 보이는지 확인
                </li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}