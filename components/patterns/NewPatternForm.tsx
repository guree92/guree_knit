"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import PatternDetailEditor from "@/components/patterns/PatternDetailEditor";
import { patternCategories } from "@/data/patterns";
import {
  type DetailRow,
  type NeedleType,
} from "@/lib/pattern-detail";
import { createClient } from "@/lib/supabase/client";
import styles from "./NewPatternForm.module.css";

const needleTypeOptions = ["코바늘", "대바늘"] as const;
const levelOptions = ["초급", "중급", "고급"] as const;
const categoryOptions = patternCategories.slice(1) as Array<(typeof patternCategories)[number]>;
const copyrightSourceOptions = ["본인", "무료배포"] as const;
const copyrightRules = [
  { key: "hobbyOnly", label: "취미 제작" },
  { key: "colorVariation", label: "색상 변형" },
  { key: "sizeVariation", label: "사이즈 변형" },
  { key: "commercialUse", label: "상업적 사용" },
  { key: "redistribution", label: "도안 재배포" },
  { key: "modificationResale", label: "수정본 판매" },
] as const;
const maxTags = 5;

type CopyrightChoice = "o" | "x";

type CopyrightSettings = {
  source: (typeof copyrightSourceOptions)[number];
  hobbyOnly: CopyrightChoice;
  colorVariation: CopyrightChoice;
  sizeVariation: CopyrightChoice;
  commercialUse: CopyrightChoice;
  redistribution: CopyrightChoice;
  modificationResale: CopyrightChoice;
};

function makeId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "");
}

function buildNeedleValue(needleType: (typeof needleTypeOptions)[number], needleSize: string) {
  const trimmedSize = needleSize.trim();
  return trimmedSize ? `${needleType} ${trimmedSize}호` : needleType;
}

