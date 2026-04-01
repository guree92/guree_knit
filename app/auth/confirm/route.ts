import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = requestUrl.searchParams.get("next") ?? "/login";

  const redirectUrl = new URL(next, requestUrl.origin);

  try {
    const supabase = await createClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        redirectUrl.searchParams.set("verified", "1");
        return NextResponse.redirect(redirectUrl);
      }
    }

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });

      if (!error) {
        redirectUrl.searchParams.set("verified", "1");
        return NextResponse.redirect(redirectUrl);
      }
    }
  } catch (error) {
    console.error(error);
  }

  redirectUrl.searchParams.set("verified", "0");
  return NextResponse.redirect(redirectUrl);
}
