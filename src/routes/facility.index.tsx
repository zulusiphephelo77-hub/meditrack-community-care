import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, LogOut, Package, PackageX, TrendingUp } from "lucide-react";
import { Card, IconTile, Logo, StatusBadge } from "@/components/medicare";
import { fetchFacilityOverview } from "@/lib/queries";
import { signOut } from "@/lib/role-guard";

export const Route = createFileRoute("/facility/")({ component: FacilityDashboard });

export function useFacility() {
  return useQuery({ queryKey: ["facility-overview"], queryFn: fetchFacilityOverview });
}

function FacilityDashboard() {
  const { data } = useFacility();
  const qc = useQueryClient();
  const navigate = useNavigate();
  if (!data) return <p className="text-muted-foreground">Loading…</p>;
  const { facility, items } = data;
  const low = items.filter((i) => i.stock.status === "low");
  const out = items.filter((i) => i.stock.status === "out");
  const expiring = items.filter((i) => i.stock.expiringSoon);
  const surplus = items.filter((i) => i.stock.surplus);
  const alerts = [...out, ...low];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <Logo />
        <button aria-label="Sign out" onClick={async () => { await signOut(qc); navigate({ to: "/", replace: true }); }}
          className="rounded-full border border-border bg-card p-2 text-muted-foreground"><LogOut className="h-4 w-4" /></button>
      </div>
      <div>
        <h1 className="text-2xl font-bold">Facility Dashboard</h1>
        <p className="text-sm text-muted-foreground">{facility.name} · {facility.kind} · {facility.district}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Package} label="Stock items" value={items.length} />
        <Stat icon={AlertTriangle} label="Low stock" value={low.length} tone="warning" />
        <Stat icon={PackageX} label="Out of stock" value={out.length} tone="danger" />
        <Stat icon={CalendarClock} label="Expiring soon" value={expiring.length} tone="warning" />
      </div>

      {surplus.length > 0 && (
        <div className="flex gap-3 rounded-2xl bg-success-soft p-4">
          <TrendingUp className="h-5 w-5 shrink-0 text-success" />
          <p className="text-sm"><span className="font-semibold">Surplus available:</span> {surplus.map((s) => s.medicine.name).join(", ")}. Consider transferring to a high-demand site.</p>
        </div>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Needs attention</h2>
          <Link to="/facility/stock" className="text-sm font-medium text-primary">All stock</Link>
        </div>
        {alerts.length === 0 && <p className="text-sm text-muted-foreground">All medicines are well stocked.</p>}
        <div className="space-y-2">
          {alerts.map((i) => (
            <Card key={i.medicine.id} className="flex items-center justify-between py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{i.medicine.name}</p>
                <p className="text-xs text-muted-foreground">Stock: {i.stock.quantity} / {i.stock.capacity}</p>
              </div>
              <StatusBadge status={i.stock.status} />
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: typeof Package; label: string; value: number; tone?: "warning" | "danger" }) {
  const cls = tone === "warning" ? "bg-warning-soft text-warning-foreground" : tone === "danger" ? "bg-destructive-soft text-destructive" : undefined;
  return (
    <Card className="flex items-center gap-3">
      <IconTile icon={icon} className={cls} />
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
    </Card>
  );
}
