import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "RoadSense PH",
  slug: "roadsense-mvp",
  scheme: "roadsense",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  updates: {
    fallbackToCacheTimeout: 0
  },
  assetBundlePatterns: ["**/*"],
  android: {
    package: "com.rbbrenz.roadsensemvp",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    }
  },
  ios: {
    supportsTablet: true
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: "6fe99bf7-ee02-4fc1-9164-3f00abe77805"
    }
  }
};

export default config;
