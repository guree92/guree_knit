"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { getCachedAdminStatus } from "@/lib/admin-status";
import { communityExtraFieldConfig } from "@/lib/community-post-content";
import { createClient } from "@/lib/supabase/client";
import {
  formatCommunityDate,
  mapCommunityPost,
  type CommunityPost,
  type CommunityPostRow,
} from "@/lib/community";
import styles from "./community-detail-page.module.css";
import heroHeaderImage from "../../../Image/headerlogo.png";

type CommunityLikeRow = {
  post_id: string;
};

type CommunityCommentRow = {
  id: string;
  post_id: string;
  parent_id: string | null;
  user_id: string;
  author_name: string | null;
  content: string;
  created_at: string | null;
};

type CommunityComment = {
  id: string;
  postId: string;
  parentId: string | null;
  userId: string;
  author: string;
  content: string;
  createdAt: string;
};

function mapCommunityComment(row: CommunityCommentRow): CommunityComment {
  return {
    id: row.id,
    postId: row.post_id,
    parentId: row.parent_id,
    userId: row.user_id,
    author: row.author_name?.trim() || "익명",
    content: row.content,
    createdAt: row.created_at ?? "",
  };
}

function formatCommentDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function canManagePost(
  post: CommunityPost | null,
  userEmail: string | null,
  userNames: string[]
) {
  if (!post) return false;

  const normalizedEmail = userEmail?.trim().toLowerCase() ?? "";

  if (post.authorEmail && normalizedEmail && post.authorEmail.trim().toLowerCase() === normalizedEmail) {
    return true;
  }

  return userNames.includes(post.ownerName?.trim() || post.author.trim());
}

