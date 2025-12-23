import { View, Text, Platform } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

const DEFAULT_REGION = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function LGUMap() {
  const mapRef = useRef<MapView>(null);

  const [userCoord, setUserCoord] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      setUserCoord({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  function recenterMap() {
    if (!mapRef.current || !userCoord) return;

    mapRef.current.animateCamera({
      center: userCoord,
      zoom: 17,
    });
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton={Platform.OS === "android"}
      />

      {/* Recenter Button */}
      <View
        style={{
          position: "absolute",
          bottom: 30,
          right: 20,
          backgroundColor: "#2563eb",
          padding: 14,
          borderRadius: 30,
        }}
        onTouchEnd={recenterMap}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>RECENTER</Text>
      </View>
    </View>
  );
}
