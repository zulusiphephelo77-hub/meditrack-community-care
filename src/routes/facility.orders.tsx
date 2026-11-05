import { pageHead } from '@/lib/page-head';
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Truck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Card, fmtDate } from "@/components/medicare";
import { supabase } from "@/integrations/supabase/client";
import { inScope, OPEN_REQUEST } from "@/lib/network";
import { cn } from "@/lib/utils";
import { FacilityHeader, useFacilityCtx } from "./facility";

export const Route = createFileRoute("/facility/orders")({ head: () => pageHead('Orders & Deliveries', 'Stock transfers and patient collection requests.'), component: Orders });

type Draft = { from: string; to: string; medicine: string; batch: string; quantity: number; urgency: string };

const STATUS_CLS: Record<string, string> = {
  pending: "bg-warning-soft text-warning-foreground",
  approved: "bg-primary-soft text-primary-deep",
  dispatched: "bg-primary-soft text-primary-deep",
  packed: "bg-primary-soft text-primary-deep",
  received: "bg-success-soft text-success",
  rejected: "bg-destructive-soft text-destructive",
  sent: "bg-warning-soft text-warning-foreground",
  accepted: "bg-primary-soft text-primary-deep",
  ready: "bg-primary-soft text-primary-deep",
  completed: "bg-success-soft text-success",
};
export function StatusPill({ status }: { status: string }) {
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", STATUS_CLS[status] ?? "bg-muted")}>{status}</span>;
}