function normalizeTag(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function formatFileSize(file: File) {
  const units = ["B", "KB", "MB", "GB"];
  let size = file.size;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export default function NewPatternForm() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<(typeof levelOptions)[number]>("초급");
  const [category, setCategory] =
    useState<(typeof categoryOptions)[number]>(categoryOptions[0]);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [yarn, setYarn] = useState("");
  const [needleType, setNeedleType] =
    useState<(typeof needleTypeOptions)[number]>(needleTypeOptions[0]);
  const [needleSize, setNeedleSize] = useState("");
  const [totalYarnAmount, setTotalYarnAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [gaugeStitches, setGaugeStitches] = useState("");
  const [gaugeRows, setGaugeRows] = useState("");
  const [copyrightSettings, setCopyrightSettings] = useState<CopyrightSettings>({
    source: "본인",
    hobbyOnly: "o",
    colorVariation: "o",
    sizeVariation: "o",
    commercialUse: "x",
    redistribution: "x",
    modificationResale: "x",
  });
  const [copyrightSourceUrl, setCopyrightSourceUrl] = useState("");
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [detailContent, setDetailContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const previewId = useMemo(() => makeId(title), [title]);
  const needleText = useMemo(
    () => buildNeedleValue(needleType, needleSize),
    [needleType, needleSize]
  );
  const sizeText = useMemo(() => {
    if (!width.trim() && !height.trim()) return "";
    return `가로 ${width.trim() || "0"}cm x 세로 ${height.trim() || "0"}cm`;
  }, [height, width]);
  const gaugeText = useMemo(() => {
    if (!gaugeStitches.trim() && !gaugeRows.trim()) return "";
    return `${gaugeStitches.trim() || "0"}코 x ${gaugeRows.trim() || "0"}단`;
  }, [gaugeRows, gaugeStitches]);
  const finalSizeText = useMemo(
    () => [sizeText, gaugeText].filter(Boolean).join("\n"),
    [gaugeText, sizeText]
  );
  const previewPolicies = useMemo(
    () =>
      copyrightRules.map((rule) => ({
        label: rule.label,
        value: copyrightSettings[rule.key].toUpperCase(),
      })),
    [copyrightSettings]
  );

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  function addTag() {
    const normalized = normalizeTag(tagInput);

    if (!normalized) return;
    if (tags.includes(normalized)) {
      setTagInput("");
      return;
    }
    if (tags.length >= maxTags) return;

    setTags((current) => [...current, normalized]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((item) => item !== tag));
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addTag();
  }

  function updateCopyrightSetting(
    key: keyof Omit<CopyrightSettings, "source">,
    value: CopyrightChoice
  ) {
    setCopyrightSettings((current) => ({ ...current, [key]: value }));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreviewUrl("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      alert("도안 제목을 입력해 주세요.");
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
        console.error("사용자 정보를 불러오지 못했습니다.", userError);
      }

      if (!user) {
        alert("로그인 후 도안을 등록할 수 있어요.");
        router.push("/login?returnTo=%2Fpatterns%2Fnew");
        return;
      }

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
        tags,
        duration: duration.trim() || null,
        total_yarn_amount: totalYarnAmount.trim() || null,
        yarn: yarn.trim(),
        needle: needleText,
        size: finalSizeText,
        copyright_source: copyrightSettings.source,
        copyright_source_url:
          copyrightSettings.source === "무료배포" ? copyrightSourceUrl.trim() || null : null,
        copyright_hobby_only: copyrightSettings.hobbyOnly === "o",
        copyright_color_variation: copyrightSettings.colorVariation === "o",
        copyright_size_variation: copyrightSettings.sizeVariation === "o",
        copyright_commercial_use: copyrightSettings.commercialUse === "o",
        copyright_redistribution: copyrightSettings.redistribution === "o",
        copyright_modification_resale: copyrightSettings.modificationResale === "o",
        detail_content: detailContent.trim() || null,
        detail_rows: detailRows,
        image_path: imagePath,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setSubmitted(true);
      router.push(`/patterns/${finalId}`);
    } catch (error) {
      console.error("도안 등록 중 문제가 발생했습니다.", error);
      alert("도안 등록 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.shell}>
        <form onSubmit={handleSubmit}>
          <div className={styles.workspace}>
            <div className={styles.mainColumn}>
              <section className={`${styles.hero} ${styles.heroCompact}`}>
                <div className={styles.heroBody}>
                  <span className={styles.eyebrow}>Pattern Studio</span>
                  <h1 className={styles.heroTitle}>새 도안 등록</h1>
                </div>

                <div className={styles.heroActions}>
                  <Link href="/patterns" className={styles.secondaryAction}>
                    목록으로
                  </Link>
                  <button type="submit" className={styles.primaryAction} disabled={submitting}>
                    {submitting ? "등록 중..." : "도안 등록"}
                  </button>
                </div>
              </section>

              <section className={`${styles.sectionCard} ${styles.introCard}`}>
                <div className={styles.sectionHeader}>
                  <span className={styles.eyebrow}>Story</span>
                  <h2 className={styles.sectionTitle}>도안 소개</h2>
                </div>

                <div className={styles.compactIntroGrid}>
                  <div className={styles.introMain}>
                    <div className={`${styles.field} ${styles.fieldWide}`}>
                      <label htmlFor="pattern-title" className={styles.fieldLabel}>
                        도안 제목
                      </label>
                      <input
                        id="pattern-title"
                        className={styles.input}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="예: 포근한 니트백 도안"
                      />
                    </div>

                    <div className={styles.inlineFields}>
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>난이도</span>
                        <div className={styles.optionGrid}>
                          {levelOptions.map((item) => (
                            <button
                              key={item}
                              type="button"
                              className={
                                item === level ? styles.optionButtonActive : styles.optionButton
                              }
                              onClick={() => setLevel(item)}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="pattern-category" className={styles.fieldLabel}>
                          카테고리
                        </label>
                        <select
                          id="pattern-category"
                          className={styles.select}
                          value={category}
                          onChange={(event) =>
                            setCategory(event.target.value as (typeof categoryOptions)[number])
                          }
                        >
                          {categoryOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={`${styles.field} ${styles.fieldWide}`}>
                      <label htmlFor="pattern-description" className={styles.fieldLabel}>
                        도안 설명
                      </label>
                      <textarea
                        id="pattern-description"
                        className={styles.textarea}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="작품 분위기, 추천 포인트, 준비 팁을 가볍게 적어주세요."
                      />
                    </div>
                  </div>

                  <div className={styles.introSide}>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>태그</span>
                      <div className={styles.tagComposer}>
                        <input
                          className={styles.input}
                          value={tagInput}
                          onChange={(event) => setTagInput(event.target.value)}
                          onKeyDown={handleTagKeyDown}
                          placeholder="예: 봄가방, 데일리"
                        />
                        <button
                          type="button"
                          className={styles.tagAddButton}
                          onClick={addTag}
                          disabled={tags.length >= maxTags}
                        >
                          추가
                        </button>
                      </div>
                      <div className={styles.tagList}>
                        {tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className={styles.tagChip}
                            onClick={() => removeTag(tag)}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                      <p className={styles.helperText}>최대 5개까지 추가할 수 있어요.</p>
                    </div>

                    <div className={styles.miniStats}>
                      <div className={styles.metricCard}>
                        <span className={styles.metricCardLabel}>완성 크기</span>
                        <div className={styles.miniMetricGrid}>
                          <label className={styles.metricMiniField}>
                            <span>가로</span>
                            <div className={styles.metricInputWrap}>
                              <input
                                className={styles.metricInput}
                                inputMode="decimal"
                                value={width}
                                onChange={(event) => setWidth(event.target.value)}
                                placeholder="0"
                              />
                              <span className={styles.metricUnit}>cm</span>
                            </div>
                          </label>
                          <label className={styles.metricMiniField}>
                            <span>세로</span>
                            <div className={styles.metricInputWrap}>
                              <input
                                className={styles.metricInput}
                                inputMode="decimal"
                                value={height}
                                onChange={(event) => setHeight(event.target.value)}
                                placeholder="0"
                              />
                              <span className={styles.metricUnit}>cm</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className={styles.metricCard}>
                        <span className={styles.metricCardLabel}>게이지</span>
                        <div className={styles.miniMetricGrid}>
                          <label className={styles.metricMiniField}>
                            <span>코 수</span>
                            <div className={styles.metricInputWrap}>
                              <input
                                className={styles.metricInput}
                                inputMode="numeric"
                                value={gaugeStitches}
                                onChange={(event) => setGaugeStitches(event.target.value)}
                                placeholder="0"
                              />
                              <span className={styles.metricUnit}>코</span>
                            </div>
                          </label>
                          <label className={styles.metricMiniField}>
                            <span>단 수</span>
                            <div className={styles.metricInputWrap}>
                              <input
                                className={styles.metricInput}
                                inputMode="numeric"
                                value={gaugeRows}
                                onChange={(event) => setGaugeRows(event.target.value)}
                                placeholder="0"
                              />
                              <span className={styles.metricUnit}>단</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className={`${styles.sectionCard} ${styles.prepCard}`}>
                <div className={styles.sectionHeader}>
                  <span className={styles.eyebrow}>Material</span>
                  <h2 className={styles.sectionTitle}>제작 준비</h2>
                </div>

                <div className={styles.prepGrid}>
                  <div className={styles.field}>
                    <label htmlFor="pattern-yarn" className={styles.fieldLabel}>
                      사용 실
                    </label>
                    <input
                      id="pattern-yarn"
                      className={styles.input}
                      value={yarn}
                      onChange={(event) => setYarn(event.target.value)}
                      placeholder="예: 코튼사 2볼"
                    />
                  </div>

                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>바늘 종류</span>
                    <div className={`${styles.optionGrid} ${styles.optionGridNoWrap}`}>
                      {needleTypeOptions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className={
                            item === needleType ? styles.optionButtonActive : styles.optionButton
                          }
                          onClick={() => setNeedleType(item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="needle-size" className={styles.fieldLabel}>
                      호수
                    </label>
                    <input
                      id="needle-size"
                      className={styles.input}
                      value={needleSize}
                      onChange={(event) => setNeedleSize(event.target.value)}
                      placeholder="예: 5"
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="total-yarn-amount" className={styles.fieldLabel}>
                      사용 실 총량
                    </label>
                    <input
                      id="total-yarn-amount"
                      className={styles.input}
                      value={totalYarnAmount}
                      onChange={(event) => setTotalYarnAmount(event.target.value)}
                      placeholder="예: 220g / 4볼"
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="duration" className={styles.fieldLabel}>
                      소요 시간
                    </label>
                    <input
                      id="duration"
                      className={styles.input}
                      value={duration}
                      onChange={(event) => setDuration(event.target.value)}
                      placeholder="예: 3일 / 8시간"
                    />
                  </div>
                </div>
              </section>

              <section className={`${styles.sectionCard} ${styles.policyCard}`}>
                <div className={styles.sectionHeader}>
                  <span className={styles.eyebrow}>Policy</span>
                  <h2 className={styles.sectionTitle}>이용 범위</h2>
                </div>

                <div className={styles.policyGrid}>
                  <div className={styles.policySourceRow}>
                    <span className={styles.fieldLabel}>원작자</span>
                    <div className={styles.optionGrid}>
                      {copyrightSourceOptions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className={
                            item === copyrightSettings.source
                              ? styles.optionButtonActive
                              : styles.optionButton
                          }
                          onClick={() =>
                            setCopyrightSettings((current) => ({
                              ...current,
                              source: item,
                            }))
                          }
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  {copyrightSettings.source === "무료배포" ? (
                    <div className={styles.policySourceLinkRow}>
                      <label htmlFor="copyright-source-url" className={styles.fieldLabel}>
                        출처 링크
                      </label>
                      <input
                        id="copyright-source-url"
                        type="url"
                        className={styles.input}
                        value={copyrightSourceUrl}
                        onChange={(event) => setCopyrightSourceUrl(event.target.value)}
                        placeholder="https://..."
                      />
                      <p className={styles.helperText}>
                        무료배포 도안이라면 원문이나 배포 페이지 링크를 함께 남겨둘 수 있어요.
                      </p>
                    </div>
                  ) : null}

                  {copyrightRules.map((rule) => (
                    <div key={rule.key} className={styles.policyRow}>
                      <span className={styles.fieldLabel}>{rule.label}</span>
                      <div className={styles.optionGrid}>
                        <button
                          type="button"
                          className={
                            copyrightSettings[rule.key] === "o"
                              ? styles.optionButtonActive
                              : styles.optionButton
                          }
                          onClick={() => updateCopyrightSetting(rule.key, "o")}
                        >
                          O
                        </button>
                        <button
                          type="button"
                          className={
                            copyrightSettings[rule.key] === "x"
                              ? styles.optionButtonActive
                              : styles.optionButton
                          }
                          onClick={() => updateCopyrightSetting(rule.key, "x")}
                        >
                          X
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={`${styles.sectionCard} ${styles.sectionSpanFull}`}>
                <div className={styles.sectionHeader}>
                  <span className={styles.eyebrow}>Media</span>
                  <h2 className={styles.sectionTitle}>이미지와 세부 내용</h2>
                </div>

                <div className={styles.mediaCompactGrid}>
                  <div className={styles.uploadCard}>
                    <div className={styles.uploadPreview}>
                      {imagePreviewUrl ? (
                        <Image
                          src={imagePreviewUrl}
                          alt="업로드한 도안 이미지 미리보기"
                          fill
                          className={styles.uploadPreviewImage}
                          sizes="(max-width: 920px) 100vw, 280px"
                        />
                      ) : (
                        <div className={styles.uploadPreviewEmpty}>
                          <div>
                            대표 이미지를 등록하면 카드 인상이 또렷해져요.
                            <p>정사각형 비율을 추천해요.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={styles.uploadActions}>
                      <label htmlFor="pattern-image" className={styles.uploadButton}>
                        이미지 선택
                      </label>
                      <input
                        id="pattern-image"
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleImageChange}
                      />

                      {imageFile ? (
                        <>
                          <div className={styles.imageMeta}>
                            <p className={styles.imageName}>{imageFile.name}</p>
                            <p className={styles.imageSize}>{formatFileSize(imageFile)}</p>
                          </div>
                          <button
                            type="button"
                            className={styles.imageRemoveButton}
                            onClick={removeImage}
                          >
                            제거
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.tipsColumn}>
                    <PatternDetailEditor
                      needleType={needleType as NeedleType}
                      rows={detailRows}
                      onChange={setDetailRows}
                      textValue={detailContent}
                      onTextValueChange={setDetailContent}
                    />

                    <div className={styles.submitRow}>
                      <button type="submit" className={styles.primaryAction} disabled={submitting}>
                        {submitting ? "등록 중..." : "도안 등록하기"}
                      </button>
                    </div>

                    {submitted ? (
                      <p className={styles.successMessage}>
                        도안을 저장하고 상세 페이지로 이동하고 있어요.
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>

            <aside className={styles.sideColumn}>
              <section className={`${styles.sectionCard} ${styles.previewCard}`}>
                <div className={styles.previewHead}>
                  <span className={styles.eyebrow}>Preview</span>
                  <div className={styles.previewImage}>
                    {imagePreviewUrl ? (
                      <Image src={imagePreviewUrl} alt="도안 미리보기" fill sizes="320px" />
                    ) : (
                      <div className={styles.previewFallback} />
                    )}
                  </div>
                  <div>
                    <h3 className={styles.previewTitle}>{title.trim() || "도안 제목 미리보기"}</h3>
                    <p className={styles.previewDescription}>
                      {description.trim() || "설명이 입력되면 카드 분위기를 여기서 바로 볼 수 있어요."}
                    </p>
                  </div>
                </div>

                <div className={styles.summaryList}>
                  <div className={styles.summaryRow}>
                    <span>난이도</span>
                    <span className={styles.summaryValue}>{level}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>카테고리</span>
                    <span className={styles.summaryValue}>{category}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>태그</span>
                    <span className={styles.summaryValue}>
                      {tags.length ? tags.map((tag) => `#${tag}`).join(", ") : "-"}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>사용 실</span>
                    <span className={styles.summaryValue}>{yarn.trim() || "-"}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>바늘</span>
                    <span className={styles.summaryValue}>{needleText}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>총량</span>
                    <span className={styles.summaryValue}>{totalYarnAmount.trim() || "-"}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>소요 시간</span>
                    <span className={styles.summaryValue}>{duration.trim() || "-"}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>완성 크기</span>
                    <span className={styles.summaryValue}>{sizeText || "-"}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>게이지</span>
                    <span className={styles.summaryValue}>{gaugeText || "-"}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>원작자</span>
                    <span className={styles.summaryValue}>{copyrightSettings.source}</span>
                  </div>
                  <div className={`${styles.summaryRow} ${styles.summaryRowTop}`}>
                    <span>허용 범위</span>
                    <div className={styles.summaryPolicyList}>
                      {previewPolicies.map((policy) => (
                        <div key={policy.label} className={styles.summaryPolicyItem}>
                          <span>{policy.label}</span>
                          <span className={styles.summaryValue}>{policy.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {detailContent.trim() ? (
                  <div className={styles.tipsPreview}>
                    <div className={styles.tipPreviewItem}>{detailContent.trim()}</div>
                  </div>
                ) : null}
              </section>
            </aside>
          </div>
        </form>
      </div>
    </div>
  );
}


