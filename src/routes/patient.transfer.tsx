import { pageHead } from '@/lib/page-head';
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, FileText, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { Card, StatusBadge, fmtDate } from "@/components/medicare";
import { supabase } from "@/integrations/supabase/client";
import { fetchMedicineAcrossFacilities } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useMyMedicines, usePatient } from "./patient.index";

export const Route = createFileRoute("/patient/transfer")({
  head: () => pageHead('Medicine Transfer', 'Medicine transcripts and hospital transfer requests.'),
  validateSearch: (s: Record<string, unknown>) => ({ medicineId: typeof s["medicineId"] === "string" ? s["medicineId"] : undefined }),
  component: TransferPage,
});

const STATUS_TEXT: Record<string, string> = {
  sent: "Sent — waiting for the hospital",
  accepted: "Accepted by the hospital",
  ready: "Ready for collection",
  completed: "Collected",
  rejected: "Declined — please contact your clinic",
};

function TransferPage() {
  const search = Route.useSearch();
  const qc = useQueryClient();
  const { data: patient } = usePatient();
  const { data: meds = [] } = useMyMedicines(patient?.home_facility_id);
  const medicineId = search.medicineId ?? meds.find((m) => m.stock.status === "out")?.medicine.id ?? meds[0]?.medicine.id;
  const home = patient?.facilities;
  const { data } = useQuery({
    queryKey: ["med-detail", medicineId, home?.id],
    queryFn: () => fetchMedicineAcrossFacilities(medicineId!, home!),
    enabled: !!home && !!medicineId,
  });
  const { data: mine = [] } = useQuery({
    queryKey: ["my-requests"],
    queryFn: async () => (await supabase.from("transfer_requests").select("id, kind, status, created_at, medicines(name), facilities(name)").order("created_at", { ascending: false })).data ?? [],
  });
  const [tab, setTab] = useState<"transfer" | "transcript">("transfer");
  const [choice, setChoice] = useState<"transcript" | "transfer">("transfer");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!patient || !data) return;
    const target = choice === "transfer" ? data.nearestHospital : data.alternatives[0];
    setBusy(true);
    const { error } = await supabase.from("transfer_requests").insert({
      patient_id: patient.id, medicine_id: medicineId ?? null, to_facility_id: target?.facility.id ?? null, kind: choice,
    });
    setBusy(false);
    if (error) return void toast.error("Could not send your request");
    toast.success(choice === "transfer" ? `Transfer requested at ${target?.facility.name ?? "nearest hospital"}` : "Transcript generated");
    qc.invalidateQueries({ queryKey: ["my-requests"] });
    if (choice === "transcript") setTab("transcript");
  }

  return (
    <div className="space-y-4">
      <Link to="/patient" className="inline-flex items-center gap-1 text-sm font-medium text-primary"><ChevronLeft className="h-4 w-4" /> Request Transfer</Link>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {(["transfer", "transcript"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("rounded-full py-2 text-sm font-semibold capitalize", tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{t}</button>
        ))}
      </div>

      {tab === "transfer" ? (
        <>
          <p className="text-sm">Your medicine{data?.medicine ? ` (${data.medicine.name})` : ""} is not available at your current hospital. Choose an option:</p>
          <Option active={choice === "transcript"} onClick={() => setChoice("transcript")} icon={FileText} title="Generate Transcript" sub="Shows nearest hospitals with stock" />
          <Option active={choice === "transfer"} onClick={() => setChoice("transfer")} icon={PackageCheck} title="Request Transfer" sub="We'll move the packet to your nearest hospital" />
          <button disabled={busy || !data} onClick={submit} className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-60">Submit</button>
        </>
      ) : (
        <Card className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Medicine transcript</p>
            <p className="font-bold">{patient?.full_name} · {patient?.patient_number}</p>
            <p className="text-sm">{data?.medicine?.name} — not available at {home?.name}</p>
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase">Nearest hospitals with stock</p>
          {data?.alternatives.length === 0 && <p className="text-sm text-muted-foreground">None nearby right now.</p>}
          {data?.alternatives.map((a) => (
            <div key={a.facility.id} className="flex items-center justify-between rounded-xl bg-muted p-3">
              <div className="min-w-0 text-sm"><p className="truncate font-semibold">{a.facility.name}</p><p className="text-xs text-muted-foreground">{Math.round(a.distance)} km away</p></div>
              <StatusBadge status={a.stock.status} />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Show this at any listed facility. Prototype only — not a real prescription.</p>
        </Card>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">My requests</h2>
        {mine.length === 0 && <p className="text-sm text-muted-foreground">No requests yet.</p>}
        <div className="space-y-2">
          {mine.map((r) => (
            <Card key={r.id} className="py-3">
              <p className="text-sm font-semibold capitalize">{r.kind} · {r.medicines?.name ?? "General"}</p>
              <p className="text-xs text-muted-foreground">{r.facilities?.name ?? "Nearest hospital"} · {fmtDate(r.created_at)}</p>
              <p className={cn("mt-1 text-xs font-semibold", r.status === "rejected" ? "text-destructive" : r.status === "completed" || r.status === "ready" ? "text-success" : "text-primary")}>
                {STATUS_TEXT[r.status] ?? r.status}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function Option({ active, onClick, icon: Icon, title, sub }: { active: boolean; onClick: () => void; icon: typeof FileText; title: string; sub: string }) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left", active ? "border-primary bg-primary-soft" : "border-border bg-card")}>
      <Icon className="h-6 w-6 shrink-0 text-primary" />
      <span><span className="block font-semibold">{title}</span><span className="text-xs text-muted-foreground">({sub})</span></span>
    </button>
  );
}
