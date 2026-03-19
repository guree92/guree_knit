import { redirect } from "next/navigation";
import CommunityPostForm from "@/components/community/CommunityPostForm";
import { createClient as createServerClient } from "@/lib/supabase/server";

export default async function CommunityWritePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?returnTo=%2Fcommunity%2Fwrite");
  }

  return <CommunityPostForm mode="create" />;
}
