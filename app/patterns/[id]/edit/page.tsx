"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import PatternDetailEditor from "@/components/patterns/PatternDetailEditor";
import { patternCategories } from "@/data/patterns";
import {
  normalizeDetailRows,
  type DetailRow,
  type NeedleType,
} from "@/lib/pattern-detail";
import { createClient } from "@/lib/supabase/client";
import { getPatternById, getPatternImageUrl } from "@/lib/patterns";

const levelOptions = ["초급", "중급", "고급"] as const;
const needleTypeOptions = ["\uCF54\uBC14\uB298", "\uB300\uBC14\uB298"] as const;
const categoryOptions = patternCategories.slice(1) as Array<
  (typeof patternCategories)[number]
>;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function parseSize(sizeText: string) {
  const [width = "", height = "", gaugeStitches = "", gaugeRows = ""] = (
    sizeText.match(/\d+/g) ?? []
  ).slice(0, 4);

  return {
    width,
    height,
    gaugeStitches,
    gaugeRows,
  };
}

function parseNeedleInput(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      needleType: needleTypeOptions[0],
      needleSize: "",
    };
  }

  const detectedType =
    needleTypeOptions.find((option) => trimmed.includes(option)) ?? needleTypeOptions[0];
  const sizeOnly = trimmed.replace("\uCF54\uBC14\uB298", "").replace("\uB300\uBC14\uB298", "").replace("\uD638", "").trim();

  return {
    needleType: detectedType,
    needleSize: sizeOnly,
  };
}

function buildNeedleValue(
  needleType: (typeof needleTypeOptions)[number],
  needleSize: string
) {
  const trimmedSize = needleSize.trim();
  return trimmedSize ? `${needleType} ${trimmedSize}\uD638` : needleType;
}

