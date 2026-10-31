import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { Card, fmtDate } from "@/components/medicare";
import { inScope } from "@/lib/network";
import { daysUntil, EXPIRY_WARNING_DAYS } from "@/lib/stock";
import { FacilityHeader, useFacilityCtx } from "./facility";

export const Route = createFileRoute("/facility/alerts")({ component: Alerts });

function Alerts() {
  const { net, scope } = useFacilityCtx();
  if (!net) return null;
  const items = inScope(net.items, scope);
  const expiring = items.flatMap((i) =>
    i.batches
      .filter((b) => b.quantity > 0 && daysUntil(b.expiry_date) <= EXPIRY_WARNING_DAYS)
      .map((b) => ({ ...b, item: i })),
  ).sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
  const short = items.filter((i) => i.stock.status !== "in_stock");
  return (
    <div className="space-y-5">
      <FacilityHeader title="Alerts" />
      <section>
        <h2 className="mb-2 flex items-center gap-2 font-semibold"><CalendarClock className="h-4 w-4 text-warning-foreground" />Expiry alerts</h2>
        {expiring.length === 0 && <p className="text-sm text-muted-foreground">Nothing expiring in the next 90 days.</p>}
        <div className="space-y-2">
          {expiring.map((b) => {
            const d = daysUntil(b.expiry_date);
            return (
              <Card key={b.id} className="py-3">
                <p className="text-sm font-semibold">{b.item.medicine.name} · {b.quantity}</p>
                <p className="text-xs text-warning-foreground">{d < 0 ? "Expired" : `Expires ${fmtDate(b.expiry_date)} (${d} days)`} · Batch {b.batch_number}</p>
                {scope === "all" && <p className="text-xs text-muted-foreground">{b.item.facility.name}</p>}
              </Card>
            );
          })}
        </div>
      </section>
      <section>
        <h2 className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-destructive" />Low & out of stock</h2>
        {short.length === 0 && <p className="text-sm text-muted-foreground">All stock levels are healthy.</p>}
        <div className="space-y-2">
          {short.map((i) => (
            <Card key={i.facility.id + i.medicine.id} className="py-3">
              <p className="text-sm font-semibold">{i.medicine.name}</p>
              <p className="text-xs text-destructive">{i.stock.status === "out" ? "Out of stock" : "Low"} · {i.stock.quantity} / {i.stock.capacity}</p>
              {scope === "all" && <p className="text-xs text-muted-foreground">{i.facility.name}</p>}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
