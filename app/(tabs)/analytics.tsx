import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { getHazards } from "@/lib/hazards";

type Hazard = {
  id: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  createdAt: number;
};

export default function AnalyticsScreen() {
  const [hazards, setHazards] = useState<Hazard[]>([]);

  useEffect(() => {
    getHazards().then(setHazards).catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const bySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0 } as Record<string, number>;
    const byType: Record<string, number> = {};

    for (const h of hazards) {
      bySeverity[h.severity]++;
      byType[h.type] = (byType[h.type] || 0) + 1;
    }

    return { total: hazards.length, bySeverity, byType };
  }, [hazards]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.header}>
        <Ionicons name="analytics" size={22} color="white" />
        <Text style={styles.h1}>Analytics</Text>
      </View>

      <View style={styles.row3}>
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

  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  h1: { color: "white", fontSize: 20, fontWeight: "800" },
  h2: { color: "white", fontWeight: "800", marginBottom: 8 },

  row3: { flexDirection: "row", gap: 10, marginBottom: 16 },
  kpi: { flex: 1, backgroundColor: "#111", borderRadius: 14, padding: 12 },
  kpiTitle: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  kpiValue: { color: "white", fontSize: 22, fontWeight: "900" },

  card: { backgroundColor: "#111", borderRadius: 14, padding: 12 },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  listLeft: { color: "white", fontWeight: "700" },
  listRight: { color: "rgba(255,255,255,0.75)", fontWeight: "700" },
});
