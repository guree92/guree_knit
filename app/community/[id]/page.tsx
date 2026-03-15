"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/client";
import {
  formatCommunityDate,
  mapCommunityPost,
  type CommunityPost,
  type CommunityPostRow,
} from "@/lib/community";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

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

export default function CommunityDetailPage({ params }: PageProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [postId, setPostId] = useState<string | null>(null);
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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

  useEffect(() => {
    async function fetchDetail() {
      setIsLoading(true);

      const { id } = await params;
      setPostId(id);

      const [
        {
          data: { user },
        },
        { data: postData, error: postError },
        { data: commentRows, error: commentError },
        adminStatusResponse,
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
        fetch("/api/admin/status", { cache: "no-store" }),
      ]);

      setCurrentUserId(user?.id ?? null);

      const nextIsAdmin = adminStatusResponse.ok
        ? Boolean(((await adminStatusResponse.json()) as { isAdmin?: boolean }).isAdmin)
        : false;
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

    fetchDetail();
  }, [params, supabase]);

  const commentsByParent = useMemo(() => {
    return comments.reduce<Record<string, CommunityComment[]>>((acc, comment) => {
      const key = comment.parentId ?? "root";
      acc[key] ??= [];
      acc[key].push(comment);
      return acc;
    }, {});
  }, [comments]);

  const rootComments = commentsByParent.root ?? [];

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
      <main className="min-h-screen bg-[#f4f1eb] px-6 py-8 text-[#3d3128] md:px-8 md:py-10">
        <div className="mx-auto max-w-4xl">
          <Header />

          <section className="mt-12 rounded-[2rem] border border-[#e4dbcf] bg-[#fffdfa] p-8 shadow-[0_10px_30px_rgba(61,49,40,0.06)]">
            <p className="text-[#6f6257]">게시글을 불러오는 중이에요...</p>
          </section>
        </div>
      </main>
    );
  }

  if (isNotFound || !post) {
    return (
      <main className="min-h-screen bg-[#f4f1eb] px-6 py-8 text-[#3d3128] md:px-8 md:py-10">
        <div className="mx-auto max-w-4xl">
          <Header />

          <section className="mt-12 rounded-[2rem] border border-dashed border-[#d8cec0] bg-[#fcfaf7] p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black text-[#3d3128]">게시글을 찾을 수 없어요</h1>
            <p className="mt-3 text-[#6f6257]">요청하신 뜨개마당 글이 없거나 숨김 처리되었어요.</p>
            <Link
              href="/community"
              className="mt-6 inline-flex rounded-2xl bg-[#8a9b84] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#788a73]"
            >
              뜨개마당으로 돌아가기
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1eb] px-6 py-8 text-[#3d3128] md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        <Header />

        <section className="mt-12 rounded-[2rem] border border-[#e4dbcf] bg-[#fffdfa] p-8 shadow-[0_10px_30px_rgba(61,49,40,0.06)]">
          <Link
            href="/community"
            className="mb-6 inline-flex text-sm font-semibold text-[#6f6257] transition hover:text-[#8a9b84]"
          >
            뜨개마당으로 돌아가기
          </Link>

          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[#d7e0d3] px-3 py-1 text-xs font-semibold text-[#52624d]">{post.category}</span>
                <span className="text-sm text-[#9b8b7f]">@{post.author}</span>
                <span className="text-sm text-[#9b8b7f]">{formatCommunityDate(post.createdAt)}</span>
              </div>

              <h1 className="mt-4 text-3xl font-black text-[#3d3128] md:text-4xl">{post.title}</h1>
            </div>

            <div className="flex flex-col items-start gap-2 md:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleLikeToggle}
                  disabled={isLikePending}
                  aria-pressed={isLiked}
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition",
                    isLiked
                      ? "border-[#d17b7b] bg-[#fff1f1] text-[#b45353]"
                      : "border-[#ddd4c9] bg-white text-[#6f6257] hover:bg-[#f8f4ee]",
                    isLikePending ? "cursor-wait opacity-70" : "hover:-translate-y-0.5 hover:shadow-sm",
                  ].join(" ")}
                >
                  <span aria-hidden="true">{isLiked ? "♥" : "♡"}</span>
                  <span>{isLiked ? "좋아요 취소" : "좋아요"}</span>
                  <span>{post.likes}</span>
                </button>

                {!isAdmin ? (
                  <button
                    type="button"
                    onClick={handleReportPost}
                    disabled={isPostReportPending}
                    className="inline-flex items-center rounded-full border border-[#e0c7ba] bg-[#fff7f3] px-5 py-3 text-sm font-semibold text-[#b06c55] transition hover:bg-[#ffede4] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPostReportPending ? "신고 중..." : "게시글 신고"}
                  </button>
                ) : null}

                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => handlePostHiddenToggle(!post.isHidden)}
                    disabled={isPostModerating}
                    className="inline-flex items-center rounded-full border border-[#dfb0aa] bg-[#fff3f1] px-5 py-3 text-sm font-semibold text-[#b25a4f] transition hover:bg-[#ffe7e3] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPostModerating ? "처리 중..." : post.isHidden ? "숨김 해제" : "게시글 숨김"}
                  </button>
                ) : null}
              </div>
              {post.isHidden && isAdmin ? (
                <span className="text-sm text-[#b06c55]">현재 관리자에 의해 숨김 처리된 게시글이에요.</span>
              ) : !currentUserId ? (
                <span className="text-sm text-[#9b8b7f]">
                  로그인하면 좋아요와 신고를 이용할 수 있어요.
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-6 whitespace-pre-wrap rounded-[1.5rem] bg-[#f8f4ee] p-6 leading-8 text-[#5f5349]">
            {post.content}
          </div>

          {post.tags.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#ddd1c3] bg-[#eee4d8] px-3 py-1 text-xs font-medium text-[#6f6257]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-[2rem] border border-[#e4dbcf] bg-[#fffdfa] p-8 shadow-[0_10px_30px_rgba(61,49,40,0.05)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-[#3d3128]">댓글</h2>
              <p className="mt-2 text-sm text-[#8f8175]">댓글 {comments.length}개</p>
            </div>

            {!currentUserId ? (
              <p className="text-sm text-[#8f8175]">
                입력창은 누구나 볼 수 있고, 등록 버튼을 누를 때 로그인 여부를 확인해요.
              </p>
            ) : null}
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-[#e6ddd2] bg-[#f8f4ee] p-5">
            <label className="block text-sm font-semibold text-[#6f6257]">댓글 입력</label>
            <textarea
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              placeholder="이 글에 대한 생각을 편하게 남겨보세요."
              rows={4}
              className="mt-3 w-full resize-none rounded-[1.2rem] border border-[#ddd4c9] bg-white px-4 py-3 text-sm leading-7 text-[#3d3128] outline-none placeholder:text-[#a69486] focus:border-[#8a9b84]"
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-[#9b8b7f]">등록 버튼을 누르면 로그인 여부를 확인해요.</p>
              <button
                type="button"
                onClick={() => submitComment(newComment)}
                disabled={isCommentSubmitting}
                className="rounded-2xl bg-[#8a9b84] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#788a73] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCommentSubmitting ? "등록 중..." : "댓글 등록"}
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-4">
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
                    className="scroll-mt-28 rounded-[1.6rem] border border-[#e6ddd2] bg-[#fffdfa] p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-semibold text-[#5f5349]">@{comment.author}</span>
                        <span className="text-xs text-[#9b8b7f]">{formatCommentDate(comment.createdAt)}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {!canModerate ? (
                          <button
                            type="button"
                            onClick={() => handleReportComment(comment)}
                            disabled={isReportPending}
                            className="text-sm font-semibold text-[#c06d62] transition hover:text-[#a45449] disabled:opacity-50"
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
                                className="text-sm font-semibold text-[#9b8b7f] transition hover:text-[#6f6257] disabled:opacity-50"
                              >
                                수정
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment.id)}
                              disabled={isPending}
                              className="text-sm font-semibold text-[#c06d62] transition hover:text-[#a45449] disabled:opacity-50"
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
                          className="text-sm font-semibold text-[#8a9b84] transition hover:text-[#70806b]"
                        >
                          {isReplyOpen ? "답글 닫기" : "답글 달기"}
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="mt-3 rounded-[1.3rem] border border-[#ddd4c9] bg-[#f8f4ee] p-4">
                        <textarea
                          value={editingText}
                          onChange={(event) => setEditingText(event.target.value)}
                          rows={3}
                          className="w-full resize-none rounded-[1rem] border border-[#ddd4c9] bg-white px-4 py-3 text-sm leading-7 text-[#3d3128] outline-none focus:border-[#8a9b84]"
                        />
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingText("");
                            }}
                            className="rounded-2xl border border-[#ddd4c9] bg-white px-4 py-2 text-sm font-semibold text-[#6f6257] transition hover:bg-[#f2eee7]"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateComment(comment.id)}
                            disabled={isPending}
                            className="rounded-2xl bg-[#8a9b84] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#788a73] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isPending ? "저장 중..." : "수정 저장"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 whitespace-pre-wrap leading-7 text-[#5f5349]">{comment.content}</p>
                    )}
                    {isReplyOpen ? (
                      <div className="mt-4 rounded-[1.3rem] border border-[#ddd4c9] bg-[#f8f4ee] p-4">
                        <label className="block text-sm font-semibold text-[#6f6257]">답글 입력</label>
                        <textarea
                          value={replyText}
                          onChange={(event) => setReplyText(event.target.value)}
                          placeholder="댓글에 대한 답글을 남겨보세요."
                          rows={3}
                          className="mt-3 w-full resize-none rounded-[1rem] border border-[#ddd4c9] bg-white px-4 py-3 text-sm leading-7 text-[#3d3128] outline-none placeholder:text-[#a69486] focus:border-[#8a9b84]"
                        />
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReplyId(null);
                              setReplyText("");
                            }}
                            className="rounded-2xl border border-[#ddd4c9] bg-white px-4 py-2 text-sm font-semibold text-[#6f6257] transition hover:bg-[#f2eee7]"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => submitComment(replyText, comment.id)}
                            disabled={isCommentSubmitting}
                            className="rounded-2xl bg-[#8a9b84] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#788a73] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isCommentSubmitting ? "등록 중..." : "답글 등록"}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {replies.length > 0 ? (
                      <div className="mt-4 space-y-3 border-t border-[#eee5da] pt-4">
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
                              className="scroll-mt-28 rounded-[1.2rem] bg-[#f8f4ee] p-4 md:ml-8"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="text-sm font-semibold text-[#5f5349]">@{reply.author}</span>
                                  <span className="text-xs text-[#9b8b7f]">{formatCommentDate(reply.createdAt)}</span>
                                </div>

                                <div className="flex items-center gap-3">
                                  {!canReplyModerate ? (
                                    <button
                                      type="button"
                                      onClick={() => handleReportComment(reply)}
                                      disabled={isReplyReportPending}
                                      className="text-sm font-semibold text-[#c06d62] transition hover:text-[#a45449] disabled:opacity-50"
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
                                          className="text-sm font-semibold text-[#9b8b7f] transition hover:text-[#6f6257] disabled:opacity-50"
                                        >
                                          수정
                                        </button>
                                      ) : null}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteComment(reply.id)}
                                        disabled={isReplyPending}
                                        className="text-sm font-semibold text-[#c06d62] transition hover:text-[#a45449] disabled:opacity-50"
                                      >
                                        {isAdmin && !isReplyOwner ? "관리자 삭제" : "삭제"}
                                      </button>
                                    </>
                                  ) : null}
                                </div>
                              </div>

                              {isReplyEditing ? (
                                <div className="mt-3 rounded-[1rem] border border-[#ddd4c9] bg-white p-3">
                                  <textarea
                                    value={editingText}
                                    onChange={(event) => setEditingText(event.target.value)}
                                    rows={3}
                                    className="w-full resize-none rounded-[0.9rem] border border-[#ddd4c9] bg-white px-4 py-3 text-sm leading-7 text-[#3d3128] outline-none focus:border-[#8a9b84]"
                                  />
                                  <div className="mt-3 flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCommentId(null);
                                        setEditingText("");
                                      }}
                                      className="rounded-2xl border border-[#ddd4c9] bg-white px-4 py-2 text-sm font-semibold text-[#6f6257] transition hover:bg-[#f2eee7]"
                                    >
                                      취소
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateComment(reply.id)}
                                      disabled={isReplyPending}
                                      className="rounded-2xl bg-[#8a9b84] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#788a73] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {isReplyPending ? "저장 중..." : "수정 저장"}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="mt-2 whitespace-pre-wrap leading-7 text-[#5f5349]">{reply.content}</p>
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
              <div className="rounded-[1.6rem] border border-dashed border-[#d8cec0] bg-[#fcfaf7] px-6 py-12 text-center shadow-sm">
                <p className="text-lg font-semibold text-[#6f6257]">아직 댓글이 없어요</p>
                <p className="mt-2 text-sm text-[#9b8b7f]">첫 댓글을 남겨 뜨개마당 대화를 시작해 보세요.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}


