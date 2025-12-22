import { Stack } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";
import { refreshHazardsFromCloud } from "../lib/hazards";

export default function RootLayout() {
  useEffect(() => {
    let lastState = AppState.currentState;

    const sub = AppState.addEventListener("change", (next) => {
      if (lastState !== "active" && next === "active") {
        refreshHazardsFromCloud().catch(() => {});
      }
      lastState = next;
    });

    return () => {
      sub.remove();
    };
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
