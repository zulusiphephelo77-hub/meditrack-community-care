import { Link } from "@tanstack/react-router";
import { HeartPulse, Info, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { statusLabel, type StockStatus } from "@/lib/stock";

export function Logo({ className, tagline = false }: { className?: string; tagline?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-patient text-primary-foreground">
        <HeartPulse className="h-5 w-5" />
      </span>
      <div className="min-w-0 leading-tight">
        <div className="font-display text-lg font-bold tracking-tight">
          <span className="text-patient">MediCare</span> <span className="text-facility">Sync</span>
        </div>
        {tagline && <div className="text-xs text-muted-foreground">Right Care. Right Place. Right Time.</div>}
      </div>
    </div>
  );
}

export function PrototypeBanner() {
  return (
    <div className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-center text-xs font-medium text-warning-foreground">
      <Info className="h-3.5 w-3.5 shrink-0" />
      Prototype with fictional data, not real health records
    </div>
  );
}

export type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur md:sticky md:top-0 md:bottom-auto md:border-b md:border-t-0">
      <div className="mx-auto grid max-w-3xl" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            activeOptions={{ exact: it.exact }}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors md:flex-row md:justify-center md:text-sm"
            activeProps={{ className: "text-primary" }}
          >
            <it.icon className="h-5 w-5" />
            {it.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function StatusBadge({ status }: { status: StockStatus }) {
  const cls = {
    in_stock: "bg-success-soft text-success",
    low: "bg-warning-soft text-warning-foreground",
    out: "bg-destructive-soft text-destructive",
  }[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", cls)}>
      {statusLabel[status]}
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-card", className)}>{children}</div>;
}

export function IconTile({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary", className)}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}
export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}
