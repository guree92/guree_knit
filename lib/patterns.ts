import { supabase } from "@/lib/supabase";

export type PatternItem = {
  id: string;
  title: string;
  level: "초급" | "중급" | "고급";
  category: string;
  description: string;
  yarn: string;
  needle: string;
  size: string;
  tips: string[];
  image_path: string;
  created_at?: string;
};

export function getPatternImageUrl(imagePath: string) {
  if (!imagePath) return "";

  const { data } = supabase.storage
    .from("pattern-images")
    .getPublicUrl(imagePath);

  return data.publicUrl;
}

export async function getPatterns() {
  const { data, error } = await supabase
    .from("patterns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PatternItem[];
}

export async function getPatternById(id: string) {
  const { data, error } = await supabase
    .from("patterns")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  return data as PatternItem;
}