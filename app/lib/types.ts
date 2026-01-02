export type Hazard = {
  id: string;
  type: string | null;
  severity: "HIGH" | "MEDIUM" | "LOW";
  status: "reported" | "resolved";
  created_at: string;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};
