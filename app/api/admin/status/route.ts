import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.json({
    isAdmin: Boolean(user?.email && user.email === process.env.ADMIN_EMAIL),
  });
}
