"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { patternCategories } from "@/data/patterns";
import { createClient } from "@/lib/supabase/client";
import styles from "./NewPatternForm.module.css";

const needleTypeOptions = ["코바늘", "대바늘"] as const;
const levelOptions = ["초급", "중급", "고급"] as const;
const categoryOptions = patternCategories.slice(1) as Array<(typeof patternCategories)[number]>;
const INITIAL_TIPS = ["", "", ""];
const MAX_TIPS = 5;

function makeId(text: string) {
  const trimmed = text.trim();

  if (!trimmed) return "";

  return trimmed
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}

function buildNeedleValue(
  needleType: (typeof needleTypeOptions)[number],
  needleSize: string
) {
  const trimmedSize = needleSize.trim();
  return trimmedSize ? `${needleType} ${trimmedSize}호` : needleType;
}

export default function NewPatternForm() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<(typeof levelOptions)[number]>("초급");
  const [category, setCategory] =
    useState<(typeof categoryOptions)[number]>(categoryOptions[0]);
  const [description, setDescription] = useState("");
  const [yarn, setYarn] = useState("");
  const [needleType, setNeedleType] =
    useState<(typeof needleTypeOptions)[number]>(needleTypeOptions[0]);
  const [needleSize, setNeedleSize] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [gaugeStitches, setGaugeStitches] = useState("");
  const [gaugeRows, setGaugeRows] = useState("");
  const [tips, setTips] = useState(INITIAL_TIPS);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const previewId = useMemo(() => makeId(title), [title]);
  const needleText = useMemo(
    () => buildNeedleValue(needleType, needleSize),
    [needleSize, needleType]
  );
  const sizeText =
    width.trim() || height.trim()
      ? `가로 ${width.trim() || "0"}cm × 세로 ${height.trim() || "0"}cm`
      : "";
  const gaugeText =
    gaugeStitches.trim() || gaugeRows.trim()
      ? `${gaugeStitches.trim() || "0"}코 × ${gaugeRows.trim() || "0"}단`
      : "";
  const finalSizeText = [sizeText, gaugeText].filter(Boolean).join("\n");
  const filledTips = tips.map((tip) => tip.trim()).filter(Boolean);

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

  function addTipField() {
    setTips((prev) => (prev.length >= MAX_TIPS ? prev : [...prev, ""]));
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
        console.error("사용자 조회 오류", userError);
      }

      if (!user) {
        alert("로그인 후에 도안을 등록할 수 있어요.");
        router.push("/login?returnTo=%2Fpatterns%2Fnew");
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
        needle: needleText,
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
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요.";
      alert(`도안 등록 실패: ${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Header />

        <section className={styles.workspace}>
          <div className={styles.mainColumn}>
            <section className={styles.hero}>
              <div className={styles.heroBody}>
                <div className={styles.eyebrow}>Pattern Studio</div>
                <h1 className={styles.heroTitle}>새 도안을 차분하게 정리해 등록해보세요</h1>
                <p className={styles.heroDescription}>
                  메인 `patterns` 페이지의 분위기를 이어서, 핵심 정보 입력과 결과 미리보기를
                  한 화면에서 바로 확인할 수 있게 정리했어요.
                </p>
                <div className={styles.heroMeta}>
                  <span className={styles.metaPill}>{level}</span>
                  <span className={styles.metaPillMuted}>{category}</span>
                  <span className={styles.metaPillMuted}>{previewId || "id 준비 중"}</span>
                </div>
              </div>

              <div className={styles.heroActions}>
                <Link href="/patterns" className={styles.secondaryAction}>
                  목록으로
                </Link>
                <button
                  type="submit"
                  form="new-pattern-form"
                  disabled={submitting}
                  className={styles.primaryAction}
                >
                  {submitting ? "등록 중..." : "도안 등록"}
                </button>
              </div>
            </section>

            <form id="new-pattern-form" onSubmit={handleSubmit} className={styles.mainColumn}>
              <div className={styles.topRowCards}>
                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <p className={styles.eyebrow}>Basic Info</p>
                    <h2 className={styles.sectionTitle}>기본 정보</h2>
                    <p className={styles.sectionDescription}>
                      제목과 소개 문장만 잘 적어도 목록 카드에서 훨씬 또렷하게 보여요.
                    </p>
                  </div>

                  <div className={styles.sectionInner}>
                    <div className={`${styles.field} ${styles.fieldWide}`}>
                      <label className={styles.fieldLabel} htmlFor="pattern-title">
                        도안 제목
                      </label>
                      <input
                        id="pattern-title"
                        type="text"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="예: 봄 네트백 도안"
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.compactGrid}>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>난이도</span>
                      <div className={`${styles.optionGrid} ${styles.optionGridNoWrap}`}>
                        {levelOptions.map((item) => (
                          <button
                            key={item}
                              type="button"
                              onClick={() => setLevel(item)}
                              className={
                                item === level ? styles.optionButtonActive : styles.optionButton
                              }
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={styles.field}>
                        <label className={styles.fieldLabel} htmlFor="pattern-category">
                          카테고리
                        </label>
                        <select
                          id="pattern-category"
                          value={category}
                          onChange={(event) =>
                            setCategory(event.target.value as (typeof categoryOptions)[number])
                          }
                          className={styles.select}
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
                      <label className={styles.fieldLabel} htmlFor="pattern-description">
                        도안 설명
                      </label>
                      <textarea
                        id="pattern-description"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="작품 분위기, 필요한 재료, 추천 포인트를 적어 주세요"
                        className={styles.textarea}
                      />
                    </div>
                  </div>
                </section>

                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <p className={styles.eyebrow}>Specs</p>
                    <h2 className={styles.sectionTitle}>재료와 규격</h2>
                    <p className={styles.sectionDescription}>
                      사용 실, 바늘, 크기와 게이지를 입력하면 상세 페이지 정보가 자동으로 정리돼요.
                    </p>
                  </div>

                  <div className={styles.sectionInner}>
                    <div className={styles.specTopGrid}>
                      <div className={styles.field}>
                        <label className={styles.fieldLabel} htmlFor="pattern-yarn">
                          사용 실
                        </label>
                        <input
                          id="pattern-yarn"
                          type="text"
                          value={yarn}
                          onChange={(event) => setYarn(event.target.value)}
                          placeholder="예: 코튼사 2합"
                          className={styles.input}
                        />
                      </div>

                      <div className={styles.needleGrid}>
                        <div className={styles.field}>
                          <span className={styles.fieldLabel}>바늘 종류</span>
                          <div className={styles.optionGrid}>
                            {needleTypeOptions.map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => setNeedleType(item)}
                                className={
                                  item === needleType
                                    ? styles.optionButtonActive
                                    : styles.optionButton
                                }
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className={styles.field}>
                          <label className={styles.fieldLabel} htmlFor="pattern-needle-size">
                            호수
                          </label>
                          <input
                            id="pattern-needle-size"
                            type="text"
                            inputMode="numeric"
                            value={needleSize}
                            onChange={(event) =>
                              setNeedleSize(event.target.value.replace(/[^\d]/g, ""))
                            }
                            placeholder="예: 5"
                            className={styles.input}
                          />
                        </div>
                      </div>
                    </div>

                    <div className={styles.metricShell}>
                      <div className={styles.numberPanel}>
                        <div className={styles.field}>
                          <span className={styles.fieldLabel}>완성 크기</span>
                          <div className={styles.metricRow}>
                            <div className={styles.metricField}>
                              <span className={styles.metricLabel}>가로</span>
                              <div className={styles.metricInputWrap}>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  inputMode="numeric"
                                  value={width}
                                  onChange={(event) => setWidth(event.target.value)}
                                  placeholder="0"
                                  className={styles.metricInput}
                                />
                                <span className={styles.metricUnit}>cm</span>
                              </div>
                            </div>

                            <div className={styles.metricField}>
                              <span className={styles.metricLabel}>세로</span>
                              <div className={styles.metricInputWrap}>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  inputMode="numeric"
                                  value={height}
                                  onChange={(event) => setHeight(event.target.value)}
                                  placeholder="0"
                                  className={styles.metricInput}
                                />
                                <span className={styles.metricUnit}>cm</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className={styles.field}>
                          <span className={styles.fieldLabel}>게이지</span>
                          <div className={styles.metricRow}>
                            <div className={styles.metricField}>
                              <span className={styles.metricLabel}>코 수</span>
                              <div className={styles.metricInputWrap}>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  inputMode="numeric"
                                  value={gaugeStitches}
                                  onChange={(event) => setGaugeStitches(event.target.value)}
                                  placeholder="0"
                                  className={styles.metricInput}
                                />
                                <span className={styles.metricUnit}>코</span>
                              </div>
                            </div>

                            <div className={styles.metricField}>
                              <span className={styles.metricLabel}>단 수</span>
                              <div className={styles.metricInputWrap}>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  inputMode="numeric"
                                  value={gaugeRows}
                                  onChange={(event) => setGaugeRows(event.target.value)}
                                  placeholder="0"
                                  className={styles.metricInput}
                                />
                                <span className={styles.metricUnit}>단</span>
                              </div>
                            </div>
                          </div>
                          <span className={styles.fieldHint}>
                            숫자만 입력하면 상세 페이지용 크기와 게이지 문구가 자동으로 조합돼요.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <p className={styles.eyebrow}>Media & Tips</p>
                  <h2 className={styles.sectionTitle}>대표 이미지와 한줄 팁</h2>
                  <p className={styles.sectionDescription}>
                    목록 카드에서 먼저 보이는 대표 컷과, 따라 만들 때 도움이 되는 짧은 팁을
                    함께 정리해 주세요.
                  </p>
                </div>

                <div className={styles.sectionInner}>
                  <div className={styles.mediaGrid}>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>대표 이미지</span>
                      <div className={styles.uploadCard}>
                        <div className={styles.uploadPreview}>
                          {imagePreviewUrl ? (
                            <Image
                              src={imagePreviewUrl}
                              alt="대표 이미지 미리보기"
                              fill
                              unoptimized
                              className={styles.uploadPreviewImage}
                            />
                          ) : (
                            <div className={styles.uploadPreviewEmpty}>
                              <div>
                                <strong>정방형 미리보기</strong>
                                <p>메인 목록 카드처럼 균형 있게 보이도록 1:1 비율로 보여줘요.</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className={styles.uploadActions}>
                          <label className={styles.uploadButton}>
                            이미지 선택
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              hidden
                            />
                          </label>

                          {imageFile ? (
                            <>
                              <div className={styles.imageMeta}>
                                <p className={styles.imageName}>{imageFile.name}</p>
                                <p className={styles.imageSize}>
                                  {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={removeImage}
                                className={styles.imageRemoveButton}
                              >
                                이미지 제거
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className={`${styles.field} ${styles.tipsColumn}`}>
                      <span className={styles.fieldLabel}>한줄 팁</span>
                      <div className={styles.tipsList}>
                        {tips.map((tip, index) => (
                          <div key={index} className={styles.tipRow}>
                            <span className={styles.tipIndex}>{index + 1}</span>
                            <input
                              type="text"
                              value={tip}
                              onChange={(event) => updateTip(index, event.target.value)}
                              placeholder={`팁 ${index + 1}`}
                              className={styles.input}
                            />
                          </div>
                        ))}
                      </div>

                      {tips.length < MAX_TIPS ? (
                        <button
                          type="button"
                          onClick={addTipField}
                          className={styles.tipAddButton}
                        >
                          팁 한 줄 더 추가
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.submitRow}>
                    <button type="submit" disabled={submitting} className={styles.primaryAction}>
                      {submitting ? "등록 중..." : "도안 등록"}
                    </button>
                    <Link href="/patterns" className={styles.secondaryAction}>
                      취소
                    </Link>
                  </div>
                </div>

                {submitted ? (
                  <div className={styles.successMessage}>도안이 정상적으로 등록됐어요.</div>
                ) : null}
              </section>
            </form>
          </div>

          <aside className={styles.sideColumn}>
            <section className={`${styles.sideCard} ${styles.sectionCard}`}>
              <div className={styles.sectionHeader}>
                <p className={styles.eyebrow}>Live Preview</p>
                <h2 className={styles.sectionTitle}>미리보기</h2>
              </div>

              <div className={styles.previewCard}>
                <div className={styles.previewImage}>
                  {imagePreviewUrl ? (
                    <Image
                      src={imagePreviewUrl}
                      alt="대표 이미지 미리보기"
                      fill
                      unoptimized
                    />
                  ) : (
                    <div className={styles.previewFallback} />
                  )}
                </div>

                <div className={styles.previewHead}>
                  <div className={styles.heroMeta}>
                    <span className={styles.metaPill}>{level}</span>
                    <span className={styles.metaPillMuted}>{category}</span>
                  </div>
                  <h3 className={styles.previewTitle}>
                    {title.trim() || "도안 제목이 여기에 보여요"}
                  </h3>
                  <p className={styles.previewDescription}>
                    {description.trim() ||
                      "도안 설명을 입력하면 이 영역에서 카드와 상세 페이지 느낌으로 먼저 확인할 수 있어요."}
                  </p>
                </div>

                <div className={styles.summaryList}>
                  <div className={styles.summaryRow}>
                    <span>미리보기 ID</span>
                    <span className={styles.summaryValue}>{previewId || "-"}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>사용 실</span>
                    <span className={styles.summaryValue}>{yarn.trim() || "-"}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>바늘</span>
                    <span className={styles.summaryValue}>{needleText || "-"}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>완성 크기</span>
                    <span className={styles.summaryValue}>{sizeText || "-"}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>게이지</span>
                    <span className={styles.summaryValue}>{gaugeText || "-"}</span>
                  </div>
                </div>

                {filledTips.length > 0 ? (
                  <div className={styles.tipsPreview}>
                    {filledTips.map((tip, index) => (
                      <div key={`${tip}-${index}`} className={styles.tipPreviewItem}>
                        <span className={styles.tipBullet}>{index + 1}</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>

            <section className={`${styles.sideCard} ${styles.sectionCard}`}>
              <div className={styles.sectionHeader}>
                <p className={styles.eyebrow}>Guide</p>
                <h2 className={styles.sectionTitle}>입력 가이드</h2>
              </div>

              <div className={styles.guideList}>
                <div className={styles.guideItem}>
                  대표 이미지는 정방형으로 미리보여서, 목록 카드에서 보이는 느낌을 바로 확인할 수
                  있어요.
                </div>
                <div className={styles.guideItem}>
                  제목, 설명, 카테고리 조합이 먼저 눈에 들어오니 짧고 명확하게 쓰는 편이 좋아요.
                </div>
                <div className={styles.guideItem}>
                  등록을 마치면 상세 페이지로 바로 이동해서 저장 결과를 확인할 수 있어요.
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
