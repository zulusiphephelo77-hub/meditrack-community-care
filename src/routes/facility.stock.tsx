import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { Card, fmtDate } from "@/components/medicare";
import { daysUntil } from "@/lib/stock";
import { inScope } from "@/lib/network";
import { cn } from "@/lib/utils";
import { FacilityHeader, useFacilityCtx } from "./facility";

export const Route = createFileRoute("/facility/stock")({ component: Stock });

const FILTERS = ["All", "Low Stock", "Expiring Soon"] as const;

function Stock() {
  const { net, scope } = useFacilityCtx();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [q, setQ] = useState("");
  if (!net) return null;
  const items = inScope(net.items, scope).filter((i) =>
    i.medicine.name.toLowerCase().includes(q.trim().toLowerCase()) &&
    (filter === "All" ? true : filter === "Low Stock" ? i.stock.status !== "in_stock" : i.stock.expiringSoon),
  );
  return (
    <div className="space-y-4">
      <FacilityHeader title="Stock & Inventory" />
      <div className="relative">
        <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search medicine…" maxLength={60}
          className="w-full rounded-xl border border-input bg-card py-2.5 pr-3 pl-9 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("shrink-0 rounded-full px-4 py-1.5 text-sm font-medium", filter === f ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary-deep")}>
            {f}
          </button>
        ))}
      </div>
      {items.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No matching stock.</p>}
      {items.map((i) => (
        <Card key={i.facility.id + i.medicine.id}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold">{i.medicine.name}</p>
              <p className="text-sm">Stock: <span className="font-semibold">{i.stock.quantity} / {i.stock.capacity}</span></p>
              {scope === "all" && <p className="truncate text-xs text-muted-foreground">{i.facility.name}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {i.stock.status === "out" && <Badge cls="bg-destructive-soft text-destructive">Out of Stock</Badge>}
              {i.stock.status === "low" && <Badge cls="bg-destructive-soft text-destructive">Low Stock</Badge>}
              {i.stock.expiringSoon && <Badge cls="bg-warning-soft text-warning-foreground">Expiring Soon</Badge>}
              {i.stock.status === "in_stock" && !i.stock.expiringSoon && <Badge cls="bg-success-soft text-success">OK</Badge>}
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (i.stock.quantity / Math.max(1, i.stock.capacity)) * 100)}%` }} />
          </div>
          <div className="mt-2 space-y-0.5">
            {i.batches.map((b) => (
              <div key={b.id} className="flex justify-between text-xs">
                <span className="text-muted-foreground">Batch {b.batch_number} · {b.quantity}</span>
                <span className={daysUntil(b.expiry_date, net.today) <= 90 ? "font-semibold text-warning-foreground" : "text-muted-foreground"}>Exp {fmtDate(b.expiry_date)}</span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function Badge({ cls, children }: { cls: string; children: string }) {
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", cls)}>{children}</span>;
}
