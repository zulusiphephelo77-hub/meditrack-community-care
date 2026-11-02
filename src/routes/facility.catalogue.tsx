import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, Lock, Snowflake, Thermometer } from "lucide-react";
import { toast } from "sonner";
import { Card, fmtDate, fmtTime } from "@/components/medicare";
import { supabase } from "@/integrations/supabase/client";
import { daysUntil } from "@/lib/stock";
import { WAREHOUSE_CODE } from "@/lib/network";
import { cn } from "@/lib/utils";
import { StatusPill } from "./facility.orders";
import { FacilityHeader, useFacilityCtx } from "./facility";

export const Route = createFileRoute("/facility/catalogue")({ component: Catalogue });

function Catalogue() {
  const { net } = useFacilityCtx();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"catalogue" | "take" | "orders" | "cold">("catalogue");
  const [count, setCount] = useState<{ batch: string; counted: string; reason: string }>({ batch: "", counted: "", reason: "" });
  if (!net) return null;
  const wh = net.facilities.find((f) => f.code === WAREHOUSE_CODE);
  const canEdit = net.me?.code === WAREHOUSE_CODE;
  const med = (id: string) => net.medicines.find((m) => m.id === id)?.name ?? "—";
  const name = (id: string) => net.facilities.find((f) => f.id === id)?.name ?? "—";
  const reservedFor = (batchId: string) =>
    net.transfers.filter((t) => t.from_batch_id === batchId && t.status === "pending").reduce((s, t) => s + t.quantity, 0);
  const rows = net.batches
    .filter((b) => b.facility_id === wh?.id)
    .map((b) => ({ ...b, reserved: reservedFor(b.id) }))
    .sort((a, b) => med(a.medicine_id).localeCompare(med(b.medicine_id)) || a.expiry_date.localeCompare(b.expiry_date));
  const queue = net.transfers.filter((t) => t.from_facility_id === wh?.id && ["pending", "approved", "packed"].includes(t.status));
  const coldReadings = net.readings.filter((r) => r.facility_id === wh?.id);
  const latest = coldReadings[0];

  async function rpc(fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) {
    const { error } = await fn();
    if (error) return void toast.error(error.message);
    toast.success(ok);
    qc.invalidateQueries({ queryKey: ["network"] });
  }

  const selected = rows.find((r) => r.id === count.batch);
  const counted = count.counted === "" ? null : Number(count.counted);

  return (
    <div className="space-y-4">
      <FacilityHeader title="Warehouse Catalogue" noScope />
      {!canEdit && (
        <p className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Read-only. Only the Provincial Warehouse can change the catalogue.</p>
      )}
      <div className="grid grid-cols-4 gap-1 rounded-full bg-muted p-1 text-xs">
        {([["catalogue", "Catalogue"], ["take", "Stock take"], ["orders", "Orders"], ["cold", "Cold chain"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("rounded-full py-2 font-semibold", tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{l}</button>
        ))}
      </div>

      {tab === "catalogue" && (
        <div className="space-y-2">
          {rows.map((b) => (
            <Card key={b.id} className="py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{med(b.medicine_id)}</p>
                  <p className="text-xs text-muted-foreground">Batch {b.batch_number} · Exp {fmtDate(b.expiry_date)} · Bin {b.bin_location ?? "—"}</p>
                </div>
                <span className={cn("flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", b.storage === "cold_chain" ? "bg-primary-soft text-primary-deep" : "bg-muted text-muted-foreground")}>
                  {b.storage === "cold_chain" && <Snowflake className="h-3 w-3" />}{b.storage === "cold_chain" ? "Cold chain" : "Ambient"}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-muted py-1.5"><p className="text-muted-foreground">Catalogue</p><p className="font-bold">{b.quantity}</p></div>
                <div className="rounded-lg bg-warning-soft py-1.5"><p className="text-warning-foreground">Reserved</p><p className="font-bold">{b.reserved}</p></div>
                <div className="rounded-lg bg-success-soft py-1.5"><p className="text-success">Available</p><p className="font-bold">{b.quantity - b.reserved}</p></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "take" && (
        <div className="space-y-3">
          {canEdit && (
            <Card className="space-y-3">
              <h2 className="font-semibold">Record a count</h2>
              <select className={field} value={count.batch} onChange={(e) => setCount({ ...count, batch: e.target.value })}>
                <option value="">Choose batch…</option>
                {rows.map((b) => <option key={b.id} value={b.id}>{med(b.medicine_id)} · {b.batch_number} ({b.quantity})</option>)}
              </select>
              <input type="number" min={0} placeholder="Physical count" className={field} value={count.counted} onChange={(e) => setCount({ ...count, counted: e.target.value })} />
              {selected && counted !== null && (
                <p className="text-sm">Catalogue {selected.quantity} · Counted {counted} · Variance{" "}
                  <span className={cn("font-bold", counted - selected.quantity < 0 ? "text-destructive" : "text-success")}>{counted - selected.quantity > 0 ? "+" : ""}{counted - selected.quantity}</span>
                </p>
              )}
              <input maxLength={200} placeholder="Reason (e.g. damaged, miscount, expired)" className={field} value={count.reason} onChange={(e) => setCount({ ...count, reason: e.target.value })} />
              <button disabled={!count.batch || counted === null || count.reason.trim().length < 3}
                onClick={() => rpc(() => supabase.rpc("apply_stock_take", { _batch: count.batch, _counted: counted ?? 0, _reason: count.reason }), "Adjustment saved").then(() => setCount({ batch: "", counted: "", reason: "" }))}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Apply adjustment</button>
            </Card>
          )}
          <h2 className="font-semibold">Adjustment history</h2>
          {net.adjustments.length === 0 && <p className="text-sm text-muted-foreground">No stock takes yet.</p>}
          {net.adjustments.map((a) => {
            const b = net.batches.find((x) => x.id === a.batch_id);
            return (
              <Card key={a.id} className="py-3 text-sm">
                <p className="font-semibold">{b ? `${med(b.medicine_id)} · ${b.batch_number}` : "Batch"}</p>
                <p className="text-xs text-muted-foreground">{a.catalogue_quantity} → {a.counted_quantity} ({a.variance > 0 ? "+" : ""}{a.variance}) · {a.reason} · {fmtDate(a.created_at)}</p>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "orders" && (
        <div className="space-y-2">
          {queue.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No incoming clinic orders.</p>}
          {queue.map((t) => {
            const batch = net.batches.find((b) => b.id === t.from_batch_id);
            const earlier = net.batches.find((b) =>
              b.facility_id === wh?.id && b.medicine_id === t.medicine_id && b.id !== t.from_batch_id && b.quantity - reservedFor(b.id) > 0 &&
              daysUntil(b.expiry_date, net.today) >= 0 && batch && b.expiry_date < batch.expiry_date);
            return (
              <Card key={t.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{med(t.medicine_id)} · {t.quantity}</p>
                  <StatusPill status={t.status} />
                </div>
                <p className="text-xs text-muted-foreground">To {name(t.to_facility_id)} · Pick batch {batch?.batch_number} (exp {batch && fmtDate(batch.expiry_date)}) · Bin {batch?.bin_location ?? "—"}{t.source === "auto_order" ? " · Auto-order" : ""}</p>
                {earlier && (
                  <p className="flex items-center gap-1.5 rounded-lg bg-warning-soft px-2 py-1.5 text-xs font-medium text-warning-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> FEFO: batch {earlier.batch_number} expires sooner ({fmtDate(earlier.expiry_date)}). Pick that first.
                  </p>
                )}
                {canEdit && (
                  <div className="flex gap-2">
                    {t.status === "pending" && <Btn onClick={() => rpc(() => supabase.rpc("act_on_stock_transfer", { _id: t.id, _action: "approve" }), "Approved")}>Approve</Btn>}
                    {t.status === "pending" && <Btn danger onClick={() => rpc(() => supabase.rpc("act_on_stock_transfer", { _id: t.id, _action: "reject" }), "Rejected")}>Reject</Btn>}
                    {t.status === "approved" && <Btn onClick={() => rpc(() => supabase.rpc("act_on_stock_transfer", { _id: t.id, _action: "pack" }), "Packed")}>Pack</Btn>}
                    {(t.status === "approved" || t.status === "packed") && <Btn onClick={() => rpc(() => supabase.rpc("act_on_stock_transfer", { _id: t.id, _action: "dispatch" }), "Dispatched")}>Dispatch</Btn>}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {tab === "cold" && (
        <div className="space-y-3">
          <Card className={cn("flex items-center gap-4", latest?.breach && "border-destructive bg-destructive-soft")}>
            <Thermometer className={cn("h-10 w-10 shrink-0", latest?.breach ? "text-destructive" : "text-primary")} />
            <div>
              <p className="text-xs text-muted-foreground">Cold room (safe range 2–8°C) · simulated</p>
              <p className="text-3xl font-bold">{latest ? `${Number(latest.temperature).toFixed(1)}°C` : "—"}</p>
              <p className={cn("text-sm font-semibold", latest?.breach ? "text-destructive" : "text-success")}>{latest ? (latest.breach ? "BREACH: check cold-chain stock" : "Within range") : "Waiting for first reading"}</p>
            </div>
          </Card>
          <h2 className="font-semibold">Recent readings</h2>
          <div className="grid grid-cols-3 gap-2">
            {coldReadings.slice(0, 18).map((r) => (
              <div key={r.id} className={cn("rounded-lg px-2 py-1.5 text-center text-xs", r.breach ? "bg-destructive-soft text-destructive" : "bg-muted")}>
                <p className="font-bold">{Number(r.temperature).toFixed(1)}°C</p>
                <p className="text-[10px] opacity-75">{fmtTime(r.created_at)}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">A new reading is taken every 30 seconds while a facility screen is open. Breaches send a notification.</p>
        </div>
      )}
    </div>
  );
}

const field = "w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";
function Btn({ onClick, children, danger }: { onClick: () => void; children: string; danger?: boolean }) {
  return <button onClick={onClick} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", danger ? "bg-destructive-soft text-destructive" : "bg-primary text-primary-foreground")}>{children}</button>;
}
