import { pageHead } from '@/lib/page-head';
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, HeartPulse, Building2, Users, Truck, ShieldCheck } from "lucide-react";
import { Card, Logo, PrototypeBanner, StatusBadge } from "@/components/medicare";
import { statusLabel, type StockStatus } from "@/lib/stock";

export const Route = createFileRoute("/report")({
  head: () =>
    pageHead(
      "Project Report",
      "Design challenge and project report for MediCare Sync: keeping essential medicines available at clinics.",
    ),
  component: Report,
});

function Report() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-hero">
      <PrototypeBanner />
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileText className="h-4 w-4 text-primary" />
            Project Report
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-5 py-8">
        <Logo tagline />

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Design Challenge</p>
          <h1 className="mt-2 text-xl font-bold leading-snug sm:text-2xl">
            How might the healthcare supply chain ensure that essential medicines are always available at clinics while
            reducing waste, delivery delays, and inventory inaccuracies?
          </h1>
        </Card>

        <Card>
          <h2 className="font-semibold">Project Report</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A full report is being prepared. It will cover the problem background, research, prototype walkthrough and
            outcomes for patients and healthcare facilities.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Placeholder — content coming soon.</p>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="text-center"><HeartPulse className="mx-auto h-5 w-5 text-patient" /><p className="mt-1 text-xs text-muted-foreground">Patient access</p></Card>
          <Card className="text-center"><Building2 className="mx-auto h-5 w-5 text-facility" /><p className="mt-1 text-xs text-muted-foreground">Facility stock</p></Card>
          <Card className="text-center"><Truck className="mx-auto h-5 w-5 text-facility" /><p className="mt-1 text-xs text-muted-foreground">Transfers &amp; orders</p></Card>
          <Card className="text-center"><Users className="mx-auto h-5 w-5 text-patient" /><p className="mt-1 text-xs text-muted-foreground">Mobile clinics</p></Card>
        </div>

        <Card className="bg-primary-soft/50">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-patient" />
            <div>
              <p className="text-sm font-semibold">Prototype scope</p>
              <p className="mt-1 text-xs text-muted-foreground">
                This is a design prototype with fictional KwaZulu-Natal demo data. Stock statuses shown in this demo:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["in_stock", "low", "out"] as StockStatus[]).map((s) => (
                  <StatusBadge key={s} status={s} />
                ))}
              </div>
              <p className="sr-only">{statusLabel.in_stock} demonstrated</p>
            </div>
          </div>
        </Card>
      </main>
      <footer className="border-t border-border bg-card/70 px-5 py-5 text-center text-sm font-medium text-muted-foreground">
        Connected care for stronger rural communities
      </footer>
    </div>
  );
}
