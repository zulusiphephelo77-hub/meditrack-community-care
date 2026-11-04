import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CalendarDays, ChevronRight, Pill } from "lucide-react";
import { Card, IconTile, Logo, StatusBadge, fmtDate, fmtTime } from "@/components/medicare";
import { fetchAppointments, fetchMyPatient, fetchPatientMedicines } from "@/lib/queries";

export const Route = createFileRoute("/patient/")({ component: Dashboard });

export function usePatient() {
  return useQuery({ queryKey: ["me-patient"], queryFn: fetchMyPatient });
}
export function useMyMedicines(homeId?: string) {
  return useQuery({ queryKey: ["my-meds", homeId], queryFn: () => fetchPatientMedicines(homeId!), enabled: !!homeId });
}

function Dashboard() {
  const { data: patient } = usePatient();
  const { data: meds } = useMyMedicines(patient?.home_facility_id);
  const { data: appts } = useQuery({ queryKey: ["appts"], queryFn: fetchAppointments });
  const next = appts?.find((a) => new Date(a.scheduled_at) > new Date());
  const unavailable = meds?.find((m) => m.stock.status === "out");
  const primaryMed = meds?.[0];

  if (!patient) return <p className="text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-4">
      <Logo />
      <Link to="/patient/mobile" className="flex items-center justify-between rounded-lg bg-primary-soft p-4 font-semibold text-primary-deep">Mobile Medicine Near Me <ChevronRight className="h-5 w-5" /></Link>
      <div>
        <h1 className="text-2xl font-bold">Hello, {patient.full_name.split(" ")[0]}!</h1>
        <p className="text-sm text-muted-foreground">Patient No: {patient.patient_number}</p>
      </div>

      <Card className="flex items-center gap-4">
        <IconTile icon={CalendarDays} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">Next Hospital Visit</p>
          {next ? (
            <>
              <p className="text-lg font-bold">{fmtDate(next.scheduled_at)}</p>
              <p className="truncate text-sm text-muted-foreground">{next.title} · {fmtTime(next.scheduled_at)} · {next.facilities?.name}</p>
            </>
          ) : (
            <p className="text-sm">No upcoming visits</p>
          )}
        </div>
      </Card>

      {primaryMed && (
        <Link to="/patient/medicines/$medicineId" params={{ medicineId: primaryMed.medicine.id }}>
          <Card className="flex items-center gap-4">
            <IconTile icon={Pill} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Medicine Status</p>
              <p className="truncate font-semibold">{primaryMed.medicine.name}</p>
              <p className={primaryMed.stock.status === "out" ? "text-sm font-semibold text-destructive" : "text-sm font-semibold text-success"}>
                {primaryMed.stock.status === "out" ? "Not available" : "Available"}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Card>
        </Link>
      )}

      {unavailable && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive-soft p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">Medicine not available</p>
              <p className="mt-1 text-sm text-foreground/80">
                {unavailable.medicine.name} for {unavailable.medicine.condition.toLowerCase()} is not available at {patient.facilities?.name}.
              </p>
            </div>
          </div>
          <Link to="/patient/transfer" search={{ medicineId: unavailable.medicine.id }}
            className="mt-3 flex w-full items-center justify-center rounded-xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground">
            View options
          </Link>
        </div>
      )}

      {meds && meds.length > 1 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">All my medicines</h2>
          <div className="space-y-2">
            {meds.map((m) => (
              <Link key={m.id} to="/patient/medicines/$medicineId" params={{ medicineId: m.medicine.id }}>
                <Card className="mb-2 flex items-center justify-between py-3">
                  <span className="text-sm font-medium">{m.medicine.name}</span>
                  <StatusBadge status={m.stock.status} />
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
