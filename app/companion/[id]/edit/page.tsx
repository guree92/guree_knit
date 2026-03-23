import { notFound, redirect } from "next/navigation";
import CompanionRoomForm from "@/components/companion/CompanionRoomForm";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { CompanionRoomRow } from "@/lib/companion";

type CompanionEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CompanionEditPage({ params }: CompanionEditPageProps) {
  const { id } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent(`/companion/${id}/edit`)}`);
  }

  const { data: roomRow } = await supabase
    .from("companion_rooms")
    .select("*")
    .eq("id", id)
    .eq("host_user_id", user.id)
    .maybeSingle();

  if (!roomRow) {
    notFound();
  }

  return <CompanionRoomForm mode="edit" initialRoom={roomRow as CompanionRoomRow} />;
}
