import { redirect } from "next/navigation";
import CompanionRoomForm from "@/components/companion/CompanionRoomForm";
import { createClient as createServerClient } from "@/lib/supabase/server";

export default async function CompanionNewPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?returnTo=%2Fcompanion%2Fnew");
  }

  return <CompanionRoomForm />;
}
