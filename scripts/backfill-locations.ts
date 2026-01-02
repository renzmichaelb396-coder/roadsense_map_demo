import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

type MapboxFeature = {
  text: string;
  place_type: string[];
};

type MapboxResponse = {
  features: MapboxFeature[];
};

async function reverseGeocode(lat: number, lng: number) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  const json = (await res.json()) as MapboxResponse;

  let barangay = "";
  let city = "";

  for (const f of json.features || []) {
    if (f.place_type.includes("neighborhood") && !barangay) {
      barangay = f.text;
    }
    if (f.place_type.includes("locality") && !city) {
      city = f.text;
    }
  }

  const label =
    barangay && city
      ? `Brgy. ${barangay}, ${city}`
      : city || barangay || "Unknown";

  return { barangay, city, location_label: label };
}

async function run() {
  const { data, error } = await supabase
    .from("hazards")
    .select("id, latitude, longitude")
    .is("location_label", null);

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log("✅ No rows to backfill");
    return;
  }

  for (const h of data) {
    if (!h.latitude || !h.longitude) continue;

    const loc = await reverseGeocode(h.latitude, h.longitude);

    await supabase
      .from("hazards")
      .update(loc)
      .eq("id", h.id);

    console.log(`✔ Updated ${h.id}: ${loc.location_label}`);
  }
}

run().catch(console.error);
