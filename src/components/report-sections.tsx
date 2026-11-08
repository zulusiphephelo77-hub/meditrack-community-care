import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const stakeholders = [
  ["Patients", "Keep informed", "Find medicine without wasted travel", "Stock check, transfer request, mobile clinic request"],
  ["Clinic managers and pharmacists", "Manage closely", "Accurate stock and early warnings", "Stock list, low-stock alerts, transfers"],
  ["Provincial warehouse managers", "Manage closely", "See real clinic demand and expiry", "Catalogue, stock take, expiry-first picking"],
  ["Suppliers", "Keep satisfied", "Current demand, not old estimates", "Future: supplier order portal"],
  ["Transport providers", "Keep informed", "Predictable routes and delivery windows", "Mobile clinic schedule and load list"],
  ["Government health officials", "Keep satisfied", "District-wide stock visibility", "Reports and history"],
];

const stages = [
  ["Manufacturers and suppliers", "Orders follow estimates and historical usage, so critical chronic medicines can be under-ordered."],
  ["Provincial warehouse", "Manual, disconnected records hide real stock, so some stock expires while other medicines run out."],
  ["Transport and distribution", "Weak route planning and no delivery tracking mean remote clinics wait days or weeks."],
  ["Clinics and facilities", "Stock arrives late or incomplete with no warning, and emergency orders cost more."],
  ["Patients", "People travel far and are turned away, or go without treatment."],
];

const causes: [string, string[]][] = [
  ["Forecasting", ["Outdated estimates", "Current usage not reflected", "Critical medicines under-ordered"]],
  ["Inventory", ["No real-time counts", "Manual, disconnected systems", "Poor visibility across sites"]],
  ["Communication", ["Stock-outs reported late", "Delays not shared early", "Stakeholders cannot see each other's needs"]],
  ["Planning and logistics", ["Last-minute schedules", "Routes not consolidated", "Rushed emergency orders"]],
  ["Accuracy, waste and cost", ["Wrong items or quantities sent", "Cold chain not always verified", "Rush transport raises cost"]],
  ["People and process", ["Unclear accountability", "Uneven stock-management training"]],
];

const whys = [
  "A clinic runs out of a chronic medicine.",
  "Why? Replenishment did not arrive in time.",
  "Why? The warehouse did not know the clinic was running low.",
  "Why? Clinic usage is not reported upward in real time.",
  "Why? Records are on paper and information flows one way, down.",
  "Root cause: no shared, live record of stock and demand.",
];

const ideas = [
  ["Real-time stock visibility", "High", "Built"],
  ["FIFO and FEFO stock rotation", "High", "Built (warehouse picking)"],
  ["Early-warning low-stock alerts", "Very high", "Built"],
  ["Dynamic demand forecasting", "Medium-high", "Future work"],
  ["Offline-first mobile app", "High", "Built (offline counts and orders, no barcode scanning)"],
  ["IoT cold-chain sensors", "Medium", "Simulated readings"],
  ["Scheduled rural feeder routes", "High", "Simulated mobile clinic schedule"],
  ["Inter-facility stock redistribution", "Medium", "Built (transfers)"],
  ["Patient SMS and USSD notifications", "High", "Simulated messages"],
  ["Supplier purchase order portal", "Medium", "Future work"],
  ["Regional emergency buffer depots", "Medium", "Future work"],
  ["Staff training and accountability", "High", "Roadmap phase 4"],
];

const checklist = [
  "Sign in as a rural clinic, go offline, dispense until stock reaches the reorder level, and confirm an order is queued.",
  "Sign in as a clinic holding an expiring batch and confirm a transfer notification appears.",
  "Run Simulate next day and confirm expiry and stock figures move together.",
  "As a patient, request a medicine at a mobile clinic stop and confirm it appears in the facility load list.",
  "As the warehouse, pick an order and confirm the earliest-expiry batch is chosen first.",
];

