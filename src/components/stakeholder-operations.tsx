import { useEffect, useState, type ReactNode } from "react";
import { ClipboardList, Download, Eye, RotateCcw } from "lucide-react";
import { loadDemoWorkspace, resetDemoWorkspace, saveDemoWorkspace, type DemoWorkspace } from "@/lib/stakeholder-demo";

type Props = { role: string; facility: string };
type MetricItem = [string, string, string];

export function StakeholderOperations({ role, facility }: Props) {
  const [workspace, setWorkspace] = useState<DemoWorkspace>(() => loadDemoWorkspace());
  const [bulletin, setBulletin] = useState("");
  useEffect(() => { saveDemoWorkspace(workspace); }, [workspace]);

  const update = (next: (current: DemoWorkspace) => DemoWorkspace) => setWorkspace(next);
  const is = (name: string) => role === name;
  const metrics: MetricItem[] = is("Nurse / Clinic Staff")
    ? [["Open care tasks", String(workspace.tasks.filter((x) => !x.done).length), "Complete tasks below"], ["Appointments today", "18", "Fictional schedule"], ["Selected site", facility, "Local demo"]]
    : is("Pharmacist")
      ? [["Open prescriptions", String(workspace.dispenseQueue.filter((x) => !x.done).length), "Dispense below"], ["Low-stock medicines", String(workspace.medicines.filter((x) => x.quantity <= x.reorderAt).length), "Sample shelf"], ["Dispensed today", String(workspace.dispenseQueue.filter((x) => x.done).length), "This demo"]]
      : is("Facility Manager")
        ? [["Pending requests", String(workspace.transfers.filter((x) => x.status === "Pending").length), "Review below"], ["Approved", String(workspace.transfers.filter((x) => x.status === "Approved").length), "Sample transfers"], ["Selected site", facility, "Local demo"]]
        : is("Warehouse Manager")
          ? [["Orders to pack", String(workspace.warehouseOrders.filter((x) => x.status === "Queued").length), "Pack below"], ["Packed", String(workspace.warehouseOrders.filter((x) => x.status === "Packed").length), "For dispatch"], ["Dispatched", String(workspace.warehouseOrders.filter((x) => x.status === "Dispatched").length), "Sample orders"]]
          : is("Supplier / Manufacturer")
            ? [["Awaiting confirmation", String(workspace.supplierOrders.filter((x) => x.status === "Awaiting confirmation").length), "Confirm below"], ["Confirmed", String(workspace.supplierOrders.filter((x) => x.status === "Confirmed").length), "Sample orders"], ["Ready to ship", String(workspace.supplierOrders.filter((x) => x.status === "Ready to ship").length), "Sample orders"]]
            : is("Transport")
              ? [["Active deliveries", String(workspace.deliveries.filter((x) => x.status !== "Delivered").length), "Update routes below"], ["En route", String(workspace.deliveries.filter((x) => x.status === "En route").length), "Simulated tracking"], ["Delivered", String(workspace.deliveries.filter((x) => x.status === "Delivered").length), "Sample routes"]]
              : [["Alerts to review", String(workspace.alerts.filter((x) => !x.acknowledged).length), "Acknowledge below"], ["Sample facilities", "6", "Fictional network"], ["Demo bulletins", String(workspace.bulletins.length), "Saved locally"]];

  function reset() {
    if (window.confirm("Reset all stakeholder demo changes saved in this browser?")) setWorkspace(resetDemoWorkspace());
  }

  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning-foreground">
        <Eye className="h-4 w-4 shrink-0" />Fictional demo only. Changes save in this browser and never affect live patients, facilities, or Supabase.
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{summaryFor(role)}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {metrics.map(([label, value, hint]) => <Metric key={label} label={label} value={value} hint={hint} />)}
      </div>

      {is("Nurse / Clinic Staff") && <Panel title="Care task list">
        {workspace.tasks.map((task) => <Row key={task.id} title={task.title} detail={task.time} status={task.done ? "Completed" : "Open"}
          action={!task.done && <Action onClick={() => update((data) => ({ ...data, tasks: data.tasks.map((x) => x.id === task.id ? { ...x, done: true } : x) }))}>Complete task</Action>} />)}
      </Panel>}

      {is("Pharmacist") && <>
        <Panel title="Medicine shelf">
          {workspace.medicines.map((medicine) => <Row key={medicine.name} title={medicine.name} detail={`${medicine.quantity} sample units · reorder at ${medicine.reorderAt}`} status={medicine.quantity <= medicine.reorderAt ? "Reorder" : "Available"} />)}
        </Panel>
        <Panel title="Dispensing queue">
          {workspace.dispenseQueue.map((item) => {
            const medicine = workspace.medicines.find((x) => x.name === item.medicine);
            const canDispense = !item.done && Boolean(medicine && medicine.quantity >= item.quantity);
            return <Row key={item.id} title={item.patient} detail={`${item.medicine} · ${item.quantity} units`} status={item.done ? "Dispensed" : medicine && medicine.quantity < item.quantity ? "Insufficient sample stock" : "Waiting"}
              action={canDispense && <Action onClick={() => update((data) => ({
                ...data,
                dispenseQueue: data.dispenseQueue.map((x) => x.id === item.id ? { ...x, done: true } : x),
                medicines: data.medicines.map((x) => x.name === item.medicine ? { ...x, quantity: x.quantity - item.quantity } : x),
              }))}>Dispense</Action>} />;
          })}
        </Panel>
      </>}

      {is("Facility Manager") && <Panel title="Transfer requests">
        {workspace.transfers.map((item) => <Row key={item.id} title={item.id} detail={`${item.facility} · ${item.medicine} · ${item.quantity} units`} status={item.status}
          action={item.status === "Pending" && <div className="flex gap-2"><Action onClick={() => update((data) => ({ ...data, transfers: data.transfers.map((x) => x.id === item.id ? { ...x, status: "Approved" as const } : x) }))}>Approve</Action><Action secondary onClick={() => update((data) => ({ ...data, transfers: data.transfers.map((x) => x.id === item.id ? { ...x, status: "Declined" as const } : x) }))}>Decline</Action></div>} />)}
      </Panel>}

      {is("Warehouse Manager") && <Panel title="Warehouse order fulfilment">
        {workspace.warehouseOrders.map((item) => <Row key={item.id} title={item.id} detail={`${item.facility} · ${item.lines} medicine lines`} status={item.status}
          action={item.status === "Queued" ? <Action onClick={() => update((data) => ({ ...data, warehouseOrders: data.warehouseOrders.map((x) => x.id === item.id ? { ...x, status: "Packed" as const } : x) }))}>Pack order</Action>
            : item.status === "Packed" ? <Action onClick={() => update((data) => ({ ...data, warehouseOrders: data.warehouseOrders.map((x) => x.id === item.id ? { ...x, status: "Dispatched" as const } : x) }))}>Dispatch</Action> : undefined} />)}
      </Panel>}

      {is("Supplier / Manufacturer") && <Panel title="Supplier order queue">
        {workspace.supplierOrders.map((item) => <Row key={item.id} title={item.id} detail={`${item.item} · ${item.quantity} sample units`} status={item.status}
          action={item.status === "Awaiting confirmation" ? <Action onClick={() => update((data) => ({ ...data, supplierOrders: data.supplierOrders.map((x) => x.id === item.id ? { ...x, status: "Confirmed" as const } : x) }))}>Confirm order</Action>
            : item.status === "Confirmed" ? <Action onClick={() => update((data) => ({ ...data, supplierOrders: data.supplierOrders.map((x) => x.id === item.id ? { ...x, status: "Ready to ship" as const } : x) }))}>Mark ready to ship</Action> : undefined} />)}
      </Panel>}

      {is("Transport") && <Panel title="Delivery routes">
        {workspace.deliveries.map((item) => <Row key={item.id} title={item.id} detail={`${item.route} · cold-chain: ${item.temperature}`} status={item.status}
          action={<div className="flex flex-wrap gap-2">
            {item.status === "Planned" && <Action onClick={() => update((data) => ({ ...data, deliveries: data.deliveries.map((x) => x.id === item.id ? { ...x, status: "En route" as const } : x) }))}>Start route</Action>}
            {item.status === "En route" && <Action onClick={() => update((data) => ({ ...data, deliveries: data.deliveries.map((x) => x.id === item.id ? { ...x, status: "Delivered" as const } : x) }))}>Mark delivered</Action>}
            {item.temperature === "Not recorded" && <Action secondary onClick={() => update((data) => ({ ...data, deliveries: data.deliveries.map((x) => x.id === item.id ? { ...x, temperature: "4°C · simulated" } : x) }))}>Record 4°C check</Action>}
          </div>} />)}
      </Panel>}

      {is("Department of Health Official") && <>
        <Panel title="Regional demo alerts">
          {workspace.alerts.map((item) => <Row key={item.id} title={item.title} detail="Fictional regional indicator" status={item.acknowledged ? "Reviewed" : "Needs review"}
            action={!item.acknowledged && <Action onClick={() => update((data) => ({ ...data, alerts: data.alerts.map((x) => x.id === item.id ? { ...x, acknowledged: true } : x) }))}>Acknowledge</Action>} />)}
        </Panel>
        <Panel title="Regional bulletin">
          <form onSubmit={(event) => {
            event.preventDefault();
            const text = bulletin.trim();
            if (!text) return;
            update((data) => ({ ...data, bulletins: [text, ...data.bulletins] }));
            setBulletin("");
          }} className="flex flex-col gap-2 sm:flex-row">
            <input value={bulletin} onChange={(event) => setBulletin(event.target.value)} maxLength={140} placeholder="Write a fictional demo bulletin" className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm" />
            <Action type="submit">Publish bulletin</Action>
          </form>
          {workspace.bulletins.map((text, i) => <p key={i} className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">{text}</p>)}
          <button type="button" onClick={() => downloadReport(workspace)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"><Download className="h-4 w-4" /> Download sample report</button>
        </Panel>
      </>}

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"><RotateCcw className="h-4 w-4" /> Reset demo workspace</button>
      </div>
    </div>
  );
}

function summaryFor(role: string) {
  const summaries: Record<string, string> = {
    "Nurse / Clinic Staff": "Manage the fictional daily clinic follow-up and care task list.",
    Pharmacist: "Work through fictional prescriptions and monitor the sample medicine shelf.",
    "Facility Manager": "Review and decide on fictional inter-facility transfer requests.",
    "Warehouse Manager": "Pack and dispatch fictional replenishment orders.",
    "Supplier / Manufacturer": "Confirm fictional purchase orders and mark them ready to ship.",
    Transport: "Advance simulated delivery routes and record fictional cold-chain checks.",
    "Department of Health Official": "Acknowledge sample regional alerts and publish a local demo bulletin.",
  };
  return summaries[role] ?? "Read-only fictional stakeholder dashboard.";
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mt-5 rounded-2xl border border-border bg-card p-4"><h2 className="flex items-center gap-2 font-semibold"><ClipboardList className="h-4 w-4 text-primary" />{title}</h2><div className="mt-3 divide-y divide-border">{children}</div></section>;
}

function Row({ title, detail, status, action }: { title: string; detail: string; status: string; action?: ReactNode }) {
  return <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-medium">{title}</p><p className="text-sm text-muted-foreground">{detail}</p><p className="mt-1 text-xs font-semibold text-primary">{status}</p></div>{action}</div>;
}

function Action({ children, onClick, secondary, type = "button" }: { children: ReactNode; onClick?: () => void; secondary?: boolean; type?: "button" | "submit" }) {
  return <button type={type} onClick={onClick} className={secondary ? "rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted" : "rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"}>{children}</button>;
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="min-w-0 rounded-2xl border border-border bg-card p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 break-words text-lg font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></div>;
}

function downloadReport(workspace: DemoWorkspace) {
  const rows = [
    ["Metric", "Value"],
    ["Demo low-stock medicines", String(workspace.medicines.filter((x) => x.quantity <= x.reorderAt).length)],
    ["Demo pending transfers", String(workspace.transfers.filter((x) => x.status === "Pending").length)],
    ["Demo deliveries remaining", String(workspace.deliveries.filter((x) => x.status !== "Delivered").length)],
    ["Demo alerts needing review", String(workspace.alerts.filter((x) => !x.acknowledged).length)],
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "MediCareSync-Fictional-Demo-Report.csv";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
