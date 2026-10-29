import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Boxes, LayoutDashboard } from "lucide-react";
import { BottomNav, PrototypeBanner } from "@/components/medicare";
import { requireRole } from "@/lib/role-guard";

export const Route = createFileRoute("/facility")({
  ssr: false,
  beforeLoad: () => requireRole("facility"),
  head: () => ({ meta: [{ title: "Facility Dashboard — MediCare Sync" }, { name: "robots", content: "noindex" }] }),
  component: FacilityLayout,
});

function FacilityLayout() {
  return (
    <div className="theme-facility min-h-screen bg-background pb-20 md:pb-0">
      <PrototypeBanner />
      <BottomNav
        items={[
          { to: "/facility", label: "Dashboard", icon: LayoutDashboard, exact: true },
          { to: "/facility/stock", label: "Stock", icon: Boxes },
        ]}
      />
      <main className="mx-auto max-w-3xl px-5 py-5">
        <Outlet />
      </main>
    </div>
  );
}
