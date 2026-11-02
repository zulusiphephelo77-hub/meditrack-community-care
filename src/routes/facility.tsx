import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import { Bell, Boxes, LayoutDashboard, MoreHorizontal, Truck } from "lucide-react";
import { BottomNav, Logo, PrototypeBanner, fmtDate } from "@/components/medicare";
import { requireRole } from "@/lib/role-guard";
import { fetchNetwork, type Network } from "@/lib/network";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/facility")({
  ssr: false,
  beforeLoad: () => requireRole("facility"),
  head: () => ({ meta: [{ title: "Facility Dashboard — MediCare Sync" }, { name: "robots", content: "noindex" }] }),
  component: FacilityLayout,
});

type Ctx = { net: Network | undefined; scope: string; setScope: (s: string) => void };
const FacilityCtx = createContext<Ctx>({ net: undefined, scope: "all", setScope: () => {} });
export const useFacilityCtx = () => useContext(FacilityCtx);
export const useNetwork = () => useQuery({ queryKey: ["network"], queryFn: fetchNetwork });

export const ENGINE_INTERVAL_MS = 30_000;

function FacilityLayout() {
  const { data: net } = useNetwork();
  const qc = useQueryClient();
  const [scope, setScope] = useState<string>("");
  useEffect(() => {
    if (!scope && net?.me) setScope(net.me.id);
  }, [net, scope]);

  // Automation engine: runs on load and every 30 seconds.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      await supabase.rpc("run_automation");
      if (alive) qc.invalidateQueries({ queryKey: ["network"] });
    };
    tick();
    const id = setInterval(tick, ENGINE_INTERVAL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [qc]);

  return (
    <FacilityCtx.Provider value={{ net, scope: scope || "all", setScope }}>
      <div className="theme-facility min-h-screen bg-background pb-20 md:pb-0">
        <PrototypeBanner />
        <BottomNav
          items={[
            { to: "/facility", label: "Dashboard", icon: LayoutDashboard, exact: true },
            { to: "/facility/stock", label: "Stock", icon: Boxes },
            { to: "/facility/orders", label: "Orders", icon: Truck },
            { to: "/facility/alerts", label: "Alerts", icon: Bell },
            { to: "/facility/more", label: "More", icon: MoreHorizontal },
          ]}
        />
        <main className="mx-auto max-w-3xl px-5 py-5">
          {net ? <Outlet /> : <p className="text-muted-foreground">Loading…</p>}
        </main>
      </div>
    </FacilityCtx.Provider>
  );
}

export function FacilityHeader({ title, noScope }: { title: string; noScope?: boolean }) {
  const { net, scope, setScope } = useFacilityCtx();
  const current = net?.facilities.find((f) => f.id === scope);
  const unread = net?.notifications.filter((n) => n.status === "unread").length ?? 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <Logo />
        <div className="flex items-center gap-2">
          {net && net.offset > 0 && (
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">
              Sim: {fmtDate(net.today.toISOString())}
            </span>
          )}
          <Link to="/facility/inbox" aria-label={`Inbox, ${unread} unread`} className="relative rounded-full border border-border bg-card p-2 text-primary">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <h1 className="text-xl leading-tight font-bold sm:text-2xl">{title}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {noScope ? net?.me?.name : current ? `${current.kind} · ${current.name}` : "All sites in the network"}
          </p>
        </div>
        {!noScope && (
          <select
            aria-label="Site"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="max-w-36 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary-deep"
          >
            <option value="all">All Sites</option>
            {net?.facilities.map((f) => (
              <option key={f.id} value={f.id}>{f.id === net.me?.id ? `${f.name} (mine)` : f.name}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
