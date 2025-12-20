import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { loadHazards, getHeatmapCells, Hazard } from "@/lib/hazards";

export default function InsightsScreen() {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [hotspots, setHotspots] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const h = await loadHazards();
      setHazards(h);

      const cells = await getHeatmapCells();
      setHotspots(cells.length);
    })();
  }, []);

  const byType: Record<string, number> = {};
  for (const h of hazards) {
    byType[h.type] = (byType[h.type] || 0) + 1;
  }

  const topTypes = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Insights</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Total hazards</Text>
        <Text style={styles.value}>{hazards.length}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Hotspots detected</Text>
        <Text style={styles.value}>{hotspots}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Top hazard types</Text>
        {topTypes.map(([type, count]) => (
          <Text key={type} style={styles.row}>
            • {type}: {count}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "white",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  label: {
    color: "#aaa",
    fontSize: 14,
    marginBottom: 4,
  },
  value: {
    color: "white",
    fontSize: 24,
    fontWeight: "700",
  },
  row: {
    color: "#ccc",
    marginTop: 4,
  },
});
