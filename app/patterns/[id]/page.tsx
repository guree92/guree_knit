"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LoginRequiredModal from "@/components/auth/LoginRequiredModal";
import Header from "@/components/layout/Header";
import {
  FavoritePatternAuthError,
  isFavoritePattern,
  toggleFavoritePattern,
} from "@/lib/favorite-patterns";
import { normalizeDetailRows } from "@/lib/pattern-detail";
import { createClient } from "@/lib/supabase/client";
import {
  getPatternById,
  getPatternImageUrl,
  isPatternLiked,
  PatternLikeAuthError,
  togglePatternLike,
  type PatternItem,
} from "@/lib/patterns";
import styles from "./pattern-detail-page.module.css";

const copyrightPolicyRows = [
  { key: "copyright_hobby_only", label: "취미 제작" },
  { key: "copyright_color_variation", label: "색상 변형" },
  { key: "copyright_size_variation", label: "사이즈 변형" },
  { key: "copyright_commercial_use", label: "상업적 사용" },
  { key: "copyright_redistribution", label: "도안 재배포" },
  { key: "copyright_modification_resale", label: "수정본 판매" },
] as const;

function parsePatternSize(sizeText: string) {
  const widthMatch = sizeText.match(/가로\s*(\d+)/);
  const heightMatch = sizeText.match(/세로\s*(\d+)/);
  const gaugeStitchesMatch = sizeText.match(/게이지\s*:\s*(\d+)코/);
  const gaugeRowsMatch = sizeText.match(/\*\s*(\d+)단/);

  return {
    sizeText:
      widthMatch || heightMatch
        ? `가로 ${widthMatch?.[1] ?? "0"}cm x 세로 ${heightMatch?.[1] ?? "0"}cm`
        : "",
    gaugeText:
      gaugeStitchesMatch || gaugeRowsMatch
        ? `${gaugeStitchesMatch?.[1] ?? "0"}코 x ${gaugeRowsMatch?.[1] ?? "0"}단`
        : "",
  };
}

