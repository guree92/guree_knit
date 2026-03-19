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
import { createClient } from "@/lib/supabase/client";
import { type PostCategory } from "@/lib/community";
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
  }, [baseValues.body, baseValues.category, baseValues.tags, draftKey, mode]);

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

  function handleTagAdd() {
    const normalized = tagInput.trim();
    if (!normalized) return;

    setTags(sanitizeCommunityTags([...tags, normalized]));
    setTagInput("");
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    handleTagAdd();
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
    <main className={styles.page}>
      <div className={styles.shell}>
        <Header />

        <section className={styles.hero}>
          <div className={styles.heroTop}>
            <Link
              href={mode === "edit" && postId ? `/community/${postId}` : "/community"}
              className={styles.backLink}
            >
              {mode === "edit" && postId ? "게시글로 돌아가기" : "뜨개마당으로 돌아가기"}
            </Link>
            <span className={styles.draftText}>작성 내용은 임시 저장됩니다</span>
          </div>

          <div className={styles.eyebrow}>{mode === "edit" ? "EDIT POST" : "WRITE POST"}</div>

          <div className={styles.heroHeader}>
            <div>
              <h1 className={styles.heroTitle}>{mode === "edit" ? "게시글 수정" : "게시글 작성"}</h1>
              <p className={styles.heroDescription}>{categoryDescription[category]}</p>
            </div>

            <div className={styles.heroActions}>
              <Link
                href={mode === "edit" && postId ? `/community/${postId}` : "/community"}
                className={styles.secondaryButton}
              >
                취소
              </Link>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={styles.primaryButton}
              >
                {isSubmitting ? "저장 중..." : mode === "edit" ? "수정 완료" : "등록하기"}
              </button>
            </div>
          </div>
        </section>

        <div className={styles.workspace}>
          <div className={styles.mainColumn}>
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>기본 정보</h2>
                <p className={styles.sectionDescription}>카테고리와 제목을 먼저 정리해 주세요.</p>
              </div>

              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>카테고리</label>
                  <select
                    value={category}
                    onChange={(event) => handleCategoryChange(event.target.value as PostCategory)}
                    className={styles.select}
                  >
                    {Object.keys(communityExtraFieldConfig).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>제목</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="제목을 입력해 주세요"
                    className={styles.input}
                  />
                </div>
              </div>
            </section>

            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>카테고리 추가 정보</h2>
                <div className={styles.pillRow}>
                  <p className={styles.sectionDescription}>선택한 카테고리에 맞는 정보를 적어주세요.</p>
                  <span className={styles.pill}>선택 입력</span>
                </div>
              </div>

              <div className={styles.extraGrid}>
                {extraFieldDefs.map((field) => (
                  <div key={field.key} className={styles.field}>
                    <label className={styles.fieldLabel}>{field.label}</label>
                    <input
                      type="text"
                      value={extraFields[field.key] ?? ""}
                      onChange={(event) =>
                        setExtraFields((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      placeholder={field.placeholder}
                      className={styles.input}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>본문</h2>
                <p className={styles.sectionDescription}>줄바꿈과 문단은 그대로 유지됩니다.</p>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>내용</label>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="내용을 입력해 주세요"
                  rows={12}
                  className={styles.textarea}
                />
              </div>
            </section>

            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.pillRow}>
                  <h2 className={styles.sectionTitle}>태그</h2>
                  <span className={styles.pill}>{tags.length}/5</span>
                </div>
                <p className={styles.sectionDescription}>검색에 잘 걸릴 단어를 짧게 적어 주세요.</p>
              </div>

              <div className={styles.tagList}>
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                    className={styles.tagButton}
                  >
                    #{tag} x
                  </button>
                ))}
              </div>

              <div className={styles.tagComposer}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="예: 대바늘, 스트라이프, 초보가이드"
                  className={styles.input}
                />
                <button
                  type="button"
                  onClick={handleTagAdd}
                  disabled={!tagInput.trim() || tags.length >= 5}
                  className={styles.ghostButton}
                >
                  태그 추가
                </button>
              </div>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.sideCard}>
              <div className={styles.sectionHead}>
                <div className={styles.pillRow}>
                  <h2 className={styles.sectionTitle}>첨부 이미지</h2>
                  <span className={styles.pill}>1장</span>
                </div>
                <p className={styles.sectionDescription}>게시글 대표 이미지를 1장 첨부할 수 있어요.</p>
              </div>

              <div className={styles.imageStage}>
                <div className={styles.imagePreview}>
                  {visibleImageUrl ? (
                    <Image
                      src={visibleImageUrl}
                      alt="첨부 이미지 미리보기"
                      fill
                      sizes="(max-width: 1024px) 100vw, 420px"
                      unoptimized={visibleImageUrl.startsWith("blob:")}
                    />
                  ) : (
                    <div className={styles.imageEmpty}>
                      이미지가 없으면 텍스트 중심 게시글로 등록돼요.
                    </div>
                  )}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />

              <div className={styles.imageActions}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={styles.ghostButton}
                >
                  이미지 선택
                </button>
                {visibleImageUrl ? (
                  <button type="button" onClick={handleImageRemove} className={styles.removeButton}>
                    이미지 제거
                  </button>
                ) : null}
              </div>
            </section>

            <section className={`${styles.sideCard} ${styles.previewCard}`}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>미리보기</h2>
              </div>

              <div className={styles.pillRow}>
                <span className={styles.pill}>{category}</span>
              </div>

              <h3 className={styles.previewTitle}>{title || "제목을 입력하면 여기에 보여요"}</h3>
              <p className={styles.previewBody}>
                {body || "본문을 입력하면 미리보기가 채워집니다."}
              </p>

              {extraFieldDefs.some((field) => (extraFields[field.key] ?? "").trim()) ? (
                <div className={styles.previewFields}>
                  {extraFieldDefs.map((field) =>
                    (extraFields[field.key] ?? "").trim() ? (
                      <div key={field.key} className={styles.previewField}>
                        <span className={styles.previewFieldLabel}>{field.label}</span>
                        <span className={styles.previewFieldValue}>{extraFields[field.key]}</span>
                      </div>
                    ) : null
                  )}
                </div>
              ) : null}

              {tags.length > 0 ? (
                <div className={styles.previewTagList}>
                  {tags.map((tag) => (
                    <span key={tag} className={styles.previewTag}>
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
