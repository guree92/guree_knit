import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewPatternForm from "@/components/patterns/NewPatternForm";

export default async function NewPatternPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?returnTo=%2Fpatterns%2Fnew");
  }

  return <NewPatternForm />;
}
