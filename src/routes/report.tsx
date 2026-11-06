import { pageHead } from '@/lib/page-head';
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, ClipboardCheck, FileText, HeartPulse, PackageCheck, ShieldCheck, Truck, Users, Warehouse } from "lucide-react";
import { Logo, PrototypeBanner, StatusBadge } from "@/components/medicare";
import { statusLabel, type StockStatus } from "@/lib/stock";

export const Route = createFileRoute("/report")({
  head: () =>
    pageHead(
      "Project Report",
      "Explore MediCare Sync’s design challenge, patient and facility workflows, prototype scope and future evaluation priorities.",
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">
        <Logo tagline />

        <section className="mt-8 border-y border-border py-6" aria-labelledby="design-challenge">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Design Challenge</p>
          <h1 id="design-challenge" className="mt-2 text-xl font-bold leading-snug sm:text-2xl">
            How might the healthcare supply chain ensure that essential medicines are always available at clinics while
            reducing waste, delivery delays, and inventory inaccuracies?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            MediCare Sync is a prototype exploring how patients, clinics, mobile teams and a central warehouse can
            coordinate medicine availability and movement through one connected service.
          </p>
        </section>

        <section className="border-b border-border py-7" aria-labelledby="approach">
          <h2 id="approach" className="text-lg font-bold">A coordinated approach</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-patient">
                <HeartPulse className="h-5 w-5" />
                <h3 className="font-semibold text-foreground">For patients</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Check medicine availability and upcoming visits, request a transfer when medicine is unavailable, or
                request collection through a scheduled mobile clinic stop.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-facility">
                <Building2 className="h-5 w-5" />
                <h3 className="font-semibold text-foreground">For clinics and hospitals</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Review stock levels, pending orders and expiry alerts; coordinate transfers with nearby facilities and
                follow requests through their status changes.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-facility">
                <Warehouse className="h-5 w-5" />
                <h3 className="font-semibold text-foreground">For the warehouse</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Review clinic orders, prepare stock using earliest-expiry-first picking, and track catalogue quantities,
                reservations and storage conditions.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Truck className="h-5 w-5" />
                <h3 className="font-semibold text-foreground">For mobile teams</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Group medicine requests by stop, compare needs with van stock and manage a simulated route and visit
                schedule.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-border py-7" aria-labelledby="supply-tools">
          <h2 id="supply-tools" className="text-lg font-bold">Tools for supply coordination</h2>
          <ul className="mt-4 space-y-4">
            <li className="flex items-start gap-3">
              <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">Replenishment and visibility</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Facility stock views highlight low and expiring items. Configurable reorder rules can create warehouse
                  orders and notifications when stock reaches its trigger.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-facility" />
              <div>
                <h3 className="text-sm font-semibold">Transfers and expiry actions</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Transfer requests are reviewed by facilities and tracked through dispatch and receipt. Expiry
                  suggestions help identify stock that could be moved to a site with greater need.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-patient" />
              <div>
                <h3 className="text-sm font-semibold">Device-based continuity</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Facility stock actions can be queued on the device while offline and synced when connectivity
                  returns, with a pending count and conflict checks.
                </p>
              </div>
            </li>
          </ul>
        </section>

        <section className="border-b border-border py-7" aria-labelledby="evaluation">
          <h2 id="evaluation" className="text-lg font-bold">What a future evaluation should test</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The prototype does not establish real-world impact. With appropriate approvals and real operational data, a
            future pilot could assess:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground marker:text-primary">
            <li>Whether patients can find an available source or understand the next step when stock is unavailable.</li>
            <li>How closely recorded stock matches physical counts.</li>
            <li>Whether transfers and expiry suggestions reduce avoidable delays or medicine wastage.</li>
            <li>How long orders take from request through receipt, and where delays occur.</li>
          </ul>
        </section>

        <section className="py-7" aria-labelledby="scope">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-patient" />
            <div>
              <h2 id="scope" className="font-semibold">Prototype scope and safeguards</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                MediCare Sync is a demonstration using fictional KwaZulu-Natal facilities and sample records. It is not
                connected to real health records, live GPS tracking or SMS delivery. Mobile-clinic routes, location and
                messages are simulated; medicine collection is shown as requiring ID verification by authorised staff.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["in_stock", "low", "out"] as StockStatus[]).map((s) => (
                  <StatusBadge key={s} status={s} />
                ))}
              </div>
              <p className="sr-only">{statusLabel.in_stock} demonstrated</p>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-2 border-t border-border pt-5 text-sm text-muted-foreground">
          <Users className="h-4 w-4 text-primary" />
          <span>Connected care for stronger rural communities</span>
        </div>
      </main>
      <footer className="border-t border-border bg-card/70 px-5 py-5 text-center text-sm font-medium text-muted-foreground">
        Connected care for stronger rural communities
      </footer>
    </div>
  );
}
