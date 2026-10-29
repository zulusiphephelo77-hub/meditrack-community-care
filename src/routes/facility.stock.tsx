import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, StatusBadge, fmtDate } from "@/components/medicare";
import { daysUntil } from "@/lib/stock";
import { cn } from "@/lib/utils";
import { useFacility } from "./facility.index";

export const Route = createFileRoute("/facility/stock")({ component: Stock });

const FILTERS = ["All", "Low stock", "Expiring soon"] as const;

function Stock() {
  const { data } = useFacility();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  if (!data) return <p className="text-muted-foreground">Loading…</p>;
  const items = data.items.filter((i) =>
    filter === "All" ? true : filter === "Low stock" ? i.stock.status !== "in_stock" : i.stock.expiringSoon,
  );
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Stock & Inventory</h1>
      <div className="flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("shrink-0 rounded-full px-4 py-1.5 text-sm font-medium", filter === f ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary-deep")}>
            {f}
          </button>
        ))}
      </div>
      {items.map((i) => (
        <Card key={i.medicine.id}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{i.medicine.name}</p>
            <StatusBadge status={i.stock.status} />
          </div>
          <p className="text-xs text-muted-foreground">{i.medicine.condition} · avg {i.stock.dailyUse}/day</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (i.stock.quantity / Math.max(1, i.stock.capacity)) * 100)}%` }} />
          </div>
          <div className="mt-3 space-y-1">
            {i.batches.map((b) => {
              const d = daysUntil(b.expiry_date);
              return (
                <div key={b.id} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Batch {b.batch_number} · {b.quantity}/{b.max_capacity}</span>
                  <span className={d <= 90 ? "font-semibold text-warning-foreground" : "text-muted-foreground"}>Exp {fmtDate(b.expiry_date)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
