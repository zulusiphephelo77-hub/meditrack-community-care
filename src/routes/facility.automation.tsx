import { pageHead } from '@/lib/page-head';
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Info, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/medicare";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { FacilityHeader, useFacilityCtx } from "./facility";

export const Route = createFileRoute("/facility/automation")({ head: () => pageHead('Automated Ordering', 'Facility reorder thresholds and automatic warehouse orders.'), component: Automation });

function Automation() {
  const { net } = useFacilityCtx();
  const qc = useQueryClient();
  const mine = net?.settings.find((s) => s.facility_id === net.me?.id);
  const [s, setS] = useState(mine);
  useEffect(() => setS(mine), [mine?.facility_id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!net || !s) return <p className="text-muted-foreground">No settings for this site.</p>;
  const isWarehouse = net.me?.code === "pmb-wh";

  async function save(next: typeof s) {
    if (!next) return;
    setS(next);
    const { error } = await supabase.from("facility_settings").update({
      auto_order_enabled: next.auto_order_enabled,
      threshold_mode: next.threshold_mode,
      threshold_percent: next.threshold_percent,
      threshold_count: next.threshold_count,
      expiry_months: next.expiry_months,
    }).eq("facility_id", next.facility_id);
    if (error) return void toast.error("Could not save: " + error.message);
    await supabase.rpc("run_automation");
    qc.invalidateQueries({ queryKey: ["network"] });
    toast.success("Saved");
  }

  const autoOrders = net.transfers.filter((t) => t.source === "auto_order" && t.to_facility_id === net.me?.id).slice(0, 5);
  const medName = (id: string) => net.medicines.find((m) => m.id === id)?.name;

  return (
    <div className="space-y-5">
      <FacilityHeader title="Automated Ordering" noScope />
      <Card className="flex items-center gap-3">
        <Settings2 className="h-6 w-6 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Auto-Order Trigger</p>
          <p className="text-xs text-muted-foreground">
            {s.auto_order_enabled ? "Enabled" : "Off"} (Refill at {s.threshold_mode === "percent" ? `${s.threshold_percent}%` : `${s.threshold_count} pills`})
          </p>
        </div>
        <button
          role="switch"
          aria-checked={s.auto_order_enabled}
          aria-label="Auto-order trigger"
          disabled={isWarehouse}
          onClick={() => save({ ...s, auto_order_enabled: !s.auto_order_enabled })}
          className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", s.auto_order_enabled ? "bg-success" : "bg-muted")}
        >
          <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-card shadow transition-all", s.auto_order_enabled ? "left-6" : "left-1")} />
        </button>
      </Card>
      {isWarehouse && <p className="text-xs text-muted-foreground">The warehouse supplies orders, so it doesn't auto-order itself.</p>}

      <section className="space-y-2">
        <h2 className="font-semibold">Reorder Rules</h2>
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Low Stock Threshold</p>
            <div className="flex rounded-full bg-muted p-0.5 text-xs font-semibold">
              {(["percent", "count"] as const).map((m) => (
                <button key={m} onClick={() => save({ ...s, threshold_mode: m })}
                  className={cn("rounded-full px-3 py-1", s.threshold_mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                  {m === "percent" ? "%" : "Pills"}
                </button>
              ))}
            </div>
          </div>
          {s.threshold_mode === "percent" ? (
            <NumberRow label="Refill when at or below" suffix="% of capacity" value={s.threshold_percent} min={1} max={90}
              onCommit={(v) => save({ ...s, threshold_percent: v })} />
          ) : (
            <NumberRow label="Refill when at or below" suffix="pills" value={s.threshold_count} min={1} max={100000}
              onCommit={(v) => save({ ...s, threshold_count: v })} />
          )}
        </Card>
        <Card>
          <NumberRow label="Expiry Threshold" suffix="months" value={s.expiry_months} min={1} max={24}
            onCommit={(v) => save({ ...s, expiry_months: v })} />
        </Card>
        <Card className="flex items-center justify-between">
          <p className="text-sm font-medium">Order Quantity</p>
          <p className="text-sm text-primary">Auto (based on usage)</p>
        </Card>
      </section>

      <div className="flex gap-3 rounded-2xl bg-primary-soft p-4 text-sm">
        <Info className="h-5 w-5 shrink-0 text-primary" />
        <p>When a medicine reaches the threshold, the system orders enough to refill to capacity (at least 30 days of use) from the Provincial Warehouse, earliest-expiry batch first, and sends you a notification.</p>
      </div>

      {autoOrders.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Recent auto-orders</h2>
          <div className="space-y-2">
            {autoOrders.map((t) => (
              <Card key={t.id} className="flex justify-between py-3 text-sm">
                <span>{medName(t.medicine_id)} · {t.quantity}</span>
                <span className="font-semibold capitalize text-primary">{t.status}</span>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function NumberRow({ label, suffix, value, min, max, onCommit }: { label: string; suffix: string; value: number; min: number; max: number; onCommit: (v: number) => void }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <span className="flex items-center gap-1.5">
        <input type="number" min={min} max={max} value={v} onChange={(e) => setV(e.target.value)}
          onBlur={() => {
            const n = Math.round(Number(v));
            if (!Number.isFinite(n) || n < min || n > max) { setV(String(value)); toast.error(`Enter ${min}–${max}`); return; }
            if (n !== value) onCommit(n);
          }}
          className="w-20 rounded-lg border border-input bg-card px-2 py-1 text-right outline-none focus:ring-2 focus:ring-ring" />
        <span className="text-xs text-muted-foreground">{suffix}</span>
      </span>
    </label>
  );
}
