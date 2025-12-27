import { Platform } from "react-native";
import { Redirect } from "expo-router";

export default function Index() {
  if (Platform.OS === "web") {
    return <Redirect href="/_landing" />;
  }

  // Native: MUST enter the tabs group root
  return <Redirect href="/(tabs)" />;
}
