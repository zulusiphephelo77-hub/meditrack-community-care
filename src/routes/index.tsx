import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, ChevronRight, ShieldCheck, Truck, Users, UserRound } from "lucide-react";
import { Logo, PrototypeBanner } from "@/components/medicare";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediCare Sync — Right Care. Right Place. Right Time." },
      { name: "description", content: "Connected care for rural KwaZulu-Natal: patients see appointments and medicine availability, facilities manage stock and orders." },
      { property: "og:title", content: "MediCare Sync" },
      { property: "og:description", content: "Right Care. Right Place. Right Time. Connected care for stronger rural communities." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-hero">
      <PrototypeBanner />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 pt-10 pb-8">
        <Logo tagline className="mb-8 scale-110 origin-left" />
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          Your care, connected — from clinic to hospital.
        </h1>
        <p className="mt-3 text-muted-foreground">Choose how you'd like to sign in.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            to="/patient-login"
            className="group relative overflow-hidden rounded-3xl bg-gradient-patient p-6 text-primary-foreground shadow-card transition-transform active:scale-[0.98]"
          >
            <UserRound className="h-12 w-12" />
            <h2 className="mt-6 text-2xl font-bold">Patients</h2>
            <p className="mt-1 text-sm opacity-90">Access your care, appointments and medicine</p>
            <ChevronRight className="absolute right-5 bottom-6 h-6 w-6 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/facility-login"
            className="group relative overflow-hidden rounded-3xl bg-gradient-facility p-6 text-primary-foreground shadow-card transition-transform active:scale-[0.98]"
          >
            <Building2 className="h-12 w-12" />
            <h2 className="mt-6 text-2xl font-bold">Healthcare Facilities</h2>
            <p className="mt-1 text-sm opacity-90">Manage stock, orders and patients</p>
            <ChevronRight className="absolute right-5 bottom-6 h-6 w-6 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
          <div className="flex flex-col items-center gap-1"><ShieldCheck className="h-5 w-5 text-patient" />Better access</div>
          <div className="flex flex-col items-center gap-1"><Users className="h-5 w-5 text-patient" />Healthier patients</div>
          <div className="flex flex-col items-center gap-1"><Truck className="h-5 w-5 text-facility" />Stronger supply chains</div>
        </div>
      </main>
      <footer className="border-t border-border bg-card/70 px-5 py-5 text-center text-sm font-medium text-muted-foreground">
        Connected care for stronger rural communities
      </footer>
    </div>
  );
}
