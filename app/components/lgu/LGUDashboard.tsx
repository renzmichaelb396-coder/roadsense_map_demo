import { View, Text } from "react-native";

export function LGUDashboard({
  hazards,
  showResolved,
}: {
  hazards: any[];
  showResolved: boolean;
}) {
  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 12,
        backgroundColor: "#000",
        borderTopWidth: 1,
        borderColor: "#222",
      }}
    >
      <Text style={{ color: "#fff", fontSize: 13 }}>
        Visible hazards: {hazards.length}
      </Text>
      <Text style={{ color: "#888", fontSize: 11 }}>
        Showing {showResolved ? "all" : "unresolved"} only
      </Text>
    </View>
  );
}
