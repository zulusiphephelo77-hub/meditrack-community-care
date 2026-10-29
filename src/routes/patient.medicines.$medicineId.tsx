import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertCircle, ChevronLeft, MapPin, Pill, Send } from "lucide-react";
import { toast } from "sonner";
import { Card, IconTile, StatusBadge, fmtDate } from "@/components/medicare";
import { fetchMedicineAcrossFacilities } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { usePatient } from "./patient.index";

export const Route = createFileRoute("/patient/medicines/$medicineId")({ component: MedicineDetails });

function MedicineDetails() {
  const { medicineId } = Route.useParams();
  const { data: patient } = usePatient();
  const home = patient?.facilities;
  const { data } = useQuery({
    queryKey: ["med-detail", medicineId, home?.id],
    queryFn: () => fetchMedicineAcrossFacilities(medicineId, home!),
    enabled: !!home,
  });
  const [showAlt, setShowAlt] = useState(false);
  const [sent, setSent] = useState(false);

  async function requestTransfer() {
    if (!patient || !data) return;
    const { error } = await supabase.from("transfer_requests").insert({
      patient_id: patient.id,
      medicine_id: medicineId,
      to_facility_id: data.nearestHospital?.facility.id ?? null,
    });
    if (error) return toast.error("Could not send the request");
    setSent(true);
    toast.success(`Request sent to ${data.nearestHospital?.facility.name ?? "the nearest hospital"}`);
  }

  if (!data?.medicine) return <p className="text-muted-foreground">Loading…</p>;
  const { medicine, home: h, alternatives, nearestHospital } = data;
  return (
    <div className="space-y-4">
      <Link to="/patient/medicines" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
        <ChevronLeft className="h-4 w-4" /> Medicine Details
      </Link>
      <Card className="flex items-center gap-4">
        <IconTile icon={Pill} className="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">{medicine.name}</h1>
          <p className="text-sm text-muted-foreground">({medicine.condition})</p>
          <div className="mt-1"><StatusBadge status={h.stock.status} /></div>
        </div>
      </Card>

      <Card>
        <p className="text-xs text-muted-foreground">Current stock at {h.facility.name}</p>
        <p className="text-2xl font-bold">{h.stock.quantity} <span className="text-base font-medium text-muted-foreground">{medicine.unit}</span></p>
      </Card>

      {h.stock.expiringSoon && h.stock.soonestExpiry && (
        <div className="flex gap-3 rounded-2xl bg-warning-soft p-4 text-warning-foreground">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div><p className="font-semibold">Expiring soon</p><p className="text-sm">Expires: {fmtDate(h.stock.soonestExpiry)}</p></div>
        </div>
      )}

      <button onClick={requestTransfer} disabled={sent}
        className="flex w-full items-center gap-3 rounded-2xl bg-primary-soft p-4 text-left disabled:opacity-70">
        <Send className="h-5 w-5 shrink-0 text-primary" />
        <span>
          <span className="block font-semibold text-primary-deep">{sent ? "Transfer requested" : "Request Transfer"}</span>
          <span className="text-xs text-muted-foreground">Sent to nearest hospital{nearestHospital ? `: ${nearestHospital.facility.name}` : ""}</span>
        </span>
      </button>

      <button onClick={() => setShowAlt(!showAlt)} className="flex w-full items-center gap-3 rounded-2xl bg-primary-soft p-4 text-left">
        <MapPin className="h-5 w-5 shrink-0 text-primary" />
        <span>
          <span className="block font-semibold text-primary-deep">View alternative hospitals</span>
          <span className="text-xs text-muted-foreground">With stock nearby</span>
        </span>
      </button>

      {showAlt && (
        <div className="space-y-2">
          {alternatives.length === 0 && <p className="text-sm text-muted-foreground">No nearby facility has stock right now.</p>}
          {alternatives.map((a) => (
            <Card key={a.facility.id} className="flex items-center justify-between py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{a.facility.name}</p>
                <p className="text-xs text-muted-foreground">{Math.round(a.distance)} km away · {a.stock.quantity} {medicine.unit}</p>
              </div>
              <StatusBadge status={a.stock.status} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
