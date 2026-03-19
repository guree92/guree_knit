import { createClient } from "@supabase/supabase-js";

export const ADMIN_ENV_ERROR_MESSAGE =
  "Admin Supabase environment variables are missing. Add NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ADMIN_EMAIL to the Cloudflare deployment environment.";

export function getAdminEnvError() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!supabaseUrl || !serviceRoleKey || !adminEmail) {
    return ADMIN_ENV_ERROR_MESSAGE;
  }

  return null;
}

export function createAdminClient() {
  const envError = getAdminEnvError();

  if (envError) {
    throw new Error(envError);
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
