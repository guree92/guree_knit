import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ message: "로그인이 필요해요." }, { status: 401 }) };
  }

  if (!process.env.ADMIN_EMAIL || user.email !== process.env.ADMIN_EMAIL) {
    return { error: NextResponse.json({ message: "관리자만 삭제할 수 있어요." }, { status: 403 }) };
  }

  return { user };
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await ensureAdmin();

  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;
  const adminSupabase = createAdminClient();

  const cleanupTargets = [
    adminSupabase.from("community_comment_reports").delete().eq("post_id", id),
    adminSupabase.from("community_comments").delete().eq("post_id", id),
    adminSupabase.from("community_likes").delete().eq("post_id", id),
  ];

  for (const task of cleanupTargets) {
    const { error } = await task;

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
  }

  const { error } = await adminSupabase.from("community_posts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
