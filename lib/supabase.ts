import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "⚠️ Supabase env vars missing. Supabase will be a no-op:",
    { url, anonKey }
  );
}

export const supabase = url && anonKey
  ? createClient(url, anonKey)
  : {
      from: () => ({
        select: async () => ({ data: [], error: null }),
        upsert: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
      }),
    };
