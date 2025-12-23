import { View, Text, StyleSheet } from "react-native";

export default function InsightsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Insights</Text>
      <Text style={styles.subtitle}>
        LGU analytics will live here (coming next). For now, focus is stabilizing the Android map.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#0b0f14" },
  title: { fontSize: 28, fontWeight: "800", color: "#ffffff", marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.75)" },
});
