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
    return { error: NextResponse.json({ message: "관리자만 처리할 수 있어요." }, { status: 403 }) };
  }

  return { user };
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await ensureAdmin();

  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { isResolved?: boolean } | null;

  if (typeof body?.isResolved !== "boolean") {
    return NextResponse.json({ message: "잘못된 요청이에요." }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const payload = {
    is_resolved: body.isResolved,
    resolved_at: body.isResolved ? new Date().toISOString() : null,
  };

  const { data, error } = await adminSupabase
    .from("community_comment_reports")
    .update(payload)
    .eq("id", id)
    .select("id, is_resolved, resolved_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ message: error?.message ?? "신고 상태 변경에 실패했어요." }, { status: 500 });
  }

  return NextResponse.json({ report: data });
}
