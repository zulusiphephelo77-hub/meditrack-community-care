import { supabase } from "@/integrations/supabase/client";
import { distanceKm, spareQuantity, summarizeStock } from "./stock";

export async function fetchNetwork() {
  const { data: u } = await supabase.auth.getUser();
  const [facs, meds, batches, transfers, requests, history, clock, settings, notes, log, adjustments, readings] = await Promise.all([
    supabase.from("facilities").select("id, code, name, kind, district, lat, lng, user_id, username").order("name"),
    supabase.from("medicines").select("id, name, condition, unit").order("name"),
    supabase.from("stock_batches").select("id, facility_id, medicine_id, batch_number, quantity, max_capacity, avg_daily_use, expiry_date, storage, bin_location"),
    supabase.from("stock_transfers").select("*").order("created_at", { ascending: false }),
    supabase.from("transfer_requests").select("id, kind, status, created_at, to_facility_id, medicine_id, patients(full_name, patient_number)").order("created_at", { ascending: false }),
    supabase.from("transfer_history").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("sim_clock").select("offset_days").maybeSingle(),
    supabase.from("facility_settings").select("*"),
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("automation_log").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("stock_adjustments").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("cold_chain_readings").select("*").order("created_at", { ascending: false }).limit(60),
  ]);
  const named: [string, { error: { message: string } | null }][] = [["facilities", facs], ["medicines", meds], ["stock", batches], ["transfers", transfers], ["requests", requests], ["history", history], ["settings", settings], ["notifications", notes], ["automation log", log], ["stock adjustments", adjustments], ["cold chain", readings]];
  const warnings = named.filter(([, r]) => r.error).map(([n, r]) => `${n}: ${r.error!.message}`);
  if (facs.error || meds.error || batches.error) throw new Error(warnings.join("; "));
  const offset = clock.data?.offset_days ?? 0;
  const today = new Date(Date.now() + offset * 86400000);
  const facilities = facs.data ?? [];
  const medicines = meds.data ?? [];
  const allBatches = batches.data ?? [];
  const uname = u.user?.email?.split("@")[0];
  const me = facilities.find((f) => f.user_id === u.user?.id) ?? facilities.find((f) => f.username === uname) ?? null;

  const items = facilities.flatMap((f) =>
    medicines
      .map((m) => {
        const bs = allBatches.filter((b) => b.facility_id === f.id && b.medicine_id === m.id);
        return { facility: f, medicine: m, batches: bs, stock: summarizeStock(bs, today) };
      })
      .filter((i) => i.batches.length > 0),
  );

  /** Shortages (low/out) with nearby facilities that can spare stock. Warehouse counts as a supplier. */
  const shortages = items
    .filter((i) => i.stock.status !== "in_stock")
    .map((i) => {
      const suppliers = items
        .filter((o) => o.medicine.id === i.medicine.id && o.facility.id !== i.facility.id && spareQuantity(o.stock) > 0)
        .map((o) => ({ ...o, spare: spareQuantity(o.stock), distance: distanceKm(i.facility, o.facility) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);
      return { ...i, suppliers };
    });

  return {
    today,
    offset,
    warnings,
    settings: settings.data ?? [],
    notifications: notes.data ?? [],
    log: log.data ?? [],
    adjustments: adjustments.data ?? [],
    readings: readings.data ?? [],
    me,
    facilities,
    medicines,
    batches: allBatches,
    items,
    shortages,
    transfers: transfers.data ?? [],
    requests: requests.data ?? [],
    history: history.data ?? [],
  };
}

export type Network = Awaited<ReturnType<typeof fetchNetwork>>;
export const OPEN_TRANSFER = ["pending", "approved", "packed", "dispatched"];
export const WAREHOUSE_CODE = "pmb-wh";
export const OPEN_REQUEST = ["sent", "accepted", "ready"];

export function inScope<T extends { facility: { id: string } }>(list: T[], scope: string) {
  return scope === "all" ? list : list.filter((x) => x.facility.id === scope);
}
