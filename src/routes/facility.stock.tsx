import { pageHead } from '@/lib/page-head';
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { Card, fmtDate } from "@/components/medicare";
import { daysUntil } from "@/lib/stock";
import { inScope } from "@/lib/network";
import { cn } from "@/lib/utils";
import { FacilityHeader, useFacilityCtx } from "./facility";

export const Route = createFileRoute("/facility/stock")({ head: () => pageHead('Stock & Inventory', 'Medicine stock levels and batch expiry dates.'), component: Stock });

const FILTERS = ["All", "Low Stock", "Expiring Soon"] as const;

function Stock() {
  const { net, scope } = useFacilityCtx();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [q, setQ] = useState("");

  // Never silently render a blank page while network data is unavailable.
  if (!net) {
    return (
      <div className="space-y-4">
        <FacilityHeader title="Stock & Inventory" />
        <div role="status" className="rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-semibold">Stock information is not available yet.</p>
          <p className="mt-1 text-muted-foreground">The facility workspace has not finished loading. Refresh the page, or sign out and sign in again if this continues.</p>
        </div>
      </div>
    );
  }

  const allItems = Array.isArray(net.items) ? net.items : [];
  const scopedItems = inScope(allItems, scope);
  const items = scopedItems.filter((i) =>
    i.medicine.name.toLowerCase().includes(q.trim().toLowerCase()) &&
    (filter === "All" ? true : filter === "Low Stock" ? i.stock.status !== "in_stock" : i.stock.expiringSoon),
  );

  return (
    <div className="space-y-4">
      <FacilityHeader title="Stock & Inventory" />
      {net.warnings.length > 0 && (
        <section role="status" className="space-y-1 rounded-xl border border-warning/40 bg-warning-soft p-3 text-xs">
          <p className="font-semibold">Some facility data could not be loaded:</p>
          {net.warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </section>
      )}
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
      {items.length === 0 && (
        <section className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-semibold">No matching stock records.</p>
          <p className="text-muted-foreground">
            {allItems.length === 0
              ? "The database returned no facility-and-medicine stock batches. Check the data counts below to identify whether facilities, medicines or stock batches are missing."
              : "Stock records exist, but none match the selected site, search text or filter. Choose All Sites and the All filter, or clear your search."}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <p>Signed-in facility: <strong>{net.me?.name ?? "Not matched"}</strong></p>
            <p>Selected scope: <strong>{scope || "Not selected"}</strong></p>
            <p>Facilities returned: <strong>{net.facilities.length}</strong></p>
            <p>Medicines returned: <strong>{net.medicines.length}</strong></p>
            <p>Stock batches returned: <strong>{net.batches.length}</strong></p>
            <p>Stock items built: <strong>{allItems.length}</strong></p>
          </div>
          {!net.me && (
            <p className="rounded-lg bg-destructive-soft p-2 text-xs text-destructive">
              This signed-in account is not linked to a facility record. Sign out and sign in with the correct facility demo account.
            </p>
          )}
        </section>
      )}
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
