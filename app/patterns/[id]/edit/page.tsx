import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditPatternForm from "@/components/patterns/EditPatternForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditPatternPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent(`/patterns/${id}/edit`)}`);
  }

  return <EditPatternForm routePatternId={id} />;
}
