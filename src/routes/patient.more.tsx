import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Card, fmtDate } from "@/components/medicare";
import { signOut } from "@/lib/role-guard";
import { usePatient } from "./patient.index";

export const Route = createFileRoute("/patient/more")({ component: More });

function More() {
  const { data: p } = usePatient();
  const qc = useQueryClient();
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">More</h1>
      <Link to="/patient/mobile" className="block rounded-lg border border-border bg-card p-4 font-semibold text-primary">Mobile Medicine Near Me</Link>
      {p && (
        <Card className="space-y-1 text-sm">
          <p className="text-lg font-semibold">{p.full_name}</p>
          <p className="text-muted-foreground">Patient No: {p.patient_number}</p>
          <p className="text-muted-foreground">Date of birth: {fmtDate(p.date_of_birth)}</p>
          <p className="text-muted-foreground">Home facility: {p.facilities?.name}</p>
        </Card>
      )}
      <button
        onClick={async () => { await signOut(qc); navigate({ to: "/", replace: true }); }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-semibold text-destructive">
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}
