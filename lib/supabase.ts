import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

if (!extra?.supabaseUrl || !extra?.supabaseAnonKey) {
  throw new Error(
    'Supabase env missing. Check EXPO_PUBLIC_SUPABASE_URL / ANON_KEY'
  );
}

export const supabase = createClient(
  extra.supabaseUrl,
  extra.supabaseAnonKey
);
