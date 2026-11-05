import { pageHead } from '@/lib/page-head';
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, CalendarClock, FastForward, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, fmtDate } from "@/components/medicare";
import { supabase } from "@/integrations/supabase/client";
import { daysUntil } from "@/lib/stock";
import { cn } from "@/lib/utils";
import { FacilityHeader, useFacilityCtx } from "./facility";

export const Route = createFileRoute("/facility/expiry")({ head: () => pageHead('Expiry & Transfers', 'Expiring batches and stock redistribution suggestions.'), component: ExpiryPage });

export function monthsLeft(days: number) {
  return Math.max(0, Math.round((days / 30.4) * 10) / 10);
}

function ExpiryPage() {
  const { net, scope } = useFacilityCtx();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"expiring" | "options">("expiring");
  const [busy, setBusy] = useState(false);
  if (!net) return null;
  const today = net.today;
  const months = net.settings.find((s) => s.facility_id === (scope === "all" ? net.me?.id : scope))?.expiry_months ?? 4;
  const name = (id: string) => net.facilities.find((f) => f.id === id)?.name ?? "—";
  const med = (id: string) => net.medicines.find((m) => m.id === id)?.name ?? "—";

  const expiring = net.batches
    .filter((b) => (scope === "all" || b.facility_id === scope) && b.quantity > 0)
    .map((b) => ({ ...b, days: daysUntil(b.expiry_date, today) }))
    .filter((b) => b.days >= 0 && b.days <= months * 30.4)
    .sort((a, b) => a.days - b.days);

  const suggestions = net.notifications.filter((n) => n.kind === "expiry_suggestion");

  async function simulate() {
    setBusy(true);
    const { data, error } = await supabase.rpc("simulate_next_day");
    setBusy(false);
    if (error) return void toast.error(error.message);
    const r = data as { orders: number; suggestions: number; breaches: number };
    toast.success(`Next day simulated: ${r.orders} auto-orders, ${r.suggestions} transfer suggestions, ${r.breaches} cold-chain alerts`);
    qc.invalidateQueries({ queryKey: ["network"] });
  }

  async function act(id: string, action: "accept" | "dismiss") {
    const { error } = await supabase.rpc("notification_action", { _id: id, _action: action });
    if (error) return void toast.error(error.message);
    toast.success(action === "accept" ? "Transfer created — see Orders" : "Dismissed");
    qc.invalidateQueries({ queryKey: ["network"] });
  }

  return (
    <div className="space-y-4">
      <FacilityHeader title="Expiry & Transfer Management" />
      <button disabled={busy} onClick={simulate}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary bg-primary-soft py-2.5 text-sm font-semibold text-primary-deep disabled:opacity-60">
        <FastForward className="h-4 w-4" /> Simulate next day
      </button>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {([["expiring", "Expiring Soon"], ["options", "Transfer Options"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("rounded-full py-2 text-sm font-semibold", tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{l}</button>
        ))}
      </div>

      {tab === "expiring" ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Batches expiring within {months} months.</p>
          {expiring.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nothing expiring soon.</p>}
          {expiring.map((b) => (
            <Card key={b.id} className="flex items-center gap-3 py-3">
              <CalendarClock className={cn("h-6 w-6 shrink-0", b.days <= 60 ? "text-destructive" : "text-warning-foreground")} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{med(b.medicine_id)}</p>
                <p className={cn("text-xs font-medium", b.days <= 60 ? "text-destructive" : "text-warning-foreground")}>Expires: {fmtDate(b.expiry_date)}</p>
                <p className="truncate text-xs text-muted-foreground">({monthsLeft(b.days)} months) · Batch {b.batch_number} · {b.quantity} packs{scope === "all" ? ` · ${name(b.facility_id)}` : ""}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No transfer suggestions for your site right now.</p>
          )}
          {suggestions.map((n) => {
            const p = n.payload as { to: string; quantity: number } | null;
            const open = n.status === "unread" || n.status === "read";
            return (
              <Card key={n.id} className="space-y-2 border-primary/30 bg-primary-soft">
                <div className="flex gap-3">
                  <HelpCircle className="h-6 w-6 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">Transfer to High-Demand Site</p>
                    <p className="text-sm">{n.body}</p>
                    {p && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">{net.me?.name} <ArrowRight className="h-3 w-3" /> {name(p.to)}</p>}
                  </div>
                </div>
                {open ? (
                  <div className="flex gap-2">
                    <button onClick={() => act(n.id, "accept")} className="flex-1 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground">Accept & create transfer</button>
                    <button onClick={() => act(n.id, "dismiss")} className="rounded-lg bg-card px-3 py-2 text-xs font-semibold">Dismiss</button>
                  </div>
                ) : (
                  <p className="text-xs font-semibold capitalize text-muted-foreground">{n.status}</p>
                )}
              </Card>
            );
          })}
          <p className="text-xs text-muted-foreground">The engine checks every 30 seconds and suggests moving stock you can't use before expiry to the nearest site that will.</p>
        </div>
      )}
    </div>
  );
}
