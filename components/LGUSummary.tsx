import { View, Text } from "react-native";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Summary = {
  total_hazards: number;
  mappable: number;
  pending_location: number;
};

export default function LGUSummary() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    supabase
      .from("lgu_hazard_overview")
      .select("*")
      .single()
      .then(({ data, error }) => {
        if (!error) setData(data as Summary);
      });
  }, []);

  if (!data) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 20,
        left: 20,
        backgroundColor: "#0b1220",
        padding: 16,
        borderRadius: 12,
        width: 220,
      }}
    >
      <Text style={{ color: "#e5e7eb", fontSize: 16, fontWeight: "600" }}>
        LGU Summary
      </Text>

      <Text style={{ color: "#38bdf8", marginTop: 8 }}>
        Total Hazards: {data.total_hazards}
      </Text>

      <Text style={{ color: "#22c55e" }}>
        Mappable: {data.mappable}
      </Text>

      <Text style={{ color: "#facc15" }}>
        Pending Location: {data.pending_location}
      </Text>
    </View>
  );
}
