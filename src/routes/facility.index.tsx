import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, BarChart3, Boxes, CalendarClock, Package, Truck, ClipboardList } from "lucide-react";
import { Card, IconTile } from "@/components/medicare";
import { inScope, OPEN_REQUEST, OPEN_TRANSFER } from "@/lib/network";
import { FacilityHeader, useFacilityCtx } from "./facility";

export const Route = createFileRoute("/facility/")({ component: FacilityDashboard });

function FacilityDashboard() {
  const { net, scope } = useFacilityCtx();
  if (!net) return null;
  const items = inScope(net.items, scope);
  const low = items.filter((i) => i.stock.status !== "in_stock").length;
  const expiring = items.filter((i) => i.stock.expiringSoon).length;
  const involved = (id: string) => scope === "all" || id === scope;
  const pending =
    net.transfers.filter((t) => OPEN_TRANSFER.includes(t.status) && (involved(t.from_facility_id) || involved(t.to_facility_id))).length +
    net.requests.filter((r) => OPEN_REQUEST.includes(r.status) && r.to_facility_id && involved(r.to_facility_id)).length;

  return (
    <div className="space-y-5">
      <FacilityHeader title="Facility Dashboard" />
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Package} label="Total Stock Items" value={items.length} />
        <Stat icon={AlertTriangle} label="Low Stock" value={low} cls="bg-warning-soft text-warning-foreground" />
        <Stat icon={CalendarClock} label="Expiring Soon" value={expiring} cls="bg-destructive-soft text-destructive" />
        <Stat icon={ClipboardList} label="Orders Pending" value={pending} />
      </div>
      <section>
        <h2 className="mb-2 font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-2">
          <Quick to="/facility/stock" icon={Boxes} label="Stock & Inventory" />
          <Quick to="/facility/orders" icon={Truck} label="Orders & Deliveries" />
          <Quick to="/facility/alerts" icon={CalendarClock} label="Expiry Alerts" />
          <Quick to="/facility/reports" icon={BarChart3} label="Reports" />
        </div>
      </section>
      {net.shortages.length > 0 && (
        <Link to="/facility/orders" className="block rounded-2xl bg-primary-soft p-4 text-sm">
          <span className="font-semibold text-primary-deep">Where is stock short?</span>
          <span className="block text-muted-foreground">{inScope(net.shortages, scope).length} shortages with nearby surplus options →</span>
        </Link>
      )}
    </div>
  );
}

function Stat({ icon, label, value, cls }: { icon: typeof Package; label: string; value: number; cls?: string }) {
  return (
    <Card className="flex items-center gap-3">
      <IconTile icon={icon} className={cls} />
      <div className="min-w-0"><p className="text-xs leading-tight text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
    </Card>
  );
}

function Quick({ to, icon: Icon, label }: { to: string; icon: typeof Package; label: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-2.5 text-center text-[11px] font-medium leading-tight shadow-card">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></span>
      {label}
    </Link>
  );
}