function Orders() {
  const { net, scope } = useFacilityCtx();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  if (!net) return null;
  const me = net.me?.id;
  const name = (id: string | null) => net.facilities.find((f) => f.id === id)?.name ?? "—";
  const medName = (id: string | null) => net.medicines.find((m) => m.id === id)?.name ?? "General transfer";
  const involved = (id: string | null) => scope === "all" || id === scope;

  const shortages = inScope(net.shortages, scope);
  const transfers = net.transfers.filter((t) => involved(t.from_facility_id) || involved(t.to_facility_id));
  const requests = net.requests.filter((r) => involved(r.to_facility_id));

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success(ok);
    qc.invalidateQueries({ queryKey: ["network"] });
  }

  async function submitDraft() {
    if (!draft) return;
    await run(() => supabase.rpc("create_stock_transfer", {
      _from: draft.from, _to: draft.to, _medicine: draft.medicine, _batch: draft.batch, _qty: draft.quantity, _urgency: draft.urgency,
    }), "Transfer request created");
    setDraft(null);
  }

  const draftBatches = draft ? net.batches.filter((b) => b.facility_id === draft.from && b.medicine_id === draft.medicine && b.quantity > 0) : [];

  return (
    <div className="space-y-5">
      <FacilityHeader title="Orders & Deliveries" />

      <section>
        <h2 className="mb-2 font-semibold">Where is stock short?</h2>
        {shortages.length === 0 && <p className="text-sm text-muted-foreground">No shortages for this site.</p>}
        <div className="space-y-3">
          {shortages.map((s) => (
            <Card key={s.facility.id + s.medicine.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{s.medicine.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.facility.name} · {s.stock.quantity} / {s.stock.capacity}</p>
                </div>
                <StatusPill status={s.stock.status === "out" ? "out of stock" : "low"} />
              </div>
              {s.suppliers.length === 0 && <p className="mt-2 text-xs text-muted-foreground">No nearby surplus.</p>}
              <div className="mt-2 space-y-2">
                {s.suppliers.map((o) => (
                  <div key={o.facility.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted p-2.5">
                    <div className="min-w-0 text-xs">
                      <p className="truncate font-semibold">{o.facility.name}</p>
                      <p className="text-muted-foreground">{Math.round(o.distance)} km · {o.spare} spare</p>
                    </div>
                    <button
                      onClick={() => {
                        const batch = net.batches.filter((b) => b.facility_id === o.facility.id && b.medicine_id === s.medicine.id && b.quantity > 0).sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))[0];
                        setDraft({ from: o.facility.id, to: s.facility.id, medicine: s.medicine.id, batch: batch?.id ?? "", quantity: Math.min(o.spare, Math.max(1, s.stock.capacity - s.stock.quantity)), urgency: s.stock.status === "out" ? "urgent" : "normal" });
                      }}
                      className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                      Transfer stock
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {draft && (
        <Card className="space-y-3 border-primary">
          <h2 className="font-semibold">New transfer</h2>
          <Field label="From">
            <select className={sel} value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value, batch: "" })}>
              {net.facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
          <Field label="To">
            <select className={sel} value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })}>
              {net.facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
          <Field label="Medicine">
            <select className={sel} value={draft.medicine} onChange={(e) => setDraft({ ...draft, medicine: e.target.value, batch: "" })}>
              {net.medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Batch">
            <select className={sel} value={draft.batch} onChange={(e) => setDraft({ ...draft, batch: e.target.value })}>
              <option value="">Choose batch…</option>
              {draftBatches.map((b) => <option key={b.id} value={b.id}>{b.batch_number} · {b.quantity} left · exp {fmtDate(b.expiry_date)}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity">
              <input type="number" min={1} className={sel} value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} />
            </Field>
            <Field label="Urgency">
              <select className={sel} value={draft.urgency} onChange={(e) => setDraft({ ...draft, urgency: e.target.value })}>
                <option value="normal">Normal</option><option value="urgent">Urgent</option><option value="critical">Critical</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setDraft(null)} className="rounded-xl border border-border py-2.5 text-sm font-semibold">Cancel</button>
            <button disabled={busy || !draft.batch} onClick={submitDraft} className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Create request</button>
          </div>
        </Card>
      )}

      <section>
        <h2 className="mb-2 font-semibold">Stock transfers</h2>
        {transfers.length === 0 && <p className="text-sm text-muted-foreground">No transfers yet.</p>}
        <div className="space-y-3">
          {transfers.map((t) => {
            const isFrom = me === t.from_facility_id, isTo = me === t.to_facility_id;
            return (
              <Card key={t.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{medName(t.medicine_id)} · {t.quantity}</p>
                  <StatusPill status={t.status} />
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" /> {name(t.from_facility_id)} <ArrowRight className="h-3 w-3" /> {name(t.to_facility_id)}
                </p>
                <p className="text-xs text-muted-foreground">{t.source === "auto_order" ? "Auto-order · " : t.source === "expiry_suggestion" ? "Expiry move · " : ""}Urgency: <span className="capitalize">{t.urgency}</span> · {fmtDate(t.created_at)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {t.status === "pending" && isFrom && <Act onClick={() => run(() => supabase.rpc("act_on_stock_transfer", { _id: t.id, _action: "approve" }), "Approved — stock moved")}>Approve</Act>}
                  {t.status === "pending" && (isFrom || isTo) && <Act danger onClick={() => run(() => supabase.rpc("act_on_stock_transfer", { _id: t.id, _action: "reject" }), "Rejected")}>Reject</Act>}
                  {t.status === "approved" && isFrom && <Act onClick={() => run(() => supabase.rpc("act_on_stock_transfer", { _id: t.id, _action: "pack" }), "Marked packed")}>Pack</Act>}
                  {(t.status === "approved" || t.status === "packed") && isFrom && <Act onClick={() => run(() => supabase.rpc("act_on_stock_transfer", { _id: t.id, _action: "dispatch" }), "Marked dispatched")}>Mark dispatched</Act>}
                  {t.status === "dispatched" && isTo && <Act onClick={() => run(() => supabase.rpc("act_on_stock_transfer", { _id: t.id, _action: "receive" }), "Marked received")}>Mark received</Act>}
                  {!isFrom && !isTo && ["pending", "approved", "packed", "dispatched"].includes(t.status) && (
                    <p className="text-xs text-muted-foreground">Waiting on {t.status === "dispatched" ? name(t.to_facility_id) : name(t.from_facility_id)}</p>
                  )}
                  {(isFrom || isTo) && t.status === "pending" && !isFrom && <p className="text-xs text-muted-foreground">Awaiting approval from {name(t.from_facility_id)}</p>}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Patient requests</h2>
        {requests.length === 0 && <p className="text-sm text-muted-foreground">No patient requests for this site.</p>}
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-semibold"><UserRound className="h-4 w-4 text-primary" />{r.patients?.full_name ?? "Patient"}</p>
                <StatusPill status={r.status} />
              </div>
              <p className="text-xs text-muted-foreground capitalize">{r.kind} · {medName(r.medicine_id)} · to {name(r.to_facility_id)} · {fmtDate(r.created_at)}</p>
              {me === r.to_facility_id && OPEN_REQUEST.includes(r.status) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.status === "sent" && <Act onClick={() => run(() => supabase.rpc("act_on_patient_request", { _id: r.id, _status: "accepted" }), "Accepted")}>Accept</Act>}
                  {r.status === "accepted" && <Act onClick={() => run(() => supabase.rpc("act_on_patient_request", { _id: r.id, _status: "ready" }), "Marked ready")}>Ready for collection</Act>}
                  {r.status === "ready" && <Act onClick={() => run(() => supabase.rpc("act_on_patient_request", { _id: r.id, _status: "completed" }), "Completed")}>Collected</Act>}
                  <Act danger onClick={() => run(() => supabase.rpc("act_on_patient_request", { _id: r.id, _status: "rejected" }), "Rejected")}>Reject</Act>
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

const sel = "w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-muted-foreground">{label}<div className="mt-1 text-foreground">{children}</div></label>;
}
function Act({ onClick, children, danger }: { onClick: () => void; children: string; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", danger ? "bg-destructive-soft text-destructive" : "bg-primary text-primary-foreground")}>
      {children}
    </button>
  );
}
