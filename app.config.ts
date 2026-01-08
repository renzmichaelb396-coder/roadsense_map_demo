
export default ({ config }) => {
  if (!process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) {
    throw new Error("❌ GOOGLE MAPS API KEY NOT LOADED");
  }

  return {
    ...config,
    name: "roadsense-mvp",
    slug: "roadsense-mvp",
    android: {
      ...config.android,
      package: "com.rbbrenz.roadsensemvp",
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
    },
    plugins: [
      "expo-build-properties"
    ],
  };
};
