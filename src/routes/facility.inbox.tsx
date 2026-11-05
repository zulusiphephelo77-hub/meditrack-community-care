import { pageHead } from '@/lib/page-head';
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bot, Thermometer, Truck, CalendarClock, Info } from "lucide-react";
import { toast } from "sonner";
import { Card, fmtDate, fmtTime } from "@/components/medicare";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { FacilityHeader, useFacilityCtx } from "./facility";

export const Route = createFileRoute("/facility/inbox")({ head: () => pageHead('Facility Notifications', 'Notifications and automatic stock actions.'), component: Inbox });

const ICON = { expiry_suggestion: CalendarClock, cold_chain: Thermometer, auto_order: Truck, clinic_order: Truck } as Record<string, typeof Info>;

function Inbox() {
  const { net } = useFacilityCtx();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"inbox" | "log">("inbox");
  if (!net) return null;
  const name = (id: string | null) => net.facilities.find((f) => f.id === id)?.name ?? "Network";
  const inbox = net.notifications.filter((n) => n.status !== "dismissed");

  async function act(id: string, action: "accept" | "dismiss" | "read") {
    const { error } = await supabase.rpc("notification_action", { _id: id, _action: action });
    if (error) return void toast.error(error.message);
    if (action !== "read") toast.success(action === "accept" ? "Transfer created — see Orders" : "Dismissed");
    qc.invalidateQueries({ queryKey: ["network"] });
  }

  return (
    <div className="space-y-4">
      <FacilityHeader title="Notifications" noScope />
      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {([["inbox", "Inbox"], ["log", "Automatic actions"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("rounded-full py-2 text-sm font-semibold", tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{l}</button>
        ))}
      </div>
      {tab === "inbox" ? (
        <>
          {inbox.some((n) => n.status === "unread") && (
            <button onClick={async () => { await supabase.rpc("mark_all_read"); qc.invalidateQueries({ queryKey: ["network"] }); }}
              className="text-sm font-semibold text-primary">Mark all as read</button>
          )}
          {inbox.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No notifications.</p>}
          <div className="space-y-2">
            {inbox.map((n) => {
              const Icon = ICON[n.kind] ?? Info;
              const open = n.status === "unread" || n.status === "read";
              return (
                <Card key={n.id} className={cn("space-y-2", n.status === "unread" && "border-primary")}>
                  <button className="flex w-full gap-3 text-left" onClick={() => n.status === "unread" && act(n.id, "read")}>
                    <Icon className={cn("h-5 w-5 shrink-0", n.kind === "cold_chain" ? "text-destructive" : "text-primary")} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{n.title}{n.status === "unread" && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-destructive" />}</p>
                      <p className="text-sm text-foreground/80">{n.body}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(n.created_at)} {fmtTime(n.created_at)}</p>
                    </div>
                  </button>
                  {n.kind === "expiry_suggestion" && open && (
                    <div className="flex gap-2">
                      <button onClick={() => act(n.id, "accept")} className="flex-1 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground">Accept & create transfer</button>
                      <button onClick={() => act(n.id, "dismiss")} className="rounded-lg bg-muted px-3 py-2 text-xs font-semibold">Dismiss</button>
                    </div>
                  )}
                  {n.kind !== "expiry_suggestion" && (
                    <button onClick={() => act(n.id, "dismiss")} className="text-xs font-semibold text-muted-foreground">Dismiss</button>
                  )}
                  {n.status === "accepted" && <p className="text-xs font-semibold text-success">Accepted — transfer created</p>}
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          {net.log.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No automatic actions yet.</p>}
          {net.log.map((l) => (
            <Card key={l.id} className="flex gap-3 py-3">
              <Bot className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{l.action}</p>
                <p className="text-xs text-foreground/80">{l.details}</p>
                <p className="text-xs text-muted-foreground">{name(l.facility_id)} · {fmtDate(l.created_at)} {fmtTime(l.created_at)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