export default function EditPatternPage({ params }: PageProps) {
  const router = useRouter();
  const supabase = createClient();

  const [patternId, setPatternId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<(typeof levelOptions)[number]>("초급");
  const [category, setCategory] =
    useState<(typeof categoryOptions)[number]>(categoryOptions[0]);
  const [description, setDescription] = useState("");
  const [yarn, setYarn] = useState("");
  const [needleType, setNeedleType] = useState<(typeof needleTypeOptions)[number]>(needleTypeOptions[0]);
  const [needleSize, setNeedleSize] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [gaugeStitches, setGaugeStitches] = useState("");
  const [gaugeRows, setGaugeRows] = useState("");
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [detailContent, setDetailContent] = useState("");

  const [existingImagePath, setExistingImagePath] = useState("");
  const [existingImageUrl, setExistingImageUrl] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);

  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const previewSizeText =
    width.trim() || height.trim()
      ? `가로 ${width.trim() || "0"}cm X 세로 ${height.trim() || "0"}cm`
      : "";

  const previewGaugeText =
    gaugeStitches.trim() || gaugeRows.trim()
      ? `${gaugeStitches.trim() || "0"} x ${gaugeRows.trim() || "0"}`
      : "";

  const finalSizeText = [previewSizeText, previewGaugeText]
    .filter(Boolean)
    .join("\n");
  const needleText = useMemo(
    () => buildNeedleValue(needleType, needleSize),
    [needleSize, needleType]
  );
  const previewImageSrc = useMemo(() => {
    if (imagePreviewUrl) return imagePreviewUrl;
    if (!removeCurrentImage && existingImageUrl) return existingImageUrl;
    return "";
  }, [imagePreviewUrl, existingImageUrl, removeCurrentImage]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.body.style.overflow = "";
  }, []);

  useEffect(() => {
    async function loadPattern() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("사용자 조회 실패", userError);
        }

        if (!user) {
          router.push("/login");
          return;
        }

        setCurrentUserId(user.id);

        const { id } = await params;
        setPatternId(id);

        const pattern = await getPatternById(id);

        if (!pattern) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        if (pattern.user_id !== user.id) {
          setForbidden(true);
          setLoading(false);
          return;
        }

        const parsedSize = parseSize(pattern.size || "");

        setTitle(pattern.title);
        setLevel(pattern.level);
        setCategory(pattern.category as (typeof categoryOptions)[number]);
        setDescription(pattern.description || "");
        setYarn(pattern.yarn || "");
        const parsedNeedle = parseNeedleInput(pattern.needle || "");
        setNeedleType(parsedNeedle.needleType);
        setNeedleSize(parsedNeedle.needleSize);
        setWidth(parsedSize.width);
        setHeight(parsedSize.height);
        setGaugeStitches(parsedSize.gaugeStitches);
        setGaugeRows(parsedSize.gaugeRows);

        setDetailRows(normalizeDetailRows(pattern.detail_rows, pattern.detail_content));
        setDetailContent(pattern.detail_content || "");

        setExistingImagePath(pattern.image_path || "");
        setExistingImageUrl(
          pattern.image_path ? getPatternImageUrl(pattern.image_path) : ""
        );
      } catch (error) {
        console.error("도안 수정 페이지 로드 실패", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    loadPattern();
  }, [params, router, supabase]);

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

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);

    if (file) {
      setRemoveCurrentImage(false);
    }
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreviewUrl("");
    setRemoveCurrentImage(true);
  }

  function handleKeepCurrentImage() {
    setRemoveCurrentImage(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!patternId) return;

    if (!title.trim()) {
      alert("도안 제목을 입력해 주세요.");
      return;
    }

    if (!currentUserId) {
      alert("로그인 후에 수정할 수 있어요.");
      router.push("/login");
      return;
    }

    setSubmitting(true);

    try {
      let finalImagePath = existingImagePath;

      const shouldDeleteOldImage =
        !!existingImagePath && (removeCurrentImage || !!imageFile);

      if (shouldDeleteOldImage) {
        const { error: removeOldImageError } = await supabase.storage
          .from("pattern-images")
          .remove([existingImagePath]);

        if (removeOldImageError) {
          throw new Error(removeOldImageError.message);
        }

        finalImagePath = "";
      }

      if (imageFile) {
        const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${Date.now()}.${ext}`;
        finalImagePath = `${currentUserId}/${patternId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("pattern-images")
          .upload(finalImagePath, imageFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }
      }

      if (!imageFile && removeCurrentImage) {
        finalImagePath = "";
      }

      const { error: updateError } = await supabase
        .from("patterns")
        .update({
          title: title.trim(),
          level,
          category,
          description: description.trim(),
          detail_content: detailContent.trim(),
          detail_rows: detailRows,
          yarn: yarn.trim(),
          needle: needleText,
          size: finalSizeText,
          image_path: finalImagePath,
        })
        .eq("id", patternId)
        .eq("user_id", currentUserId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      alert("도안이 수정됐어요.");
      router.push(`/patterns/${patternId}`);
      router.refresh();
    } catch (error) {
      console.error("도안 수정 실패", error);

      const message =
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요.";

      alert(`도안 수정 실패: ${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fcfaf6] px-6 py-8 text-[#4b3a2f] md:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          <Header />
          <section className="mt-12 rounded-[2.25rem] border border-[#e6ddd2] bg-[#f8f4ee] p-10 text-center shadow-[0_10px_30px_rgba(91,74,60,0.06)]">
            <p className="text-[#8f7f73]">도안 정보를 불러오는 중...</p>
          </section>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-[#fcfaf6] px-6 py-8 text-[#4b3a2f] md:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          <Header />
          <section className="mt-12 rounded-[2.25rem] border border-dashed border-[#d9cec2] bg-[#f8f4ee] p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black text-[#4a392f]">
              수정할 도안을 찾지 못했어요
            </h1>
            <p className="mt-3 text-[#756457]">
              존재하지 않거나 이미 삭제된 도안일 수 있어요.
            </p>
            <Link
              href="/patterns"
              className="mt-6 inline-flex rounded-[1.3rem] bg-[#96a792] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(150,167,146,0.28)] transition hover:bg-[#879a83]"
            >
              도안 목록으로 돌아가기
            </Link>
          </section>
        </div>
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="min-h-screen bg-[#fcfaf6] px-6 py-8 text-[#4b3a2f] md:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          <Header />
          <section className="mt-12 rounded-[2.25rem] border border-dashed border-[#d9cec2] bg-[#f8f4ee] p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black text-[#4a392f]">
              수정 권한이 없어요
            </h1>
            <p className="mt-3 text-[#756457]">
              내가 작성한 도안만 수정할 수 있어요.
            </p>
            <Link
              href={patternId ? `/patterns/${patternId}` : "/patterns"}
              className="mt-6 inline-flex rounded-[1.3rem] bg-[#96a792] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(150,167,146,0.28)] transition hover:bg-[#879a83]"
            >
              도안 상세로 돌아가기
            </Link>
          </section>
        </div>
      </main>
    );
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
              href={`/patterns/${patternId}`}
              className="inline-flex text-sm font-semibold text-[#7b9274] transition hover:text-[#5f7759]"
            >
              도안 상세로
            </Link>

            <div className="mt-6 inline-flex rounded-full border border-[#d9d0c6] bg-[#fdfaf6] px-4 py-2 text-sm font-semibold text-[#8f7a67]">
              EDIT PATTERN
            </div>

            <h1 className="mt-4 text-3xl font-black text-[#4a392f] md:text-4xl">
              도안 수정
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-[#756457]">
              기존 도안 정보를 수정하고 미리보기까지 바로 확인할 수 있어요.
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
                  placeholder="예: 네트백 도안"
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
                  placeholder="어떤 작품인지, 어떤 재료가 필요한지 적어 주세요"
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
                    placeholder="예: 코튼 실"
                    className="w-full rounded-[1.4rem] border border-[#ddd3c8] bg-[#fffdf9] px-4 py-3 text-sm text-[#4b3a2f] outline-none transition placeholder:text-[#aa9a8c] focus:border-[#9aaa97] focus:ring-4 focus:ring-[#dfe7db]"
                  />
                </label>

                <div className="grid gap-5 md:grid-cols-[0.95fr_1.05fr]">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-[#5f5044]">
                      바늘 종류
                    </span>
                    <select
                      value={needleType}
                      onChange={(e) =>
                        setNeedleType(e.target.value as (typeof needleTypeOptions)[number])
                      }
                      className="w-full rounded-[1.4rem] border border-[#ddd3c8] bg-[#fffdf9] px-4 py-3 text-sm text-[#4b3a2f] outline-none transition focus:border-[#9aaa97] focus:ring-4 focus:ring-[#dfe7db]"
                    >
                      {needleTypeOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-[#5f5044]">
                      호수
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={needleSize}
                      onChange={(e) => setNeedleSize(e.target.value.replace(/[^\d]/g, ""))}
                      placeholder="예: 5"
                      className="w-full rounded-[1.4rem] border border-[#ddd3c8] bg-[#fffdf9] px-4 py-3 text-sm text-[#4b3a2f] outline-none transition placeholder:text-[#aa9a8c] focus:border-[#9aaa97] focus:ring-4 focus:ring-[#dfe7db]"
                    />
                  </label>
                </div>
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
                  숫자만 입력하면 크기와 게이지 표기가 자동으로 정리돼요.
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
                      JPG, PNG, WEBP 파일을 선택해 주세요.
                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>

                  {(existingImageUrl && !removeCurrentImage) || imageFile ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="rounded-xl border border-[#e7c9c4] bg-[#fff4f2] px-3 py-2 text-xs font-semibold text-[#b05b52] transition hover:bg-[#fdeae6]"
                      >
                        이미지 제거
                      </button>

                      {removeCurrentImage ? (
                        <button
                          type="button"
                          onClick={handleKeepCurrentImage}
                          className="rounded-xl border border-[#ddd3c8] bg-[#fffdf9] px-3 py-2 text-xs font-semibold text-[#6f6054] transition hover:bg-[#f6f1ea]"
                        >
                          기존 이미지 유지
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {imageFile ? (
                    <div className="mt-4 rounded-[1.3rem] border border-[#e5ddd3] bg-[#f8f4ee] px-4 py-3">
                      <p className="truncate text-sm font-semibold text-[#5c4c40]">
                        {imageFile.name}
                      </p>
                      <p className="mt-1 text-xs text-[#8b7b6e]">
                        {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold text-[#5f5044]">
                  도안 세부 내용
                </span>
                <PatternDetailEditor
                  needleType={needleType as NeedleType}
                  rows={detailRows}
                  onChange={setDetailRows}
                  textValue={detailContent}
                  onTextValueChange={setDetailContent}
                />
              </div>

              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex rounded-[1.3rem] bg-[#96a792] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(150,167,146,0.28)] transition hover:bg-[#879a83] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "수정 중..." : "도안 수정 완료"}
                </button>

                <Link
                  href={`/patterns/${patternId}`}
                  className="inline-flex rounded-[1.3rem] border border-[#ddd3c8] bg-[#fffdf9] px-5 py-3 text-sm font-semibold text-[#6f6054] transition hover:bg-[#f6f1ea]"
                >
                  취소
                </Link>
              </div>
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
                  {title.trim() || "도안 제목이 여기에 보여요"}
                </h3>

                <p className="mt-3 text-sm leading-6 text-[#77685d]">
                  {description.trim() ||
                    "도안 설명을 입력하면 이곳에서 미리 확인할 수 있어요."}
                </p>

                <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-[#ebe3d9] bg-white">
                  {previewImageSrc ? (
                    <img
                      src={previewImageSrc}
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
                      {patternId || "-"}
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
                      {needleText || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-b border-[#eee5db] pb-2">
                    <span>완성 크기</span>
                    <span className="font-semibold text-[#4a392f]">
                      {previewSizeText || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-b border-[#eee5db] pb-2">
                    <span>게이지</span>
                    <span className="font-semibold text-[#4a392f]">
                      {previewGaugeText || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span>대표 이미지</span>
                    <span className="truncate font-semibold text-[#4a392f]">
                      {removeCurrentImage
                        ? "-"
                        : imageFile?.name ||
                          existingImagePath.split("/").pop() ||
                          "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2.25rem] border border-[#e6ddd2] bg-[#f8f4ee] p-6 shadow-[0_10px_30px_rgba(91,74,60,0.06)]">
              <h2 className="text-xl font-black text-[#4a392f]">
                수정 전 체크
              </h2>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#756457]">
                <li className="rounded-[1.3rem] border border-[#e7ddd1] bg-[#fffdf9] px-4 py-3">
                  1. 제목, 설명, 난이도, 카테고리가 원하는 값으로 바뀌었는지
                </li>
                <li className="rounded-[1.3rem] border border-[#e7ddd1] bg-[#fffdf9] px-4 py-3">
                  2. 이미지를 새로 올렸다면 기존 이미지가 잘 교체됐는지
                </li>
                <li className="rounded-[1.3rem] border border-[#e7ddd1] bg-[#fffdf9] px-4 py-3">
                  3. 저장 후 상세 페이지에 수정 내용이 바로 반영되는지
                </li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
