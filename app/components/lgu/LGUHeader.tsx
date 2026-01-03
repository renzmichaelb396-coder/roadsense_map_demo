import { View, Text, Pressable } from "react-native";

export function LGUHeader({ onAdd }: { onAdd?: () => void }) {
  return (
    <View
      style={{
        height: 56,
        backgroundColor: "#111",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 16 }}>
        RoadSense LGU
      </Text>

      {onAdd && (
        <Pressable onPress={onAdd}>
          <Text style={{ color: "#4da3ff", fontSize: 14 }}>
            Add
          </Text>
        </Pressable>
      )}
    </View>
  );
}
