"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/layout/Header";
import {
  buildCommunityPostContent,
  communityDraftStorageKey,
  communityExtraFieldConfig,
  createEmptyExtraFields,
  getCommunityImageUrl,
  normalizeExtraFields,
  removeCommunityImage,
  sanitizeCommunityTags,
  uploadCommunityImage,
  type CommunityPostDraft,
} from "@/lib/community-post-content";
import { type PostCategory } from "@/lib/community";
import { createClient } from "@/lib/supabase/client";
import styles from "./CommunityPostForm.module.css";

type CommunityPostFormProps = {
  mode: "create" | "edit";
  postId?: string;
  initialValues?: {
    category: PostCategory;
    title: string;
    body: string;
    tags: string[];
    extraFields: Record<string, string>;
    imagePath?: string | null;
  };
};

const DEFAULT_CATEGORY = "완성작" as PostCategory;
const MAX_TAGS = 5;

const categoryDescription: Record<PostCategory, string> = {
  완성작: "완성한 작품과 사용한 도안 정보를 함께 공유해보세요.",
  질문: "막힌 부분과 현재 사용 재료를 적어주면 답변이 더 빨라져요.",
  정보공유: "좋은 자료나 링크를 다른 사람들이 이해하기 쉽게 정리해 주세요.",
  같이뜨기: "일정과 진행 방식을 적어주면 참여 여부를 정하기 쉬워요.",
};

function makeCommunityPostId() {
  return crypto.randomUUID();
}

