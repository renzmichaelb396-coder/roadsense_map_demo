import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, View } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import * as ImagePicker from "expo-image-picker";
import { v4 as uuidv4 } from "uuid";

import {
  Hazard,
  createHazard,
  fetchHazards,
  resolveHazard,
  deleteHazard,
} from "@/lib/hazards";
import { supabase } from "@/lib/supabase";

import { LGULegend } from "@/components/lgu/LGULegend";
import { LGUHeader } from "@/components/lgu/LGUHeader";
import { LGUDashboard } from "@/components/lgu/LGUDashboard";

export default function LGUMap() {
  const mapRef = useRef<MapView>(null);

  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [placing, setPlacing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [severity, setSeverity] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<string>("POTHOLE");

  const [severityFilter, setSeverityFilter] = useState<number[]>([1, 2, 3]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [showResolved, setShowResolved] = useState(false);

  const [cameraCenter, setCameraCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    fetchHazards().then(setHazards);
  }, []);

  function enterPlacingMode() {
    setPlacing(true);
    setSelectedId(null);
  }

  async function pickBeforePhoto(): Promise<string> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      throw new Error("Photo permission denied");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) {
      throw new Error("Photo selection required");
    }

    return result.assets[0].uri;
  }

  async function uploadBeforePhoto(
    hazardId: string,
    uri: string
  ): Promise<string> {
    const res = await fetch(uri);
    const blob = await res.blob();

    const path = `hazard-evidence/${hazardId}/before.jpg`;

    const { error } = await supabase.storage
      .from("hazard-evidence")
      .upload(path, blob, {
        upsert: true,
        contentType: "image/jpeg",
      });

    if (error) throw error;
    return path;
  }

  async function confirmPlacement() {
    if (!cameraCenter) return;

    try {
      const hazardId = uuidv4();

      const photoUri = await pickBeforePhoto();
      const beforePhotoPath = await uploadBeforePhoto(hazardId, photoUri);

      await createHazard({
        id: hazardId,
        latitude: cameraCenter.latitude,
        longitude: cameraCenter.longitude,
        severity,
        type,
        before_photo_path: beforePhotoPath,
      });

      const refreshed = await fetchHazards();
      setHazards(refreshed);
      setPlacing(false);
    } catch (err: any) {
      Alert.alert("Hazard not saved", err.message ?? "Photo required");
    }
  }

  const hazardsStable = useMemo(() => {
    const arr = [...hazards] as any[];
    return arr;
  }, [hazards]);

  const visibleHazards = useMemo(() => {
    return hazardsStable.filter((h: any) => {
      if (!showResolved && h.status === "resolved") return false;
      if (!severityFilter.includes(h.severity)) return false;
      if (typeFilter.length && !typeFilter.includes(h.type)) return false;
      return true;
    });
  }, [hazardsStable, severityFilter, typeFilter, showResolved]);

  return (
    <View style={{ flex: 1 }}>
      <LGUHeader onAdd={enterPlacingMode} />

      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        onRegionChangeComplete={(r: Region) =>
          setCameraCenter({ latitude: r.latitude, longitude: r.longitude })
        }
      >
        {visibleHazards.map((h: any) => (
          <Marker
            key={h.id}
            coordinate={{ latitude: h.latitude, longitude: h.longitude }}
            onPress={() => setSelectedId(String(h.id))}
          />
        ))}
      </MapView>

      <LGULegend />
      <LGUDashboard
        hazards={visibleHazards}
        showResolved={showResolved}
        setShowResolved={setShowResolved}
        onConfirmPlacement={placing ? confirmPlacement : undefined}
      />
    </View>
  );
}
