import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Hazard = {
  id: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  createdAt: number;
};

const STORAGE_KEY = "ROADSENSE_HAZARDS";

export default function AnalyticsScreen() {
  const [hazards, setHazards] = useState<Hazard[]>([]);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setHazards(JSON.parse(raw));
    })();
  }, []);

  const stats = useMemo(() => {
    const bySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    const byType: Record<string, number> = {};

    hazards.forEach((h) => {
      bySeverity[h.severity]++;
      byType[h.type] = (byType[h.type] || 0) + 1;
    });

    return {
      total: hazards.length,
      bySeverity,
      byType,
    };
  }, [hazards]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.h1}>Analytics</Text>

      <View style={styles.row}>
        <View style={styles.kpi}>
          <Text style={styles.kpiTitle}>Total</Text>
          <Text style={styles.kpiValue}>{stats.total}</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiTitle}>High</Text>
          <Text style={styles.kpiValue}>{stats.bySeverity.HIGH}</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiTitle}>Low</Text>
          <Text style={styles.kpiValue}>{stats.bySeverity.LOW}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>By Type</Text>
        {Object.entries(stats.byType).map(([k, v]) => (
          <View key={k} style={styles.listRow}>
            <Text style={styles.listLeft}>{k}</Text>
            <Text style={styles.listRight}>{v}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  h1: { color: "white", fontSize: 20, fontWeight: "800", marginBottom: 12 },
  h2: { color: "white", fontWeight: "700", marginBottom: 8 },

  row: { flexDirection: "row", gap: 10, marginBottom: 16 },
  kpi: { flex: 1, backgroundColor: "#111", padding: 12, borderRadius: 12 },
  kpiTitle: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  kpiValue: { color: "white", fontSize: 22, fontWeight: "900" },

  card: { backgroundColor: "#111", borderRadius: 12, padding: 12 },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  listLeft: { color: "white", fontWeight: "600" },
  listRight: { color: "rgba(255,255,255,0.7)" },
});
