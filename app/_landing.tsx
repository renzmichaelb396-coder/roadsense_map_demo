import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Linking } from "react-native";

function Pill({ label }: { label: string }) {
  return (
    <View style={{
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      backgroundColor: "rgba(255,255,255,0.06)",
    }}>
      <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: "700" }}>
        {label}
      </Text>
    </View>
  );
}

export default function Landing() {
  const mailto = useMemo(() => {
    const subject = encodeURIComponent("RoadSense LGU Pilot Request");
    const body = encodeURIComponent("Requesting LGU pilot demo");
    return `mailto:shimasha30@gmail.com?subject=${subject}&body=${body}`;
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#05070B" }}>
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <View style={{ gap: 14, maxWidth: 960, alignSelf: "center" }}>
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <Pill label="LGU-ready pilot" />
            <Pill label="Real-time hazard map" />
            <Pill label="Exportable reports" />
            <Pill label="No new hardware" />
          </View>

          <Text style={{ color: "#fff", fontSize: 34, fontWeight: "900" }}>
            Real-Time Road Hazard Intelligence for LGUs
          </Text>

          <Pressable
            onPress={() => Linking.openURL(mailto)}
            style={{
              padding: 14,
              borderRadius: 14,
              backgroundColor: "#38bdf8",
              alignSelf: "flex-start",
            }}
          >
            <Text style={{ fontWeight: "900", color: "#041018" }}>
              Request FREE 30-Day LGU Pilot
            </Text>
          </Pressable>

          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
            Web-only landing. Live map available in pilot.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
