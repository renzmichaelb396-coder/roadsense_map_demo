import { Stack } from "expo-router";
import { useEffect } from "react";
import { syncHazardsToSupabase } from "@/lib/hazardsSync";
import { FEATURES } from "@/lib/featureFlags";

export default function RootLayout() {
  useEffect(() => {
    if (FEATURES.USE_SUPABASE_HAZARDS) {
      // Fire-and-forget background sync
      syncHazardsToSupabase();
    }
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
