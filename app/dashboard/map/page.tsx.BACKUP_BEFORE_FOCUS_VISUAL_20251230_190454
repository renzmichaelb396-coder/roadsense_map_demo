import MapPageInner from "./page.inner";
import { supabase } from "@/lib/supabase";

export default async function MapPage() {
  const { data } = await supabase
    .from("hazards")
    .select("id,type,severity,status,latitude,longitude,created_at");

  return <MapPageInner hazards={data ?? []} />;
}
