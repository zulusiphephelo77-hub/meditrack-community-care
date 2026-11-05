import { pageHead } from '@/lib/page-head';
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Pill } from "lucide-react";
import { Card, IconTile, StatusBadge } from "@/components/medicare";
import { useMyMedicines, usePatient } from "./patient.index";

export const Route = createFileRoute("/patient/medicines/")({ head: () => pageHead('My Medicines', 'Your prescribed medicines and local availability.'), component: Medicines });

function Medicines() {
  const { data: patient } = usePatient();
  const { data: meds = [] } = useMyMedicines(patient?.home_facility_id);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Medicines</h1>
      <p className="text-sm text-muted-foreground">Availability at {patient?.facilities?.name}</p>
      {meds.map((m) => (
        <Link key={m.id} to="/patient/medicines/$medicineId" params={{ medicineId: m.medicine.id }} className="block">
          <Card className="flex items-center gap-4">
            <IconTile icon={Pill} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{m.medicine.name}</p>
              <p className="text-xs text-muted-foreground">{m.medicine.condition} · {m.dosage}</p>
            </div>
            <StatusBadge status={m.stock.status} />
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Card>
        </Link>
      ))}
    </div>
  );
}
