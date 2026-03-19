import { NextResponse } from "next/server";
import { createAdminClient, getAdminEnvError } from "@/lib/supabase/admin";
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

  const adminEnvError = getAdminEnvError();

  if (adminEnvError) {
    return NextResponse.json({ message: adminEnvError }, { status: 500 });
  }

  const { id } = await context.params;
  const adminSupabase = createAdminClient();

  const cleanupTasks = [
    adminSupabase.from("community_comment_reports").delete().eq("comment_id", id),
    adminSupabase.from("community_comments").delete().eq("id", id),
  ];

  for (const task of cleanupTasks) {
    const { error } = await task;

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
