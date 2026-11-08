import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import { Bell, Boxes, LayoutDashboard, MoreHorizontal, Truck } from "lucide-react";
import { BottomNav, Logo, PrototypeBanner, fmtDate } from "@/components/medicare";
import { requireRole } from "@/lib/role-guard";
import { fetchNetwork, type Network } from "@/lib/network";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/facility")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Offline mode exposes only a previously saved device workspace, never server privileges.
    if (location.pathname === '/facility/offline' && (!navigator.onLine || localStorage.getItem('medicare-manual-offline') === 'true')) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user.id && localStorage.getItem('medicare-facility-session') === data.session.user.id) return;
      throw redirect({ to: '/facility-login' });
    }
    return requireRole("facility");
  },
  head: () => ({ meta: [{ title: "Facility Dashboard — MediCare Sync" }, { name: "robots", content: "noindex" }] }),
  component: FacilityLayout,
});

type Ctx = { net: Network | undefined; scope: string; setScope: (s: string) => void };
const FacilityCtx = createContext<Ctx>({ net: undefined, scope: "all", setScope: () => {} });
export const useFacilityCtx = () => useContext(FacilityCtx);
export const useNetwork = (enabled = true) => useQuery({ queryKey: ["network"], queryFn: fetchNetwork, enabled });

export const ENGINE_INTERVAL_MS = 30_000;

function FacilityLayout() {
  const [connected, setConnected] = useState(true);
  useEffect(() => {
    const update = () => setConnected(navigator.onLine && localStorage.getItem('medicare-manual-offline') !== 'true');
    update();
    window.addEventListener('online', update); window.addEventListener('offline', update); window.addEventListener('medicare-offline-change', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); window.removeEventListener('medicare-offline-change', update); };
  }, []);
  const { data: net, error: netError, isLoading, refetch } = useNetwork(connected);
  const qc = useQueryClient();
  const [scope, setScope] = useState<string>("");
  const [cached, setCached] = useState<Network>();
  useEffect(() => {
    const hydrate = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user.id;
      if (!user) return;
      const key = `medicare-network:${user}`;
      if (net?.me && net.me.user_id === user) {
        // Cache stock only: never persist patient requests, notifications or audit records.
        const safe = { ...net, requests: [], notifications: [], history: [], log: [], adjustments: [], readings: [] };
        localStorage.setItem(key, JSON.stringify(safe));
      }
      else {
        const value = localStorage.getItem(key);
        if (value) { try { const parsed = JSON.parse(value); if (parsed.me?.user_id === user) setCached({ ...parsed, requests: [], notifications: [], history: [], log: [], adjustments: [], readings: [], today: new Date(parsed.today) }); } catch { localStorage.removeItem(key); } }
      }
    };
    void hydrate();
  }, [net]);
  const workspace = net?.me ? net : cached;
  useEffect(() => {
    if (!scope && net?.me) setScope(net.me.id);
  }, [net, scope]);

  // Automation engine: runs on load and every 30 seconds.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (!navigator.onLine || localStorage.getItem('medicare-manual-offline') === 'true') return;
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
    <FacilityCtx.Provider value={{ net: workspace, scope: scope || "all", setScope }}>
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
          {workspace ? <Outlet /> : netError ? (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
              <p className="font-semibold text-destructive">Stock data could not be loaded.</p>
              <p className="text-muted-foreground">{(netError as Error).message}</p>
              <button onClick={() => void refetch()} className="rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground">Try again</button>
            </div>
          ) : !isLoading && net && !net.me ? (
            <p className="text-sm text-muted-foreground">You are signed in, but this account is not linked to a facility. Sign out and sign in again with a demo facility.</p>
          ) : (
            <p className="text-muted-foreground">Loading… Connect once and sign in to save this device workspace.</p>
          )}
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
