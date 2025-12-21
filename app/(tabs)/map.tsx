import { Platform, View, Text } from "react-native";

export default function MapFallback() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Text style={{ fontSize: 16, fontWeight: "700", textAlign: "center" }}>
        Map screen (fallback)
      </Text>
      <Text style={{ marginTop: 8, textAlign: "center" }}>
        Current platform: {Platform.OS}
      </Text>
    </View>
  );
}
