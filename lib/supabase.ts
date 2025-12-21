import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;

  const extra =
    Constants.expoConfig?.extra ??
    (Constants.manifest as any)?.extra ??
    {};

  const url = extra.supabaseUrl;
  const anonKey = extra.supabaseAnonKey;

  if (!url || !anonKey) {
    console.warn(
      "[Supabase] Missing env. Running in offline / local-only mode."
    );
    return null;
  }

  _client = createClient(url, anonKey);
  return _client;
}
