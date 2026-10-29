import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CalendarDays, Home, MoreHorizontal, Pill } from "lucide-react";
import { BottomNav, PrototypeBanner } from "@/components/medicare";
import { requireRole } from "@/lib/role-guard";

export const Route = createFileRoute("/patient")({
  ssr: false,
  beforeLoad: () => requireRole("patient"),
  head: () => ({ meta: [{ title: "My Care — MediCare Sync" }, { name: "robots", content: "noindex" }] }),
  component: PatientLayout,
});

function PatientLayout() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <PrototypeBanner />
      <BottomNav
        items={[
          { to: "/patient", label: "Home", icon: Home, exact: true },
          { to: "/patient/appointments", label: "Appointments", icon: CalendarDays },
          { to: "/patient/medicines", label: "Medicines", icon: Pill },
          { to: "/patient/more", label: "More", icon: MoreHorizontal },
        ]}
      />
      <main className="mx-auto max-w-3xl px-5 py-5">
        <Outlet />
      </main>
    </div>
  );
}