export default function PatternDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);

  const [pattern, setPattern] = useState<PatternItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedId, setResolvedId] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminChecked, setIsAdminChecked] = useState(false);

  useEffect(() => {
    async function loadCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id ?? null);

      if (!user) {
        setIsAdmin(false);
        setIsAdminChecked(true);
        return;
      }

      const response = await fetch("/api/admin/status", { cache: "no-store" });

      if (!response.ok) {
        setIsAdmin(false);
        setIsAdminChecked(true);
        return;
      }

      const result = (await response.json()) as { isAdmin?: boolean };
      setIsAdmin(Boolean(result.isAdmin));
      setIsAdminChecked(true);
    }

    loadCurrentUser();
  }, [supabase]);

  useEffect(() => {
    async function load() {
      const id = params.id;

      if (!id || typeof id !== "string") {
        setLoading(false);
        return;
      }

      setResolvedId(id);
      const data = await getPatternById(id, { includeHidden: true });
      setPattern(data);
      setLoading(false);
    }

    load();
  }, [params.id]);

  useEffect(() => {
    async function loadLikeStatus() {
      if (!resolvedId || !currentUserId) {
        setIsLiked(false);
        return;
      }

      try {
        setIsLiked(await isPatternLiked(resolvedId));
      } catch (error) {
        console.error("좋아요 상태를 불러오지 못했어요.", error);
        setIsLiked(false);
      }
    }

    void loadLikeStatus();
  }, [currentUserId, resolvedId]);

  useEffect(() => {
    async function loadFavoriteStatus() {
      if (!resolvedId || !currentUserId) {
        setIsFavorite(false);
        return;
      }

      try {
        setIsFavorite(await isFavoritePattern(resolvedId));
      } catch (error) {
        console.error("찜 상태를 불러오지 못했어요.", error);
        setIsFavorite(false);
      }
    }

    void loadFavoriteStatus();
  }, [currentUserId, resolvedId]);

  const isOwner = Boolean(pattern && currentUserId && pattern.user_id === currentUserId);

  async function requireUser(message: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert(message);
      router.push("/login");
      return null;
    }

    setCurrentUserId(user.id);
    return user;
  }

  async function handleDelete() {
    if (!pattern) return;

    if (!isOwner) {
      alert("내가 작성한 도안만 삭제할 수 있어요.");
      return;
    }

    const confirmed = window.confirm("이 도안을 삭제할까요? 삭제 후에는 되돌릴 수 없어요.");
    if (!confirmed) return;

    setDeleting(true);

    try {
      if (pattern.image_path) {
        const { error: storageError } = await supabase.storage
          .from("pattern-images")
          .remove([pattern.image_path]);

        if (storageError) {
          throw new Error(storageError.message);
        }
      }

      const { error: deleteError } = await supabase.from("patterns").delete().eq("id", pattern.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      alert("도안을 삭제했어요.");
      router.push("/patterns");
      router.refresh();
    } catch (error) {
      console.error("도안 삭제 실패", error);
      const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요.";
      alert(`도안 삭제에 실패했어요: ${message}`);
    } finally {
      setDeleting(false);
    }
  }

  async function handleAdminHiddenToggle(nextHidden: boolean) {
    if (!pattern || deleting) return;

    const confirmed = window.confirm(
      nextHidden ? "이 도안을 숨김 처리할까요?" : "이 도안의 숨김을 해제할까요?"
    );
    if (!confirmed) return;

    setDeleting(true);

    try {
      const response = await fetch(`/api/admin/patterns/${pattern.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: nextHidden }),
      });

      const result = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(result?.message ?? "도안 숨김 처리에 실패했어요.");
      }

      alert(nextHidden ? "도안을 숨김 처리했어요." : "도안 숨김을 해제했어요.");

      if (nextHidden) {
        router.push("/patterns");
      } else {
        setPattern((current) =>
          current
            ? {
                ...current,
                is_hidden: false,
                hidden_at: null,
              }
            : current
        );
      }

      router.refresh();
    } catch (error) {
      console.error("도안 숨김 처리 실패", error);
      const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요.";
      alert(`도안 숨김 처리에 실패했어요: ${message}`);
    } finally {
      setDeleting(false);
    }
  }

  async function handleLike() {
    if (!pattern || liking) return;

    setLiking(true);

    try {
      const result = await togglePatternLike(pattern.id);
      setIsLiked(result.isLiked);
      setPattern(result.pattern);
    } catch (error) {
      if (error instanceof PatternLikeAuthError) {
        setIsLoginModalOpen(true);
        return;
      }

      console.error("좋아요 실패", error);
      const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요.";
      alert(`좋아요 처리에 실패했어요: ${message}`);
    } finally {
      setLiking(false);
    }
  }

  async function handleReport() {
    if (!pattern || reporting || isOwner || isAdmin) return;

    const user = await requireUser("도안 신고는 로그인 후 이용할 수 있어요.");
    if (!user) return;

    const confirmed = window.confirm("이 도안을 신고할까요?");
    if (!confirmed) return;

    setReporting(true);

    const { error } = await supabase.from("pattern_reports").insert({
      pattern_id: pattern.id,
      reporter_user_id: user.id,
    });

    if (error) {
      console.error("도안 신고 실패", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      alert(
        error.code === "23505"
          ? "이미 신고한 도안이에요."
          : error.message || "도안 신고 접수에 실패했어요. 잠시 후 다시 시도해 주세요."
      );
      setReporting(false);
      return;
    }

    alert("도안 신고가 접수되었어요.");
    setReporting(false);
  }

  async function handleFavoriteToggle() {
    if (!pattern || favoritePending) return;

    setFavoritePending(true);

    try {
      const result = await toggleFavoritePattern(pattern.id);
      setIsFavorite(result.isFavorite);
    } catch (error) {
      if (error instanceof FavoritePatternAuthError) {
        setIsLoginModalOpen(true);
        return;
      }

      console.error("도안 찜 처리 실패", error);
      const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요.";
      alert(`도안 찜 처리에 실패했어요: ${message}`);
    } finally {
      setFavoritePending(false);
    }
  }

  if (loading || !isAdminChecked) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <Header />
          <section className={styles.sectionCard}>
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>도안을 불러오는 중이에요</p>
              <p className={styles.emptyStateDescription}>조금만 기다리면 상세 정보를 보여드릴게요.</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!pattern || (pattern.is_hidden && !isAdmin)) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <Header />
          <section className={styles.sectionCard}>
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>도안을 찾을 수 없어요</p>
              <p className={styles.emptyStateDescription}>
                요청하신 도안 정보를 찾지 못했어요. ({resolvedId})
              </p>
              <Link href="/patterns" className={styles.actionButton}>
                도안 목록으로 돌아가기
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const imageUrl = getPatternImageUrl(pattern.image_path);
  const parsedSize = parsePatternSize(pattern.size || "");
  const detailRows = normalizeDetailRows(pattern.detail_rows, pattern.detail_content).filter(
    (row) => row.instruction
  );
  const previewPolicies = copyrightPolicyRows.map((policy) => ({
    label: policy.label,
    allowed: Boolean(pattern[policy.key]),
  }));
  const descriptionText = pattern.description || "설명이 아직 등록되지 않았어요.";
  const overviewRows = [
    { label: "난이도", value: pattern.level },
    { label: "카테고리", value: pattern.category },
    {
      label: "태그",
      value: pattern.tags?.length ? pattern.tags.map((tag) => `#${tag}`).join(", ") : "-",
    },
  ];
  const prepRows = [
    { label: "사용 실", value: pattern.yarn || "-" },
    { label: "바늘", value: pattern.needle || "-" },
    { label: "총량", value: pattern.total_yarn_amount || "-" },
    { label: "소요 시간", value: pattern.duration || "-" },
    { label: "완성 크기", value: parsedSize.sizeText || "-" },
    { label: "게이지", value: parsedSize.gaugeText || "-" },
  ];
  const previewRows = [
    ...prepRows,
    { label: "원작자", value: pattern.copyright_source || "-" },
    ...(pattern.copyright_source_url
      ? [{ label: "출처 링크", value: pattern.copyright_source_url }]
      : []),
  ];

  return (
    <main className={styles.page}>
      <LoginRequiredModal open={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <div className={styles.shell}>
        <Header />
        <div className={styles.workspace}>
          <div className={styles.mainColumn}>
            <section className={`${styles.hero} ${styles.heroCompact}`}>
              <div className={styles.heroBody}>
                <span className={styles.eyebrow}>Pattern Studio</span>
                <h1 className={styles.heroTitle}>{pattern.title}</h1>

                <div className={styles.heroMeta}>
                  <span className={`${styles.pill} ${styles.pillLevel}`}>{pattern.level}</span>
                  <span className={`${styles.pill} ${styles.pillCategory}`}>{pattern.category}</span>
                  <span className={`${styles.pill} ${styles.pillMuted}`}>
                    작성자 {pattern.author_nickname ?? "닉네임 없음"}
                  </span>
                  {pattern.is_hidden && isAdmin ? (
                    <span className={`${styles.pill} ${styles.pillMuted}`}>관리자 숨김 상태</span>
                  ) : null}
                </div>

                <div className={`${styles.actionRow} ${styles.heroActionRow}`}>
                  <button
                    type="button"
                    onClick={handleLike}
                    disabled={liking}
                    aria-pressed={isLiked}
                    className={`${styles.likeButton} ${isLiked ? `${styles.likeButtonActive} ${styles.buttonActive}` : ""}`}
                  >
                    <span className={styles.buttonIcon}>{liking ? "..." : isLiked ? "♥" : "♡"}</span>
                    좋아요 {pattern.like_count ?? 0}
                  </button>
                  <button
                    type="button"
                    onClick={handleFavoriteToggle}
                    disabled={favoritePending}
                    className={`${styles.favoriteButton} ${isFavorite ? styles.buttonActive : ""}`}
                  >
                    <span className={styles.buttonIcon}>
                      {favoritePending ? "..." : isFavorite ? "★" : "☆"}
                    </span>
                    {favoritePending ? "저장 중..." : "찜하기"}
                  </button>
                </div>
              </div>

              <div className={styles.heroActions}>
                <div className={styles.actionRow}>
                  {isOwner ? (
                    <>
                      <Link href={`/patterns/${pattern.id}/edit`} className={styles.ghostButton}>
                        수정하기
                      </Link>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className={styles.dangerButton}
                      >
                        {deleting ? "삭제 중..." : "삭제하기"}
                      </button>
                    </>
                  ) : null}
                  {!isOwner && !isAdmin ? (
                    <button
                      type="button"
                      onClick={handleReport}
                      disabled={reporting}
                      className={styles.dangerButton}
                    >
                      {reporting ? "신고 중..." : "도안 신고"}
                    </button>
                  ) : null}
                  {isAdmin && !isOwner ? (
                    <button
                      type="button"
                      onClick={() => handleAdminHiddenToggle(!pattern.is_hidden)}
                      disabled={deleting}
                      className={styles.dangerButton}
                    >
                      {deleting ? "처리 중..." : pattern.is_hidden ? "숨김 해제" : "관리자 숨김"}
                    </button>
                  ) : null}
                  <Link href="/patterns" className={styles.secondaryAction}>
                    목록으로
                  </Link>
                </div>
              </div>
            </section>

            <section className={`${styles.sectionCard} ${styles.introCard}`}>
              <div className={styles.sectionHeader}>
                <span className={styles.eyebrow}>Story</span>
                <h2 className={styles.sectionTitle}>도안 소개</h2>
              </div>

              <div className={styles.compactIntroGrid}>
                <div className={styles.introMain}>
                  <div className={styles.imageStage}>
                    <div className={styles.imageWrap}>
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={pattern.title}
                          fill
                          sizes="(max-width: 920px) 100vw, 46vw"
                        />
                      ) : (
                        <div className={styles.imageFallback} />
                      )}
                    </div>
                  </div>

                  <div className={styles.descriptionCard}>
                    <p className={styles.descriptionText}>{descriptionText}</p>
                  </div>
                </div>

                <div className={styles.introSide}>
                  <div className={styles.infoStack}>
                    <section className={styles.sectionCard}>
                      <div className={styles.sectionHeader}>
                        <span className={styles.eyebrow}>Story</span>
                        <h3 className={styles.sectionTitle}>도안 소개</h3>
                      </div>
                      <div className={styles.summaryList}>
                        {overviewRows.map((row) => (
                          <div key={row.label} className={styles.summaryRow}>
                            <span>{row.label}</span>
                            <span className={styles.summaryValue}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className={styles.sectionCard}>
                      <div className={styles.sectionHeader}>
                        <span className={styles.eyebrow}>Material</span>
                        <h3 className={styles.sectionTitle}>제작 준비</h3>
                      </div>
                      <div className={styles.prepGrid}>
                        {prepRows.map((row) => (
                          <div key={`compact-${row.label}`} className={styles.summaryRow}>
                            <span>{row.label}</span>
                            <span className={styles.summaryValue}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className={styles.sectionCard}>
                      <div className={styles.sectionHeader}>
                        <span className={styles.eyebrow}>Policy</span>
                        <h3 className={styles.sectionTitle}>이용 범위</h3>
                      </div>
                      <div className={styles.policyGrid}>
                        <div className={styles.summaryRow}>
                          <span>원작자</span>
                          <span className={styles.summaryValue}>{pattern.copyright_source || "-"}</span>
                        </div>
                        {pattern.copyright_source_url ? (
                          <div className={styles.summaryRow}>
                            <span>출처 링크</span>
                            <a
                              href={pattern.copyright_source_url}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.secondaryLinkAction}
                            >
                              링크 열기
                            </a>
                          </div>
                        ) : null}
                        {previewPolicies.map((policy) => (
                          <div key={`compact-policy-${policy.label}`} className={styles.policyRow}>
                            <span className={styles.fieldLabel}>{policy.label}</span>
                            <span
                              className={`${styles.policyState} ${
                                policy.allowed ? styles.policyAllowed : styles.policyDenied
                              }`}
                            >
                              {policy.allowed ? "O" : "X"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </section>

            <section className={`${styles.sectionCard} ${styles.sectionSpanFull} ${styles.sheetCard}`}>
              <div className={styles.sectionHeader}>
                <span className={styles.eyebrow}>Pattern Sheet</span>
                <h2 className={styles.sectionTitle}>도안 세부 내용</h2>
              </div>

              {detailRows.length ? (
                <div className={styles.detailList}>
                  {detailRows.map((row) => (
                    <div key={row.id} className={styles.detailItem}>
                      <div className={styles.detailMeta}>
                        <span className={styles.detailIndex}>{row.rowNumber}단</span>
                        <span className={styles.detailPreview}>
                          {row.instruction.length > 28
                            ? `${row.instruction.slice(0, 28)}...`
                            : row.instruction}
                        </span>
                      </div>
                      <p className={styles.detailText}>{row.instruction || "-"}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <p className={styles.emptyStateTitle}>등록된 세부 내용이 아직 없어요</p>
                  <p className={styles.emptyStateDescription}>
                    작성자가 아직 행별 설명을 입력하지 않았거나, 공개된 상세 내용이 없어요.
                  </p>
                </div>
              )}
            </section>

          </div>

          <aside className={styles.sideColumn}>
            <section className={`${styles.sectionCard} ${styles.previewCard}`}>
              <div className={styles.previewHead}>
                <span className={styles.eyebrow}>Preview</span>
                <div className={styles.previewImage}>
                  {imageUrl ? (
                    <Image src={imageUrl} alt={`${pattern.title} 미리보기`} fill sizes="320px" />
                  ) : (
                    <div className={styles.previewFallback} />
                  )}
                </div>
                <div>
                  <h3 className={styles.previewTitle}>{pattern.title}</h3>
                  <p className={styles.previewDescription}>{descriptionText}</p>
                </div>
              </div>

              <div className={styles.summaryList}>
                {previewRows.map((row) => (
                  <div key={`preview-${row.label}`} className={styles.summaryRow}>
                    <span>{row.label}</span>
                    <span className={styles.summaryValue}>{row.value}</span>
                  </div>
                ))}

                <div className={`${styles.summaryRow} ${styles.summaryRowTop}`}>
                  <span>허용 범위</span>
                  <div className={styles.policyList}>
                    {previewPolicies.map((policy) => (
                      <div key={`preview-policy-${policy.label}`} className={styles.policyItem}>
                        <span>{policy.label}</span>
                        <span
                          className={
                            policy.allowed
                              ? styles.summaryPolicyValueAllowed
                              : styles.summaryPolicyValueDenied
                          }
                        >
                          {policy.allowed ? "O" : "X"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

