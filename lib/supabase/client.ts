import { createClient } from "@supabase/supabase-js";
import config from "../public-config.json";
// Only a public, RLS-restricted key belongs here or in NEXT_PUBLIC_* variables.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || config.supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    config.supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
