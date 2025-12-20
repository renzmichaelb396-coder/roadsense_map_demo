import React from "react";
import { View, Text } from "react-native";

/**
 * Web shim for react-native-maps
 * Expo Router/Metro may still scan native route files on web.
 * This prevents native-only imports from crashing web bundling.
 */

export default function MapView() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Map is not available on web.</Text>
    </View>
  );
}

// Common named exports used by react-native-maps codebases:
export function Marker() {
  return null;
}
export function Callout() {
  return null;
}
export function Circle() {
  return null;
}
export function Polygon() {
  return null;
}
export function Polyline() {
  return null;
}

// Types (keep loose to avoid TS friction)
export type Region = any;
export type MapMarkerProps = any;
