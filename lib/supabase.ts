import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const extra =
  ((Constants.expoConfig?.extra as Extra | undefined) ??
    (Constants.manifest as any)?.extra?.expoClient?.extra ??
    (Constants.manifest as any)?.extra ??
    {}) as Extra;

const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  extra.supabaseUrl ||
  "";

const anon =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  extra.supabaseAnonKey ||
  "";

export const supabase =
  url && anon
    ? createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
