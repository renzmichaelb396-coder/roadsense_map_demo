import { View } from "react-native";
import Map, { NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export default function DemoReport() {
  return (
    <View style={{ flex: 1 }}>
      <Map
        initialViewState={{
          latitude: 14.5995,
          longitude: 120.9842,
          zoom: 12,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      >
        <NavigationControl position="top-right" />
      </Map>
    </View>
  );
}
