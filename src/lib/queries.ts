import { supabase } from "@/integrations/supabase/client";
import { summarizeStock, distanceKm } from "./stock";

export type Facility = { id: string; name: string; kind: string; district: string; lat: number; lng: number };

export async function fetchMyPatient() {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("patients")
    .select("id, patient_number, full_name, date_of_birth, home_facility_id, facilities(id, name, kind, district, lat, lng)")
    .eq("user_id", u.user?.id ?? "")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchPatientMedicines(homeFacilityId: string) {
  const { data, error } = await supabase
    .from("patient_medicines")
    .select("id, dosage, medicines(id, name, condition, unit)");
  if (error) throw error;
  const ids = (data ?? []).map((r) => r.medicines!.id);
  const { data: batches } = await supabase
    .from("stock_batches")
    .select("medicine_id, quantity, max_capacity, avg_daily_use, expiry_date")
    .eq("facility_id", homeFacilityId)
    .in("medicine_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  return (data ?? []).map((r) => ({
    ...r,
    medicine: r.medicines!,
    stock: summarizeStock((batches ?? []).filter((b) => b.medicine_id === r.medicines!.id)),
  }));
}

export async function fetchAppointments() {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, title, scheduled_at, facilities(name)")
    .order("scheduled_at");
  if (error) throw error;
  return data ?? [];
}

export async function fetchMedicineAcrossFacilities(medicineId: string, home: Facility) {
  const [{ data: med }, { data: facs }, { data: batches }] = await Promise.all([
    supabase.from("medicines").select("id, name, condition, unit").eq("id", medicineId).maybeSingle(),
    supabase.from("facilities").select("id, name, kind, district, lat, lng"),
    supabase
      .from("stock_batches")
      .select("facility_id, batch_number, quantity, max_capacity, avg_daily_use, expiry_date")
      .eq("medicine_id", medicineId),
  ]);
  const perFacility = (facs ?? []).map((f) => ({
    facility: f,
    distance: distanceKm(home, f),
    stock: summarizeStock((batches ?? []).filter((b) => b.facility_id === f.id)),
  }));
  const homeEntry = perFacility.find((p) => p.facility.id === home.id)!;
  const alternatives = perFacility
    .filter((p) => p.facility.id !== home.id && p.stock.status !== "out" && p.facility.kind !== "Warehouse")
    .sort((a, b) => a.distance - b.distance);
  const nearestHospital =
    alternatives.find((a) => a.facility.kind === "Hospital") ?? alternatives[0] ?? null;
  return { medicine: med, home: homeEntry, alternatives, nearestHospital };
}

export async function fetchFacilityOverview() {
  const { data: u } = await supabase.auth.getUser();
  const { data: fac } = await supabase
    .from("facilities")
    .select("id, name, kind, district")
    .eq("user_id", u.user?.id ?? "")
    .maybeSingle();
  if (!fac) return null;
  const [{ data: meds }, { data: batches }] = await Promise.all([
    supabase.from("medicines").select("id, name, condition").order("name"),
    supabase
      .from("stock_batches")
      .select("id, medicine_id, batch_number, quantity, max_capacity, avg_daily_use, expiry_date")
      .eq("facility_id", fac.id),
  ]);
  const items = (meds ?? [])
    .map((m) => {
      const bs = (batches ?? []).filter((b) => b.medicine_id === m.id);
      return { medicine: m, batches: bs, stock: summarizeStock(bs), stocked: bs.length > 0 };
    })
    .filter((i) => i.stocked);
  return { facility: fac, items };
}
