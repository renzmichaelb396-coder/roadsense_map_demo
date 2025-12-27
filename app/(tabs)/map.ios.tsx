import { View, Text } from "react-native";

export default function MapIOSDisabled() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "900", marginBottom: 8 }}>Android Only</Text>
      <Text style={{ textAlign: "center", opacity: 0.8 }}>
        Map Ops is currently supported on Android only.
      </Text>
    </View>
  );
}
