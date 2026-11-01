import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Card, IconTile, fmtDate, fmtTime } from "@/components/medicare";
import { fetchAppointments } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/patient/appointments")({ component: Appointments });

function Appointments() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const { data: appts = [] } = useQuery({ queryKey: ["appts"], queryFn: fetchAppointments });
  const now = new Date();
  const list = tab === "upcoming"
    ? appts.filter((a) => new Date(a.scheduled_at) >= now)
    : appts.filter((a) => new Date(a.scheduled_at) < now).reverse();


  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Appointments</h1>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {(["upcoming", "past"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("rounded-full py-2 text-sm font-semibold capitalize transition-colors", tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
            {t}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No {tab} appointments.</p>}
        {list.map((a) => (
          <Card key={a.id} className="flex items-center gap-4">
            <IconTile icon={CalendarDays} />
            <div className="min-w-0">
              <p className="font-semibold">{fmtDate(a.scheduled_at)}</p>
              <p className="text-sm">{a.title}</p>
              <p className="truncate text-xs text-muted-foreground">{fmtTime(a.scheduled_at)} · {a.facilities?.name}</p>
            </div>
          </Card>
        ))}
      </div>
      <Link to="/patient/transfer" search={{ medicineId: undefined }} className="block w-full rounded-xl bg-primary py-3.5 text-center font-semibold text-primary-foreground">
        Request Transfer
      </Link>
    </div>
  );
}