const phases = [
  ["Phase 1: pilot", "One rural clinic and the warehouse: offline counts, low-stock alerts."],
  ["Phase 2: district", "Expiry-first picking and transfers across the district; basic forecasting."],
  ["Phase 3: reach", "Mobile clinic requests, SMS and USSD, cold-chain sensors, supplier portal."],
  ["Phase 4: scale", "Province-wide rollout with training, supervisory audits and clear accountability."],
];

const risks = [
  ["Poor rural connectivity", "Offline-first queues that sync when the connection returns"],
  ["Staff adoption", "Role-based training and supervisor audits"],
  ["Sensor cost", "Offset by less insulin lost to heat damage"],
  ["Unmonitored transfers", "District depot approval before stock moves"],
];

const guide = [
  "Home: read the design challenge, then open the Project Report.",
  "Report: walk through stakeholders, the supply chain map, root causes and the 12 ideas.",
  "Patient demo (Zimbili Mkhize): check stock, request a transfer, request medicine from the mobile clinic.",
  "Facility demo (Ndwedwe Rural Clinic): offline orders, automated ordering, expiry and transfers.",
  "Warehouse demo: catalogue, stock take, expiry-first picking.",
  "Finish on Test and Roadmap.",
];

type Entry = { role: string; ease: number; useful: number; alerts: number; note: string };
const KEY = "medicare-feedback";

function Feedback() {
  const [items, setItems] = useState<Entry[]>([]);
  const [f, setF] = useState<Entry>({ role: "Patient", ease: 4, useful: 4, alerts: 4, note: "" });
  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(KEY) ?? "[]")); } catch { /* storage unavailable */ }
  }, []);
  const save = () => {
    const next = [...items, f];
    setItems(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    setF({ ...f, note: "" });
  };
  const avg = (k: "ease" | "useful" | "alerts") => (items.reduce((s, i) => s + i[k], 0) / items.length).toFixed(1);
  const num = (k: "ease" | "useful" | "alerts", label: string) => (
    <label className="flex items-center justify-between gap-3 text-sm">
      {label}
      <select className="rounded-md border border-border bg-background px-2 py-1" value={f[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })}>
        {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
      </select>
    </label>
  );
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="font-semibold">Tester feedback</h3>
      <label className="flex items-center justify-between gap-3 text-sm">
        Tester role
        <select className="rounded-md border border-border bg-background px-2 py-1" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
          {["Patient", "Nurse or pharmacist", "Clinic manager", "Warehouse manager", "Supplier", "Transport provider"].map((r) => <option key={r}>{r}</option>)}
        </select>
      </label>
      {num("ease", "Ease of use (1-5)")}
      {num("useful", "Usefulness (1-5)")}
      {num("alerts", "Clarity of alerts (1-5)")}
      <textarea className="w-full rounded-md border border-border bg-background p-2 text-sm" rows={2} placeholder="What would you change?" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      <Button onClick={save}>Save feedback</Button>
      {items.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {items.length} response(s) on this device. Averages: ease {avg("ease")}, usefulness {avg("useful")}, alerts {avg("alerts")}. Latest comment: {items[items.length - 1].note || "none"}
        </p>
      )}
    </div>
  );
}

