import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Linking, Platform } from "react-native";

function Pill({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        backgroundColor: "rgba(255,255,255,0.06)",
      }}
    >
      <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: "700" }}>
        {label}
      </Text>
    </View>
  );
}

function Card({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(255,255,255,0.05)",
        gap: 10,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>{title}</Text>
      <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 20 }}>{body}</Text>
    </View>
  );
}

export default function Landing() {
  const [name, setName] = useState("");
  const [lgu, setLgu] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");

  const mailto = useMemo(() => {
    const to = "shimasha30@gmail.com";
    const subject = encodeURIComponent("RoadSense LGU Pilot Request");
    const lines = [
      "Hello RoadSense Team,",
      "",
      "We want to request a 30-day LGU pilot demo.",
      "",
      `Name: ${name || "(your name)"}`,
      `LGU: ${lgu || "(your LGU)"}`,
      `Role/Office: ${role || "(your role)"}`,
      `Email: ${email || "(your email)"}`,
      "",
      "Preferred time for a quick demo call:",
      "- (date/time options)",
      "",
      "Thank you.",
    ];
    const body = encodeURIComponent(lines.join("\n"));
    return `mailto:${to}?subject=${subject}&body=${body}`;
  }, [name, lgu, role, email]);

  const openPilotEmail = async () => {
    try {
      await Linking.openURL(mailto);
    } catch (e) {
      console.log("Failed to open email:", e);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#05070B" }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }}>
        <View style={{ gap: 14, maxWidth: 960, width: "100%", alignSelf: "center" }}>
          <View style={{ marginTop: 6, flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <Pill label="LGU-ready pilot" />
            <Pill label="Real-time hazard map" />
            <Pill label="Exportable reports" />
            <Pill label="No new hardware" />
          </View>

          <Text style={{ color: "#fff", fontSize: 34, fontWeight: "900", lineHeight: 38 }}>
            Real-Time Road Hazard Intelligence for LGUs
          </Text>

          <Text style={{ color: "rgba(255,255,255,0.80)", fontSize: 16, lineHeight: 24 }}>
            RoadSense helps LGUs detect, track, and report road hazards using live map data — built for rapid response,
            planning, and accountability.
          </Text>

          <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
            <Pressable
              onPress={openPilotEmail}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 14,
                backgroundColor: "#38bdf8",
              }}
            >
              <Text style={{ color: "#041018", fontWeight: "900" }}>Request FREE 30-Day LGU Pilot</Text>
            </Pressable>

            <Pressable
              onPress={() => Linking.openURL("https://roadsense.ph").catch(() => {})}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.14)",
              }}
            >
              <Text style={{ color: "rgba(255,255,255,0.92)", fontWeight: "800" }}>
                {Platform.OS === "web" ? "See Demo (soon)" : "Pilot info"}
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              marginTop: 14,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              backgroundColor: "rgba(255,255,255,0.03)",
              padding: 16,
              gap: 10,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "900" }}>What LGUs get in the pilot</Text>
            <Text style={{ color: "rgba(255,255,255,0.80)", fontSize: 14, lineHeight: 20 }}>
              • Live hazard map + dashboard view{'\n'}
              • Incident tagging (type + severity){'\n'}
              • Export-ready summaries for reporting{'\n'}
              • Private demo session + onboarding
            </Text>

            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 18 }}>
              Note: The public website intentionally does not show a live public map. Live map access is provided during
              the pilot demo to protect data and avoid misinformation.
            </Text>
          </View>

          <View style={{ marginTop: 10, gap: 12 }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}>Why this works</Text>

            <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
              <View style={{ flex: 1, minWidth: 260 }}>
                <Card
                  title="Faster response"
                  body="A single operational map view: see hazards, prioritize, and coordinate action without scattered reports."
                />
              </View>
              <View style={{ flex: 1, minWidth: 260 }}>
                <Card
                  title="Accountability"
                  body="Track incidents and generate exportable summaries for internal reporting and transparency."
                />
              </View>
              <View style={{ flex: 1, minWidth: 260 }}>
                <Card
                  title="Low friction"
                  body="Runs on existing devices. Pilot starts in days, not months. No sensors required."
                />
              </View>
            </View>
          </View>

          <View
            style={{
              marginTop: 14,
              padding: 16,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "rgba(56,189,248,0.35)",
              backgroundColor: "rgba(56,189,248,0.08)",
              gap: 10,
            }}
          >
            <Text style={{ color: "#e9f7ff", fontSize: 16, fontWeight: "900" }}>Request Pilot Demo</Text>

            <View style={{ gap: 10 }}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={{
                  color: "#fff",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                }}
              />
              <TextInput
                value={lgu}
                onChangeText={setLgu}
                placeholder="LGU (e.g., City of ____)"
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={{
                  color: "#fff",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                }}
              />
              <TextInput
                value={role}
                onChangeText={setRole}
                placeholder="Role / Office (e.g., DRRMO, Engineering)"
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={{
                  color: "#fff",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                }}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoCapitalize="none"
                keyboardType="email-address"
                style={{
                  color: "#fff",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                }}
              />

              <Pressable
                onPress={openPilotEmail}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: "#38bdf8",
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ color: "#041018", fontWeight: "900" }}>Send Pilot Request</Text>
              </Pressable>
            </View>

            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 18 }}>
              We respond within 24 hours with a demo schedule and pilot checklist.
            </Text>
          </View>

          <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.10)" }}>
            <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
              RoadSense PH • Pilot-ready hazard intelligence for LGUs
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
