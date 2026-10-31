import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, LogOut } from "lucide-react";
import { Card } from "@/components/medicare";
import { signOut } from "@/lib/role-guard";
import { useFacilityCtx } from "./facility";

export const Route = createFileRoute("/facility/more")({ component: More });

function More() {
  const { net } = useFacilityCtx();
  const qc = useQueryClient();
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">More</h1>
      {net?.me && (
        <Card className="space-y-1 text-sm">
          <p className="text-lg font-semibold">{net.me.name}</p>
          <p className="text-muted-foreground">{net.me.kind} · {net.me.district}</p>
        </Card>
      )}
      <Link to="/facility/reports" className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-semibold">
        <BarChart3 className="h-4 w-4 text-primary" /> Reports & history
      </Link>
      <button onClick={async () => { await signOut(qc); navigate({ to: "/", replace: true }); }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-semibold text-destructive">
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}