export function ReportSections() {
  return (
    <section className="border-b border-border py-7" aria-label="Design thinking report">
      <h2 className="text-lg font-bold">Design thinking report</h2>
      <p className="mt-1 text-sm text-muted-foreground">Empathize and define, ideate and prototype, then test and implement.</p>
      <Tabs defaultValue="stakeholders" className="mt-4">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          {[["stakeholders", "Stakeholders"], ["chain", "Supply chain"], ["causes", "Root causes"], ["ideas", "Ideas"], ["test", "Test"], ["implement", "Implement"], ["present", "Present"]].map(([v, l]) => (
            <TabsTrigger key={v} value={v}>{l}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="stakeholders" className="space-y-3">
          {stakeholders.map(([n, q, need, help]) => (
            <div key={n} className="rounded-xl border border-border bg-card p-3 text-sm">
              <p className="font-semibold">{n} <span className="font-normal text-primary">({q})</span></p>
              <p className="mt-1 text-muted-foreground">Needs: {need}</p>
              <p className="text-muted-foreground">How MediCare Sync helps: {help}</p>
            </div>
          ))}
          <div className="rounded-xl border border-border bg-card p-3 text-sm">
            <p className="font-semibold">Patient empathy map</p>
            <p className="mt-1 text-muted-foreground">Says: "I cannot keep coming back if the clinic has no stock." Thinks: "Will the medicine be available next time?" Feels: worried, frustrated, anxious. Does: returns to the clinic, waits, or travels elsewhere.</p>
          </div>
        </TabsContent>

        <TabsContent value="chain">
          <p className="text-sm text-muted-foreground">Medicine and orders flow down. Usage and stock data should flow back up, but today it does not.</p>
          <Accordion type="single" collapsible className="mt-3">
            {stages.map(([n, p], i) => (
              <AccordionItem key={n} value={n}>
                <AccordionTrigger>{n}</AccordionTrigger>
                <AccordionContent>
                  <p className="flex items-center gap-2"><ArrowDown className="h-4 w-4 text-primary" /> Problem today: {p}</p>
                  {i < stages.length - 1 && <p className="mt-2 flex items-center gap-2 text-muted-foreground"><ArrowUp className="h-4 w-4" /> Missing upward data: live usage and shortage reports.</p>}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="mt-3 text-sm">With MediCare Sync, dispensing, orders and transfers update one shared record, so the upward flow exists for the first time.</p>
        </TabsContent>

        <TabsContent value="causes" className="space-y-3">
          <p className="text-sm font-semibold">Effect: clinics run out of essential medicines while stock expires elsewhere.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {causes.map(([c, list]) => (
              <div key={c} className="rounded-xl border border-border bg-card p-3 text-sm">
                <p className="font-semibold">{c}</p>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">{list.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            ))}
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-sm">{whys.map((w) => <li key={w}>{w}</li>)}</ol>
          <p className="text-sm text-muted-foreground"><strong className="text-foreground">Problem statement:</strong> Patients and healthcare facilities cannot reliably access essential medicines because the supply chain does not consistently forecast, track or share stock and demand information.</p>
          <p className="text-sm text-muted-foreground"><strong className="text-foreground">How might we</strong> improve information flow, stock visibility and coordination so essential medicines reach clinics reliably, waste is reduced and patients have access to the care they need?</p>
        </TabsContent>

        <TabsContent value="ideas">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-border"><th className="py-2 pr-2">Idea</th><th className="pr-2">Feasibility</th><th>In this prototype</th></tr></thead>
              <tbody>{ideas.map(([n, fe, s], i) => (
                <tr key={n} className="border-b border-border/60"><td className="py-2 pr-2">{i + 1}. {n}</td><td className="pr-2">{fe}</td><td className="text-muted-foreground">{s}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Final three ideas: real-time stock visibility, automated expiry-first control, and smart logistics with cold-chain monitoring.</p>
        </TabsContent>

        <TabsContent value="test">
          <ol className="list-decimal space-y-1 pl-5 text-sm">{checklist.map((c) => <li key={c}>{c}</li>)}</ol>
          <Feedback />
        </TabsContent>

        <TabsContent value="implement" className="space-y-3">
          {phases.map(([p, d]) => <p key={p} className="text-sm"><strong>{p}.</strong> <span className="text-muted-foreground">{d}</span></p>)}
          <p className="pt-1 text-sm font-semibold">Risks and responses</p>
          {risks.map(([r, m]) => <p key={r} className="text-sm text-muted-foreground"><strong className="text-foreground">{r}:</strong> {m}</p>)}
          <p className="text-sm text-muted-foreground">Conclusion: shared, accurate information can improve availability, reduce waste and support efficient supply chain management.</p>
        </TabsContent>

        <TabsContent value="present">
          <ol className="list-decimal space-y-1 pl-5 text-sm">{guide.map((g) => <li key={g}>{g}</li>)}</ol>
        </TabsContent>
      </Tabs>
    </section>
  );
}
