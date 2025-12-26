import { Stack } from "expo-router";
import { useEffect } from "react";
import { refreshHazardsFromCloud } from "@/lib/hazards";

export default function RootLayout() {
  useEffect(() => {
    refreshHazardsFromCloud().catch(() => {});
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
