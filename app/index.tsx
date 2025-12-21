import { Platform } from "react-native";
import { Redirect } from "expo-router";
import Landing from "./_landing";

export default function Index() {
  if (Platform.OS !== "web") {
    return <Redirect href="/(tabs)/map" />;
  }
  return <Landing />;
}
