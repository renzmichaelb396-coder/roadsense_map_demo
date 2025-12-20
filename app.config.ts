import 'dotenv/config';

export default {
  expo: {
    name: "RoadSense",
    slug: "roadsense-mvp",
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};
