export type Batch = {
  quantity: number;
  max_capacity: number;
  avg_daily_use: number;
  expiry_date: string;
};

export type StockStatus = "in_stock" | "low" | "out";

export const EXPIRY_WARNING_DAYS = 90;
export const LOW_STOCK_DAYS = 14;

export function daysUntil(date: string, today = new Date()) {
  const d = new Date(date + "T00:00:00Z").getTime();
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((d - t) / 86400000);
}

/** Usable stock excludes expired batches. */
export function summarizeStock(batches: Batch[], today = new Date()) {
  const usable = batches.filter((b) => daysUntil(b.expiry_date, today) >= 0);
  const quantity = usable.reduce((s, b) => s + b.quantity, 0);
  const capacity = usable.reduce((s, b) => s + b.max_capacity, 0);
  const dailyUse = usable.reduce((s, b) => s + Number(b.avg_daily_use), 0);
  const soonest = usable
    .filter((b) => b.quantity > 0)
    .map((b) => b.expiry_date)
    .sort()[0];
  const expiringSoon = soonest ? daysUntil(soonest, today) <= EXPIRY_WARNING_DAYS : false;
  let status: StockStatus = "in_stock";
  if (quantity <= 0) status = "out";
  else if (quantity < dailyUse * LOW_STOCK_DAYS || (capacity > 0 && quantity / capacity <= 0.2)) status = "low";
  const surplus = capacity > 0 && quantity / capacity >= 0.85 && dailyUse > 0 && quantity / dailyUse > 120;
  return { quantity, capacity, dailyUse, status, expiringSoon, soonestExpiry: soonest ?? null, surplus };
}

export const statusLabel: Record<StockStatus, string> = {
  in_stock: "In Stock",
  low: "Low",
  out: "Not available",
};

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const SPARE_COVER_DAYS = 60;
/** Units a facility can give away while keeping 60 days of its own supply. */
export function spareQuantity(s: { quantity: number; dailyUse: number }) {
  return Math.max(0, Math.floor(s.quantity - s.dailyUse * SPARE_COVER_DAYS));
}
