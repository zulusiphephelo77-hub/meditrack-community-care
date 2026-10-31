import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";
import { Card, fmtDate, fmtTime } from "@/components/medicare";
import { FacilityHeader, useFacilityCtx } from "./facility";

export const Route = createFileRoute("/facility/reports")({ component: Reports });

function Reports() {
  const { net, scope } = useFacilityCtx();
  if (!net) return null;
  const name = (id: string | null) => net.facilities.find((f) => f.id === id)?.name ?? "—";
  const transferById = new Map(net.transfers.map((t) => [t.id, t]));
  const rows = net.history.filter((h) => {
    if (scope === "all") return true;
    const t = h.stock_transfer_id ? transferById.get(h.stock_transfer_id) : null;
    return h.actor_facility_id === scope || t?.from_facility_id === scope || t?.to_facility_id === scope;
  });
  return (
    <div className="space-y-4">
      <FacilityHeader title="Reports" />
      <h2 className="flex items-center gap-2 font-semibold"><History className="h-4 w-4 text-primary" />Transfer history log</h2>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
      <div className="space-y-2">
        {rows.map((h) => {
          const t = h.stock_transfer_id ? transferById.get(h.stock_transfer_id) : null;
          const med = t ? net.medicines.find((m) => m.id === t.medicine_id)?.name : null;
          return (
            <Card key={h.id} className="py-3">
              <p className="text-sm font-semibold capitalize">{h.action}{med ? ` · ${med}` : ""}</p>
              <p className="text-xs text-muted-foreground">
                {t ? `${name(t.from_facility_id)} → ${name(t.to_facility_id)} · ` : ""}{h.details ? `${h.details} · ` : ""}by {name(h.actor_facility_id)}
              </p>
              <p className="text-xs text-muted-foreground">{fmtDate(h.created_at)} {fmtTime(h.created_at)}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
