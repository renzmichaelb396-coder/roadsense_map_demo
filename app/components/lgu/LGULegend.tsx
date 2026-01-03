import { View, Text } from "react-native";

export function LGULegend() {
  return (
    <View
      style={{
        position: "absolute",
        bottom: 140,
        left: 12,
        padding: 8,
        backgroundColor: "#111",
        borderRadius: 8,
        opacity: 0.9,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 12 }}>
        LGU Severity Legend
      </Text>
      <Text style={{ color: "#aaa", fontSize: 11 }}>
        Low • Medium • High
      </Text>
    </View>
  );
}
