import React from "react";
import { View, Text, Pressable } from "react-native";
import type { Hazard } from "@/lib/hazards";

type Props = {
  hazard: Hazard;
  typeLabel: string;
  severityLabel: "LOW" | "MEDIUM" | "HIGH";
  onClose: () => void;
};

function fmt(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

export default function HazardDetailCard({
  hazard,
  typeLabel,
  severityLabel,
  onClose,
}: Props) {
  return (
    <View
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 300,
        backgroundColor: "#0b0b0b",
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: "#222",
        zIndex: 99999,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
          HAZARD DETAILS
        </Text>
        <Pressable onPress={onClose}>
          <Text style={{ color: "#60a5fa", fontWeight: "900" }}>CLOSE</Text>
        </Pressable>
      </View>

      <View style={{ height: 10 }} />

      <Text style={{ color: "white", fontWeight: "900" }}>
        {typeLabel} · {severityLabel}
      </Text>

      <Text style={{ color: "#cfcfcf", marginTop: 6 }}>
        Status: {hazard.status.toUpperCase()}
      </Text>

      <Text style={{ color: "#cfcfcf", marginTop: 6 }}>
        Location: {hazard.latitude.toFixed(6)}, {hazard.longitude.toFixed(6)}
      </Text>

      <Text style={{ color: "#cfcfcf", marginTop: 6 }}>
        Reported: {fmt(hazard.createdAt)}
      </Text>
    </View>
  );
}