function getDraftKey(mode: "create" | "edit", postId?: string) {
  return mode === "edit" && postId
    ? `${communityDraftStorageKey}:${postId}`
    : communityDraftStorageKey;
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
function getCategoryToneClass(category: PostCategory, isActive: boolean) {
  switch (category) {
    case "완성작":
      return isActive ? styles.categoryToneShowcaseActive : styles.categoryToneShowcase;
    case "질문":
      return isActive ? styles.categoryToneQuestionActive : styles.categoryToneQuestion;
    case "정보공유":
      return isActive ? styles.categoryToneInfoActive : styles.categoryToneInfo;
    case "같이뜨기":
    default:
      return isActive ? styles.categoryToneTogetherActive : styles.categoryToneTogether;
  }
}


export default function CommunityPostForm({
  mode,
  postId,
  initialValues,
}: CommunityPostFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draftKey = useMemo(() => getDraftKey(mode, postId), [mode, postId]);

  const baseValues = useMemo(
    () => ({
      category: initialValues?.category ?? DEFAULT_CATEGORY,
      title: initialValues?.title ?? "",
      body: initialValues?.body ?? "",
      tags: initialValues?.tags ?? [],
      extraFields: normalizeExtraFields(
        initialValues?.category ?? DEFAULT_CATEGORY,
        initialValues?.extraFields ??
          createEmptyExtraFields(initialValues?.category ?? DEFAULT_CATEGORY)
      ),
      imagePath: initialValues?.imagePath ?? null,
    }),
    [initialValues]
  );

  const [category, setCategory] = useState<PostCategory>(baseValues.category);
  const [title, setTitle] = useState(baseValues.title);
  const [body, setBody] = useState(baseValues.body);
  const [tags, setTags] = useState<string[]>(baseValues.tags);
  const [tagInput, setTagInput] = useState("");
  const [extraFields, setExtraFields] = useState<Record<string, string>>(baseValues.extraFields);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(
    baseValues.imagePath ? getCommunityImageUrl(baseValues.imagePath) : ""
  );
  const [existingImagePath] = useState<string | null>(baseValues.imagePath);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryOptions = Object.keys(communityExtraFieldConfig) as PostCategory[];
  const extraFieldDefs = communityExtraFieldConfig[category];
  const visibleImageUrl = imagePreviewUrl;

  useEffect(() => {
    if (typeof window === "undefined" || mode !== "create") return;

    const raw = window.localStorage.getItem(draftKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as CommunityPostDraft;
      setCategory(parsed.category ?? baseValues.category);
      setTitle(parsed.title ?? baseValues.title);
      setBody(parsed.body ?? baseValues.body);
      setTags(sanitizeCommunityTags(parsed.tags ?? baseValues.tags));
      setExtraFields(
        normalizeExtraFields(parsed.category ?? baseValues.category, parsed.extraFields)
      );
    } catch {
      // Ignore broken local draft data.
    }
  }, [baseValues.body, baseValues.category, baseValues.tags, baseValues.title, draftKey, mode]);

  useEffect(() => {
    if (typeof window === "undefined" || mode !== "create") return;

    const nextDraft: CommunityPostDraft = {
      category,
      title,
      body,
      tags: sanitizeCommunityTags(tags),
      extraFields: normalizeExtraFields(category, extraFields),
    };

    window.localStorage.setItem(draftKey, JSON.stringify(nextDraft));
  }, [body, category, draftKey, extraFields, mode, tags, title]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  function handleCategoryChange(nextCategory: PostCategory) {
    setCategory(nextCategory);
    setExtraFields(normalizeExtraFields(nextCategory, extraFields));
  }

  function handleTagAdd(nextValue?: string) {
    const normalized = (nextValue ?? tagInput).trim();
    if (!normalized) return;
    if (tags.includes(normalized) || tags.length >= MAX_TAGS) {
      setTagInput("");
      return;
    }

    setTags(sanitizeCommunityTags([...tags, normalized]));
    setTagInput("");
  }

  function handleTagRemove(tag: string) {
    setTags((current) => current.filter((item) => item !== tag));
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    handleTagAdd(event.currentTarget.value);
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(file);
    setRemoveExistingImage(false);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function handleImageRemove() {
    if (imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(null);
    setImagePreviewUrl("");
    setRemoveExistingImage(Boolean(existingImagePath));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit() {
    const normalizedTitle = title.trim();
    const normalizedBody = body.trim();
    const normalizedTags = sanitizeCommunityTags(tags);
    const normalizedFields = normalizeExtraFields(category, extraFields);

    if (!normalizedTitle || !normalizedBody) {
      alert("제목과 내용을 모두 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message);
      }

      if (!user) {
        alert("로그인 후 글을 작성하거나 수정할 수 있어요.");
        router.push("/login?returnTo=%2Fcommunity%2Fwrite");
        return;
      }

      const authorName =
        user.user_metadata?.nickname ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "익명";

      const finalPostId = postId ?? makeCommunityPostId();
      let finalImagePath = removeExistingImage ? null : existingImagePath;

      if (imageFile) {
        if (existingImagePath) {
          await removeCommunityImage(existingImagePath);
        }

        finalImagePath = await uploadCommunityImage(imageFile, user.id, finalPostId);
      } else if (removeExistingImage && existingImagePath) {
        await removeCommunityImage(existingImagePath);
      }

      const content = buildCommunityPostContent(normalizedBody, {
        imagePath: finalImagePath,
        imageName: imageFile?.name ?? null,
        ownerEmail: user.email ?? null,
        ownerName: authorName,
        extraFields: normalizedFields,
      });

      if (mode === "edit" && postId) {
        const { error } = await supabase
          .from("community_posts")
          .update({
            category,
            title: normalizedTitle,
            content,
            tags: normalizedTags,
            author_name: authorName,
          })
          .eq("id", postId);

        if (error) {
          throw new Error(error.message);
        }
      } else {
        const { error } = await supabase.from("community_posts").insert({
          id: finalPostId,
          category,
          title: normalizedTitle,
          content,
          author_name: authorName,
          tags: normalizedTags,
        });

        if (error) {
          throw new Error(error.message);
        }
      }

      if (mode === "create") {
        window.localStorage.removeItem(draftKey);
      }

      router.push(`/community/${finalPostId}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요.";
      alert(`글 등록에 실패했어요: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.shell}>
        <div className={styles.workspace}>
          <div className={styles.mainColumn}>
            <section className={`${styles.hero} ${styles.heroCompact}`}>
              <div className={styles.heroTop}>
                <div className={styles.heroIntro}>
                  <h1 className={styles.heroTitle}>{mode === "edit" ? "게시글 수정" : "게시글 작성"}</h1>
                  <p className={styles.heroDescription}>{categoryDescription[category]}</p>
                </div>

                <div className={`${styles.heroActions} ${styles.heroActionsInline}`}>
                  <Link
                    href={mode === "edit" && postId ? `/community/${postId}` : "/community"}
                    className={styles.secondaryAction}
                  >
                    목록으로
                  </Link>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={styles.primaryAction}
                  >
                    {isSubmitting ? "저장 중..." : mode === "edit" ? "수정 완료" : "글 등록"}
                  </button>
                </div>
              </div>
            </section>

            <section className={`${styles.sectionCard} ${styles.introCard}`}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>기본 정보</h2>
              </div>

              <div className={styles.compactIntroGrid}>
                <div className={styles.introMain}>
                  <div className={`${styles.field} ${styles.fieldWide}`}>
                    <label htmlFor="community-title" className={styles.fieldLabel}>
                      제목
                    </label>
                    <input
                      className={styles.input}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="예: 뜨개 초보가 보기 좋은 코바늘 가방"
                    />
                  </div>

                  <div className={styles.field}>
                    <div className={styles.optionGrid}>
                      {categoryOptions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className={[
                            item === category ? styles.optionButtonActive : styles.optionButton,
                            getCategoryToneClass(item, item === category),
                          ].join(" ")}
                          onClick={() => handleCategoryChange(item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`${styles.field} ${styles.fieldWide}`}>
                    <label htmlFor="community-body" className={styles.fieldLabel}>
                      본문
                    </label>
                    <textarea
                      id="community-body"
                      className={styles.textarea}
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      placeholder="작품 소개, 질문, 함께 뜨기 일정 등을 자유롭게 적어 주세요."
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
                        placeholder="예: 코바늘, 입문"
                      />
                      <button
                        type="button"
                        className={styles.tagAddButton}
                        onClick={() => handleTagAdd()}
                        disabled={tags.length >= MAX_TAGS}
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
                          onClick={() => handleTagRemove(tag)}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                    <p className={styles.helperText}>최대 5개까지 추가할 수 있어요. 태그를 누르면 삭제돼요.</p>
                  </div>

                  <div className={styles.embeddedExtraGrid}>
                    {extraFieldDefs.map((field) => (
                      <div key={field.key} className={styles.field}>
                        <label htmlFor={`extra-${field.key}`} className={styles.fieldLabel}>
                          {field.label}
                        </label>
                        <input
                          id={`extra-${field.key}`}
                          className={styles.input}
                          value={extraFields[field.key] ?? ""}
                          onChange={(event) =>
                            setExtraFields((current) => ({
                              ...current,
                              [field.key]: event.target.value,
                            }))
                          }
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>


            <section className={`${styles.sectionCard} ${styles.imageCard}`}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>첨부 이미지</h2>
                <p className={styles.helperText}>대표 이미지를 등록하면 게시글 썸네일이 더 또렷해져요.</p>
              </div>

              <div className={styles.uploadCard}>
                <div className={styles.uploadPreview}>
                  {visibleImageUrl ? (
                    <Image
                      src={visibleImageUrl}
                      alt="첨부 이미지 미리보기"
                      fill
                      className={styles.uploadPreviewImage}
                      sizes="(max-width: 920px) 100vw, 320px"
                      unoptimized={visibleImageUrl.startsWith("blob:")}
                    />
                  ) : (
                    <div className={styles.uploadPreviewEmpty}>
                      이미지를 업로드하면 여기에서 바로 확인할 수 있어요.
                    </div>
                  )}
                </div>

                <div className={styles.uploadActions}>
                  <button
                    type="button"
                    className={styles.uploadButton}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    이미지 선택
                  </button>
                  {visibleImageUrl ? (
                    <button type="button" className={styles.imageRemoveButton} onClick={handleImageRemove}>
                      제거
                    </button>
                  ) : null}

                  {imageFile ? (
                    <div className={styles.imageMeta}>
                      <p className={styles.imageName}>{imageFile.name}</p>
                      <p className={styles.imageSize}>{formatFileSize(imageFile)}</p>
                    </div>
                  ) : null}
                </div>

                <input
                  ref={fileInputRef}
                  id="community-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className={styles.hiddenInput}
                />
              </div>
            </section>

          </div>

          <aside className={styles.sideColumn}>
            <section className={`${styles.sectionCard} ${styles.previewCard}`}>
              <div className={styles.sidePreviewImage}>
                {visibleImageUrl ? (
                  <Image
                    src={visibleImageUrl}
                    alt="게시글 이미지 미리보기"
                    fill
                    sizes="320px"
                    className={styles.uploadPreviewImage}
                    unoptimized={visibleImageUrl.startsWith("blob:")}
                  />
                ) : (
                  <div className={styles.sidePreviewFallback} />
                )}
              </div>

              <h2 className={styles.previewTitle}>{title.trim() || "게시글 제목 미리보기"}</h2>

              <div className={styles.summaryList}>
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

                {extraFieldDefs.map((field) => (
                  <div key={field.key} className={styles.summaryRow}>
                    <span>{field.label}</span>
                    <span className={styles.summaryValue}>
                      {(extraFields[field.key] ?? "").trim() || "-"}
                    </span>
                  </div>
                ))}
              </div>

              <p className={styles.previewBody}>{body || "본문을 입력하면 미리보기가 채워집니다."}</p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