function getCategoryToneClass(category: CommunityPost["category"]) {
  switch (category) {
    case "완성작":
      return styles.categoryShowcase;
    case "질문":
      return styles.categoryQuestion;
    case "정보공유":
      return styles.categoryInfo;
    case "같이뜨기":
      return styles.categoryTogether;
    default:
      return styles.categoryShowcase;
  }
}

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [postId, setPostId] = useState<string | null>(null);
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserNames, setCurrentUserNames] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isLikePending, setIsLikePending] = useState(false);
  const [isPostModerating, setIsPostModerating] = useState(false);
  const [isPostReportPending, setIsPostReportPending] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [pendingCommentId, setPendingCommentId] = useState<string | null>(null);
  const [pendingReportId, setPendingReportId] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      setIsLoading(true);

      if (!id || typeof id !== "string") {
        setIsNotFound(true);
        setIsLoading(false);
        return;
      }

      setPostId(id);

      const [
        {
          data: { user },
        },
        { data: postData, error: postError },
        { data: commentRows, error: commentError },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("community_posts")
          .select(`*, community_likes(count)`)
          .eq("id", id)
          .single(),
        supabase
          .from("community_comments")
          .select("*")
          .eq("post_id", id)
          .order("created_at", { ascending: true }),
      ]);

      setCurrentUserId(user?.id ?? null);
      setCurrentUserEmail(user?.email ?? null);
      setCurrentUserNames(
        Array.from(
          new Set(
            [
              user?.user_metadata?.nickname as string | undefined,
              user?.user_metadata?.name as string | undefined,
              user?.email?.split("@")[0],
            ]
              .map((item) => item?.trim())
              .filter(Boolean)
          )
        ) as string[]
      );

      const nextIsAdmin = await getCachedAdminStatus(user?.email);
      setIsAdmin(nextIsAdmin);

      if (postError || !postData) {
        console.error(postError);
        setIsNotFound(true);
        setIsLoading(false);
        return;
      }

      const mappedPost = mapCommunityPost(postData as CommunityPostRow);

      if (mappedPost.isHidden && !nextIsAdmin) {
        setIsNotFound(true);
        setIsLoading(false);
        return;
      }

      if (commentError) {
        console.error(commentError);
      }

      if (user?.id) {
        const { data: likeRows, error: likeError } = await supabase
          .from("community_likes")
          .select("post_id")
          .eq("post_id", id)
          .eq("user_id", user.id);

        if (likeError) {
          console.error(likeError);
          setIsLiked(false);
        } else {
          setIsLiked(((likeRows ?? []) as CommunityLikeRow[]).length > 0);
        }
      } else {
        setIsLiked(false);
      }

      setPost(mappedPost);
      setComments(((commentRows ?? []) as CommunityCommentRow[]).map(mapCommunityComment));
      setIsNotFound(false);
      setIsLoading(false);
    }

    void fetchDetail();
  }, [id, supabase]);

  const commentsByParent = useMemo(() => {
    return comments.reduce<Record<string, CommunityComment[]>>((acc, comment) => {
      const key = comment.parentId ?? "root";
      acc[key] ??= [];
      acc[key].push(comment);
      return acc;
    }, {});
  }, [comments]);

  const rootComments = commentsByParent.root ?? [];
  const isPostOwner = canManagePost(post, currentUserEmail, currentUserNames);
  const detailFieldLabels = post
    ? Object.fromEntries(communityExtraFieldConfig[post.category].map((field) => [field.key, field.label]))
    : {};
  const detailEntries = Object.entries(post?.extraFields ?? {}).filter(([, value]) => value.trim());

  async function requireUser(actionMessage: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert(actionMessage);
      router.push("/login");
      return null;
    }

    setCurrentUserId(user.id);
    return user;
  }

  async function handleLikeToggle() {
    if (!post || !postId || isLikePending) return;

    const user = await requireUser("좋아요를 누르려면 로그인이 필요해요.");
    if (!user) return;

    const nextLiked = !isLiked;

    setIsLikePending(true);
    setIsLiked(nextLiked);
    setPost((current) =>
      current
        ? { ...current, likes: Math.max(0, current.likes + (nextLiked ? 1 : -1)) }
        : current
    );

    const { error } = nextLiked
      ? await supabase.from("community_likes").insert({ post_id: postId, user_id: user.id })
      : await supabase
          .from("community_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

    if (error) {
      console.error(error);
      alert("좋아요 처리 중 오류가 생겼어요. 잠시 후 다시 시도해 주세요.");

      setIsLiked(!nextLiked);
      setPost((current) =>
        current
          ? { ...current, likes: Math.max(0, current.likes + (nextLiked ? -1 : 1)) }
          : current
      );
    }

    setIsLikePending(false);
  }

  async function handlePostHiddenToggle(nextHidden: boolean) {
    if (!postId || isPostModerating) return;

    const user = await requireUser("게시글 숨김 처리는 로그인 후 이용할 수 있어요.");
    if (!user) return;

    const shouldProceed = window.confirm(
      nextHidden ? "이 게시글을 숨김 처리할까요?" : "이 게시글의 숨김을 해제할까요?"
    );
    if (!shouldProceed) return;

    setIsPostModerating(true);

    const response = await fetch(`/api/admin/community/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: nextHidden }),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      alert(result?.message ?? "게시글 숨김 처리에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setIsPostModerating(false);
      return;
    }

    if (nextHidden) {
      alert("게시글을 숨김 처리했어요.");
      router.push("/community");
    } else {
      alert("게시글 숨김을 해제했어요.");
      setPost((current) =>
        current
          ? {
              ...current,
              isHidden: false,
              hiddenAt: null,
            }
          : current
      );
    }

    router.refresh();
    setIsPostModerating(false);
  }

  async function handleReportPost() {
    if (!post || !postId || isPostReportPending) return;

    const user = await requireUser("게시글 신고는 로그인 후 이용할 수 있어요.");
    if (!user) return;

    const shouldReport = window.confirm("이 게시글을 신고할까요?");
    if (!shouldReport) return;

    setIsPostReportPending(true);

    const { error } = await supabase.from("community_post_reports").insert({
      post_id: postId,
      reporter_user_id: user.id,
      post_author_name: post.author,
    });

    if (error) {
      console.error(error);
      alert(
        error.code === "23505"
          ? "이미 신고한 게시글이에요."
          : "게시글 신고 접수에 실패했어요. 잠시 후 다시 시도해 주세요."
      );
      setIsPostReportPending(false);
      return;
    }

    alert("게시글 신고가 접수되었어요.");
    setIsPostReportPending(false);
  }

  async function handleDeletePost() {
    if (!post || !postId || isPostModerating) return;

    const user = await requireUser("게시글 삭제는 로그인 후 이용할 수 있어요.");
    if (!user) return;

    if (!canManagePost(post, user.email ?? null, [
      user.user_metadata?.nickname as string | undefined,
      user.user_metadata?.name as string | undefined,
      user.email?.split("@")[0],
    ].filter(Boolean) as string[])) {
      alert("작성자만 게시글을 삭제할 수 있어요.");
      return;
    }

    const shouldDelete = window.confirm("이 게시글을 삭제할까요?");
    if (!shouldDelete) return;

    setIsPostModerating(true);

    const deleteQuery = supabase.from("community_posts").delete().eq("id", postId);

    const { error } = post.authorEmail
      ? await deleteQuery
      : await deleteQuery.eq("author_name", post.author);

    if (error) {
      console.error(error);
      alert("게시글 삭제에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setIsPostModerating(false);
      return;
    }

    alert("게시글을 삭제했어요.");
    router.push("/community");
    router.refresh();
    setIsPostModerating(false);
  }

  async function submitComment(content: string, parentId: string | null = null) {
    if (!post || isCommentSubmitting) return;
    const trimmed = content.trim();

    if (!trimmed) {
      alert("댓글 내용을 입력해 주세요.");
      return;
    }

    const user = await requireUser("댓글 등록은 로그인 후 이용할 수 있어요.");
    if (!user) return;

    const authorName =
      user.user_metadata?.nickname ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "익명";

    setIsCommentSubmitting(true);

    const { data, error } = await supabase
      .from("community_comments")
      .insert({
        post_id: post.id,
        parent_id: parentId,
        user_id: user.id,
        author_name: authorName,
        content: trimmed,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error(error);
      alert("댓글 등록에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setIsCommentSubmitting(false);
      return;
    }

    setComments((current) => [...current, mapCommunityComment(data as CommunityCommentRow)]);

    if (parentId) {
      setReplyText("");
      setActiveReplyId(null);
    } else {
      setNewComment("");
    }

    setIsCommentSubmitting(false);
  }

  async function handleUpdateComment(commentId: string) {
    const trimmed = editingText.trim();

    if (!trimmed) {
      alert("댓글 내용을 입력해 주세요.");
      return;
    }

    const user = await requireUser("댓글 수정은 로그인 후 이용할 수 있어요.");
    if (!user) return;

    setPendingCommentId(commentId);

    const { error } = await supabase
      .from("community_comments")
      .update({ content: trimmed })
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      alert("댓글 수정에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setPendingCommentId(null);
      return;
    }

    setComments((current) =>
      current.map((comment) =>
        comment.id === commentId ? { ...comment, content: trimmed } : comment
      )
    );
    setEditingCommentId(null);
    setEditingText("");
    setPendingCommentId(null);
  }

  async function handleDeleteComment(commentId: string) {
    const user = await requireUser("댓글 삭제는 로그인 후 이용할 수 있어요.");
    if (!user) return;

    const shouldDelete = window.confirm("이 댓글을 삭제할까요?");
    if (!shouldDelete) return;

    setPendingCommentId(commentId);

    if (isAdmin) {
      const response = await fetch(`/api/admin/community/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { message?: string } | null;
        alert(result?.message ?? "댓글 삭제에 실패했어요. 잠시 후 다시 시도해 주세요.");
        setPendingCommentId(null);
        return;
      }
    } else {
      const { error } = await supabase
        .from("community_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) {
        console.error(error);
        alert("댓글 삭제에 실패했어요. 잠시 후 다시 시도해 주세요.");
        setPendingCommentId(null);
        return;
      }
    }

    setComments((current) =>
      current.filter(
        (comment) => comment.id !== commentId && comment.parentId !== commentId
      )
    );

    if (editingCommentId === commentId) {
      setEditingCommentId(null);
      setEditingText("");
    }

    if (activeReplyId === commentId) {
      setActiveReplyId(null);
      setReplyText("");
    }

    setPendingCommentId(null);
  }

  async function handleReportComment(comment: CommunityComment) {
    if (!post) return;

    const user = await requireUser("댓글 신고는 로그인 후 이용할 수 있어요.");
    if (!user) return;

    if (user.id === comment.userId) {
      alert("본인 댓글은 신고할 수 없어요.");
      return;
    }

    const shouldReport = window.confirm("이 댓글을 신고할까요?");
    if (!shouldReport) return;

    setPendingReportId(comment.id);

    const { error } = await supabase.from("community_comment_reports").insert({
      post_id: post.id,
      comment_id: comment.id,
      reporter_user_id: user.id,
      comment_user_id: comment.userId,
    });

    if (error) {
      console.error(error);
      alert(
        error.code === "23505"
          ? "이미 신고한 댓글이에요."
          : "신고 접수에 실패했어요. 잠시 후 다시 시도해 주세요."
      );
      setPendingReportId(null);
      return;
    }

    alert("신고가 접수되었어요.");
    setPendingReportId(null);
  }

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <Header />
          <section className={styles.heroPanel}>
            <div className={styles.heroCopy}>
              <div className={styles.heroTitleImage}>
                <Image
                  src={heroHeaderImage}
                  alt="Hero header"
                  priority
                  unoptimized
                  className={styles.heroTitleImageAsset}
                />
              </div>
            </div>
          </section>

          <section className={styles.feedbackCard}>
            <p className={styles.sectionDescription}>게시글을 불러오는 중이에요...</p>
          </section>
        </div>
      </main>
    );
  }

  if (isNotFound || !post) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <Header />
          <section className={styles.heroPanel}>
            <div className={styles.heroCopy}>
              <div className={styles.heroTitleImage}>
                <Image
                  src={heroHeaderImage}
                  alt="Hero header"
                  priority
                  unoptimized
                  className={styles.heroTitleImageAsset}
                />
              </div>
            </div>
          </section>

          <section className={styles.feedbackCard}>
            <h1 className={styles.sectionTitle}>게시글을 찾을 수 없어요</h1>
            <p className={styles.sectionDescription}>요청하신 뜨개마당 글이 없거나 숨김 처리되었어요.</p>
            <Link
              href="/community"
              className={styles.submitButton}
            >
              목록으로
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Header />
          <section className={styles.heroPanel}>
            <div className={styles.heroCopy}>
              <div className={styles.heroTitleImage}>
                <Image
                  src={heroHeaderImage}
                  alt="Hero header"
                  priority
                  unoptimized
                  className={styles.heroTitleImageAsset}
                />
              </div>
            </div>
          </section>
        <div className={styles.workspace}>
          <div className={styles.mainColumn}>
            <section className={`${styles.hero} ${styles.heroCompact}`}>
              <div className={styles.heroBody}>
                <h1 className={styles.heroTitle}>{post.title}</h1>

                <div className={styles.heroMeta}>
                  <span className={`${styles.pill} ${getCategoryToneClass(post.category)}`}>
                    {post.category}
                  </span>
                  <span className={`${styles.pill} ${styles.pillMuted}`}>@{post.author}</span>
                  <span className={`${styles.pill} ${styles.pillMuted}`}>
                    {formatCommunityDate(post.createdAt)}
                  </span>
                  {post.isHidden && isAdmin ? (
                    <span className={`${styles.pill} ${styles.pillMuted}`}>관리자 숨김 상태</span>
                  ) : null}
                </div>
              </div>

              <div className={styles.heroActions}>
                <div className={styles.actionRow}>
                    <button
                      type="button"
                      onClick={handleLikeToggle}
                      disabled={isLikePending}
                      aria-pressed={isLiked}
                      className={`${styles.likeButton} ${isLiked ? styles.likeButtonActive : ""}`}
                    >
                      <span className={styles.buttonIcon} aria-hidden="true">
                        {isLiked ? "♥" : "♡"}
                      </span>
                      좋아요 {post.likes}
                    </button>

                    <span aria-hidden="true" className={styles.heroActionDivider} />

                    {!isPostOwner && !isAdmin ? (
                      <button
                        type="button"
                        onClick={handleReportPost}
                        disabled={isPostReportPending}
                        className={styles.dangerButton}
                      >
                        {isPostReportPending ? "신고 중..." : "게시글 신고"}
                      </button>
                    ) : null}

                    {isPostOwner ? (
                      <>
                        <Link href={`/community/${post.id}/edit`} className={styles.ghostButton}>
                          게시글 수정
                        </Link>
                        <button
                          type="button"
                          onClick={handleDeletePost}
                          disabled={isPostModerating}
                          className={styles.dangerButton}
                        >
                          {isPostModerating ? "삭제 중..." : "게시글 삭제"}
                        </button>
                      </>
                    ) : null}

                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => handlePostHiddenToggle(!post.isHidden)}
                        disabled={isPostModerating}
                        className={styles.dangerButton}
                      >
                        {isPostModerating ? "처리 중..." : post.isHidden ? "숨김 해제" : "게시글 숨김"}
                      </button>
                    ) : null}

                    <Link href="/community" className={styles.secondaryAction}>
                      목록으로
                    </Link>
                  </div>

                {post.isHidden && isAdmin ? (
                  <span className={styles.hintText}>현재 관리자에 의해 숨김 처리된 게시글이에요.</span>
                ) : null}
              </div>
            </section>

            <section className={`${styles.sectionCard} ${styles.introCard}`}>

              <div className={styles.noImageLayout}>
                <div className={styles.noImageMain}>
                  <div className={`${styles.descriptionCard} ${styles.descriptionCardWide}`}>
                    <p className={styles.descriptionText}>{post.content}</p>
                  </div>
                </div>
              </div>

              {post.imageUrl ? (
                <div className={styles.mobileInlineImage}>
                  <button
                    type="button"
                    className={styles.sideImageFrame}
                    onClick={() => setIsImageViewerOpen(true)}
                    aria-label="첨부 이미지를 크게 보기"
                  >
                    <Image
                      src={post.imageUrl}
                      alt={`${post.title} 첨부 이미지`}
                      fill
                      sizes="(max-width: 920px) 100vw, 46vw"
                      className={styles.sideImage}
                    />
                    <span className={styles.sideImageZoomBadge} aria-hidden="true">
                      🔍
                    </span>
                  </button>
                </div>
              ) : null}

              {post.tags.length > 0 ? (
                <div className={styles.tagList}>
                  {post.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>

            <section className={`${styles.sectionCard} ${styles.sectionSpanFull} ${styles.commentsSection}`}>
          <div className={`${styles.sectionHead} ${styles.commentsHead}`}>
            <h2 className={styles.sectionTitle}>댓글</h2>
            <p className={styles.sectionDescription}>댓글 {comments.length}개</p>
          </div>

          <div className={styles.composer}>
            <textarea
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              placeholder="이 글에 대한 생각을 편하게 남겨보세요."
              rows={4}
              className={styles.textarea}
            />
            <div className={styles.composerFooter}>
              <button
                type="button"
                onClick={() => submitComment(newComment)}
                disabled={isCommentSubmitting}
                className={styles.submitButton}
              >
                {isCommentSubmitting ? "등록 중..." : "댓글 등록"}
              </button>
            </div>
          </div>

              <div className={styles.commentList}>
            {rootComments.length > 0 ? (
              rootComments.map((comment) => {
                const replies = commentsByParent[comment.id] ?? [];
                const isReplyOpen = activeReplyId === comment.id;
                const isEditing = editingCommentId === comment.id;
                const isOwner = currentUserId === comment.userId;
                const canModerate = isOwner || isAdmin;
                const isPending = pendingCommentId === comment.id;
                const isReportPending = pendingReportId === comment.id;

                return (
                  <article
                    key={comment.id}
                    id={`comment-${comment.id}`}
                    className={styles.commentCard}
                  >
                    <div className={styles.commentHead}>
                      <div className={styles.commentMeta}>
                        <span className={styles.commentAuthor}>@{comment.author}</span>
                        <span className={styles.commentDate}>{formatCommentDate(comment.createdAt)}</span>
                      </div>

                      <div className={styles.commentActions}>
                        {!canModerate ? (
                          <button
                            type="button"
                            onClick={() => handleReportComment(comment)}
                            disabled={isReportPending}
                            className={styles.textButtonDanger}
                          >
                            {isReportPending ? "신고 중..." : "신고"}
                          </button>
                        ) : null}

                        {canModerate ? (
                          <>
                            {isOwner ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditingText(comment.content);
                                  setActiveReplyId(null);
                                  setReplyText("");
                                }}
                                disabled={isPending}
                                className={styles.textButton}
                              >
                                수정
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment.id)}
                              disabled={isPending}
                              className={styles.textButtonDanger}
                            >
                              {isAdmin && !isOwner ? "관리자 삭제" : "삭제"}
                            </button>
                          </>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => {
                            setActiveReplyId((current) =>
                              current === comment.id ? null : comment.id
                            );
                            setReplyText("");
                            setEditingCommentId(null);
                            setEditingText("");
                          }}
                          className={styles.textButtonAccent}
                        >
                          {isReplyOpen ? "답글 닫기" : "답글 달기"}
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className={styles.inlineForm}>
                        <textarea
                          value={editingText}
                          onChange={(event) => setEditingText(event.target.value)}
                          rows={3}
                          className={styles.inlineTextarea}
                        />
                        <div className={styles.inlineActions}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingText("");
                            }}
                            className={styles.smallGhostButton}
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateComment(comment.id)}
                            disabled={isPending}
                            className={styles.smallButton}
                          >
                            {isPending ? "저장 중..." : "수정 저장"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className={styles.commentBody}>{comment.content}</p>
                    )}
                    {isReplyOpen ? (
                      <div className={styles.inlineForm}>
                        <label className={styles.label}>답글 입력</label>
                        <textarea
                          value={replyText}
                          onChange={(event) => setReplyText(event.target.value)}
                          placeholder="댓글에 대한 답글을 남겨보세요."
                          rows={3}
                          className={styles.inlineTextarea}
                        />
                        <div className={styles.inlineActions}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReplyId(null);
                              setReplyText("");
                            }}
                            className={styles.smallGhostButton}
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => submitComment(replyText, comment.id)}
                            disabled={isCommentSubmitting}
                            className={styles.smallButton}
                          >
                            {isCommentSubmitting ? "등록 중..." : "답글 등록"}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {replies.length > 0 ? (
                      <div className={styles.replyList}>
                        {replies.map((reply) => {
                          const isReplyEditing = editingCommentId === reply.id;
                          const isReplyOwner = currentUserId === reply.userId;
                          const canReplyModerate = isReplyOwner || isAdmin;
                          const isReplyPending = pendingCommentId === reply.id;
                          const isReplyReportPending = pendingReportId === reply.id;

                          return (
                            <div
                              key={reply.id}
                              id={`comment-${reply.id}`}
                              className={styles.replyCard}
                            >
                              <div className={styles.commentHead}>
                                <div className={styles.commentMeta}>
                                  <span className={styles.commentAuthor}>@{reply.author}</span>
                                  <span className={styles.commentDate}>{formatCommentDate(reply.createdAt)}</span>
                                </div>

                                <div className={styles.commentActions}>
                                  {!canReplyModerate ? (
                                    <button
                                      type="button"
                                      onClick={() => handleReportComment(reply)}
                                      disabled={isReplyReportPending}
                                      className={styles.textButtonDanger}
                                    >
                                      {isReplyReportPending ? "신고 중..." : "신고"}
                                    </button>
                                  ) : null}

                                  {canReplyModerate ? (
                                    <>
                                      {isReplyOwner ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingCommentId(reply.id);
                                            setEditingText(reply.content);
                                            setActiveReplyId(null);
                                            setReplyText("");
                                          }}
                                          disabled={isReplyPending}
                                          className={styles.textButton}
                                        >
                                          수정
                                        </button>
                                      ) : null}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteComment(reply.id)}
                                        disabled={isReplyPending}
                                        className={styles.textButtonDanger}
                                      >
                                        {isAdmin && !isReplyOwner ? "관리자 삭제" : "삭제"}
                                      </button>
                                    </>
                                  ) : null}
                                </div>
                              </div>

                              {isReplyEditing ? (
                                <div className={styles.inlineForm}>
                                  <textarea
                                    value={editingText}
                                    onChange={(event) => setEditingText(event.target.value)}
                                    rows={3}
                                    className={styles.inlineTextarea}
                                  />
                                  <div className={styles.inlineActions}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCommentId(null);
                                        setEditingText("");
                                      }}
                                      className={styles.smallGhostButton}
                                    >
                                      취소
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateComment(reply.id)}
                                      disabled={isReplyPending}
                                      className={styles.smallButton}
                                    >
                                      {isReplyPending ? "저장 중..." : "수정 저장"}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className={styles.commentBody}>{reply.content}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateTitle}>아직 댓글이 없어요</p>
                <p className={styles.emptyStateDescription}>첫 댓글을 남겨 뜨개마당 대화를 시작해 보세요.</p>
              </div>
            )}
              </div>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            {post.imageUrl ? (
              <section className={`${styles.sectionCard} ${styles.sideImageCard}`}>
                <button
                  type="button"
                  className={styles.sideImageFrame}
                  onClick={() => setIsImageViewerOpen(true)}
                  aria-label="첨부 이미지를 크게 보기"
                >
                  <Image
                    src={post.imageUrl}
                    alt={`${post.title} 첨부 이미지`}
                    fill
                    sizes="320px"
                    className={styles.sideImage}
                  />
                  <span className={styles.sideImageZoomBadge} aria-hidden="true">
                    🔍
                  </span>
                </button>
              </section>
            ) : null}

            <section className={styles.sectionCard}>
              <div className={styles.summaryList}>
                <div className={styles.summaryRow}>
                  <span>카테고리</span>
                  <span className={styles.summaryValue}>{post.category}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>작성자</span>
                  <span className={styles.summaryValue}>@{post.author}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>작성일</span>
                  <span className={styles.summaryValue}>{formatCommunityDate(post.createdAt)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>좋아요</span>
                  <span className={styles.summaryValue}>{post.likes}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>댓글</span>
                  <span className={styles.summaryValue}>{comments.length}</span>
                </div>
              </div>
            </section>

            {detailEntries.length > 0 ? (
              <section className={styles.sectionCard}>
                <div className={styles.detailList}>
                  {detailEntries.map(([key, value]) => (
                    <div key={`aside-${key}`} className={styles.detailItem}>
                      <div className={styles.detailMeta}>
                        <span className={styles.detailIndex}>{detailFieldLabels[key] ?? key}</span>
                      </div>
                      <p className={styles.detailText}>{value}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </div>

      {post.imageUrl && isImageViewerOpen ? (
        <div
          className={styles.imageViewerOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="첨부 이미지 확대 보기"
          onClick={() => setIsImageViewerOpen(false)}
        >
          <div className={styles.imageViewerDialog} onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className={styles.imageViewerClose}
              onClick={() => setIsImageViewerOpen(false)}
              aria-label="확대 보기 닫기"
            >
              닫기
            </button>
            <div className={styles.imageViewerFrame}>
              <Image
                src={post.imageUrl}
                alt={`${post.title} 첨부 이미지 확대`}
                fill
                sizes="90vw"
                className={styles.imageViewerImage}
                priority
              />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
