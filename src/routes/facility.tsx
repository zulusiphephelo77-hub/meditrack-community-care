import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import { Bell, Boxes, LayoutDashboard, MoreHorizontal, Truck } from "lucide-react";
import { BottomNav, Logo, PrototypeBanner } from "@/components/medicare";
import { requireRole } from "@/lib/role-guard";
import { fetchNetwork, type Network } from "@/lib/network";

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

function FacilityLayout() {
  const { data: net } = useNetwork();
  const [scope, setScope] = useState<string>("");
  useEffect(() => {
    if (!scope && net?.me) setScope(net.me.id);
  }, [net, scope]);

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

export function FacilityHeader({ title }: { title: string }) {
  const { net, scope, setScope } = useFacilityCtx();
  const current = net?.facilities.find((f) => f.id === scope);
  return (
    <div className="space-y-3">
      <Logo />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{title}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {current ? `${current.kind} · ${current.name}` : "All sites in the network"}
          </p>
        </div>
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
      </div>
    </div>
  );
}
