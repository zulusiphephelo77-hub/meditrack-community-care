import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, BadgeCheck, ClipboardList, Eye, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import { PrototypeBanner } from "@/components/medicare";

type Stakeholder = {
  id: string;
  name: string;
  role: string;
  password: string;
  needsFacility: boolean;
  summary: string;
  metrics: [string, string, string][];
  panelTitle: string;
  panelItems: string[];
};

const stakeholders: Stakeholder[] = [
  {
    id: "KZN-NUR-2026-001", name: "Lindiwe Mthembu", role: "Nurse / Clinic Staff", password: "Clinic!2026-001", needsFacility: true,
    summary: "A sample care-team overview for a selected clinic or hospital.",
    metrics: [["Appointments today", "18", "Fictional schedule"], ["Follow-ups", "6", "Sample care list"], ["Stock notices", "2", "Training alerts"]],
    panelTitle: "Today's sample care list",
    panelItems: ["Chronic care follow-up · 09:00", "Medicine collection · 10:30", "Referral review · 12:00"],
  },
  {
    id: "KZN-PHA-2026-002", name: "Ayesha Patel", role: "Pharmacist", password: "Pharm!2026-002", needsFacility: true,
    summary: "A sample medicine availability and dispensing overview.",
    metrics: [["Dispensing queue", "9", "Fictional prescriptions"], ["Low-stock items", "3", "Sample inventory"], ["Near-expiry batches", "2", "Training alerts"]],
    panelTitle: "Sample medicine checks",
    panelItems: ["Amlodipine 10mg · In stock", "Insulin · Low stock", "Salbutamol inhaler · Review level"],
  },
  {
    id: "KZN-FAC-2026-003", name: "Bongani Zulu", role: "Facility Manager", password: "Manage!2026-003", needsFacility: true,
    summary: "A sample operational snapshot for a selected clinic or hospital.",
    metrics: [["Open transfer requests", "4", "Fictional requests"], ["Stock alerts", "3", "Sample notices"], ["Visits today", "36", "Training figures"]],
    panelTitle: "Sample facility priorities",
    panelItems: ["Review medicine availability alerts", "Check pending transfer requests", "Confirm today's clinic schedule"],
  },
  {
    id: "KZN-WHS-2026-004", name: "Naledi Mokoena", role: "Warehouse Manager", password: "Stock!2026-004", needsFacility: false,
    summary: "A sample overview of fictional warehouse and replenishment activity.",
    metrics: [["Facilities served", "6", "Sample network"], ["Orders to prepare", "5", "Fictional orders"], ["Replenishment alerts", "3", "Training notices"]],
    panelTitle: "Sample outbound orders",
    panelItems: ["Edendale Hospital · Packing", "Ndwedwe Rural Clinic · Ready", "KwaDabeka CHC · Awaiting review"],
  },
  {
    id: "KZN-SUP-2026-005", name: "Ravi Naidoo", role: "Supplier / Manufacturer", password: "Supply!2026-005", needsFacility: false,
    summary: "A sample supplier view of fictional order fulfilment.",
    metrics: [["Sample purchase orders", "4", "Fictional orders"], ["Pending fulfilment", "2", "Training queue"], ["Medicine lines", "7", "Sample catalogue"]],
    panelTitle: "Sample fulfilment queue",
    panelItems: ["Order KZN-DEMO-101 · Prepare", "Order KZN-DEMO-102 · Confirm quantity", "Order KZN-DEMO-103 · Ready for dispatch"],
  },
  {
    id: "KZN-TRN-2026-006", name: "Themba Cele", role: "Transport", password: "Route!2026-006", needsFacility: false,
    summary: "A sample view of simulated medicine deliveries.",
    metrics: [["Simulated deliveries", "6", "Fictional routes"], ["En route", "2", "Training status"], ["Cold-chain checks", "3", "Simulated readings"]],
    panelTitle: "Sample delivery schedule",
    panelItems: ["Pietermaritzburg → Edendale · En route", "Warehouse → Ndwedwe · Planned", "Warehouse → Ixopo · Delivered"],
  },
  {
    id: "KZN-DOH-2026-007", name: "Zanele Ndlovu", role: "Department of Health Official", password: "Review!2026-007", needsFacility: false,
    summary: "A regional snapshot using fictional district-level figures.",
    metrics: [["Sample facilities", "6", "Fictional network"], ["Low-stock notices", "8", "Training figures"], ["Weekly fulfilment", "91%", "Illustrative only"]],
    panelTitle: "Sample regional indicators",
    panelItems: ["Medicine availability · 91% illustrative", "Facilities with alerts · 2 sample sites", "Delivery performance · Training data only"],
  },
];

const facilities = [
  "Edendale Hospital",
  "KwaDabeka Community Health Centre",
  "Ndwedwe Rural Clinic",
  "Ixopo Rural Clinic",
  "Mobile Clinic Unit 1",
];

type DemoSession = { stakeholder: Stakeholder; facility: string };

export const Route = createFileRoute("/stakeholder-login")({
  head: () => ({
    meta: [
      { title: "Healthcare Worker Demo Login — MediCare Sync" },
      { name: "description", content: "Sign in to a fictional, read-only MediCare Sync stakeholder demonstration." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StakeholderDemo,
});

function StakeholderDemo() {
  const [roleId, setRoleId] = useState("");
  const [facility, setFacility] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [session, setSession] = useState<DemoSession | null>(null);
  const selected = stakeholders.find((person) => person.id === roleId);

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!selected) {
      setError("Choose your stakeholder role first.");
      return;
    }
    if (selected.needsFacility && !facility) {
      setError("Choose your hospital or clinic.");
      return;
    }
    if (idNumber.trim().toUpperCase() !== selected.id || password !== selected.password) {
      setError("Those demonstration details do not match this role. Check the sample credentials and try again.");
      return;
    }
    setSession({ stakeholder: selected, facility: selected.needsFacility ? facility : "" });
  }

  function signOut() {
    setSession(null);
    setRoleId("");
    setFacility("");
    setIdNumber("");
    setPassword("");
  }

  if (session) {
    const { stakeholder, facility: site } = session;
    return (
      <div className="min-h-screen bg-background">
        <PrototypeBanner />
        <main className="mx-auto max-w-3xl px-5 py-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-primary"><ArrowLeft className="h-4 w-4" /> Home</Link>
          <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Stakeholder demonstration</p>
                <h1 className="mt-2 text-2xl font-bold">{stakeholder.role} dashboard</h1>
                <p className="mt-1 text-muted-foreground">{stakeholder.name}{site ? ` · ${site}` : ""}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary"><Eye className="h-3.5 w-3.5" /> Read only</span>
            </div>
            <p className="mt-5 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning-foreground">
              Fictional training data only. This demo does not connect to live patient, stock, supplier, or delivery records.
            </p>
            <p className="mt-6 text-sm text-muted-foreground">{stakeholder.summary}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {stakeholder.metrics.map(([label, value, hint]) => (
                <Metric key={label} label={label} value={value} hint={hint} />
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-border bg-background p-4">
              <h2 className="flex items-center gap-2 font-semibold"><ClipboardList className="h-4 w-4 text-primary" />{stakeholder.panelTitle}</h2>
              <ul className="mt-3 divide-y divide-border">
                {stakeholder.panelItems.map((item) => <li key={item} className="py-3 text-sm text-muted-foreground">{item}</li>)}
              </ul>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">This demonstration has no live-data access or write actions.</p>
            <button type="button" onClick={signOut} className="mt-6 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Sign out of demo</button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PrototypeBanner />
      <main className="mx-auto max-w-md px-5 py-5">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-primary"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <div className="mt-6 flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary"><Users className="h-8 w-8" /></span>
          <h1 className="mt-3 text-2xl font-bold">Healthcare Worker Demo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose a role, then sign in with its fictional demo credentials.</p>
        </div>

        <form className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5" onSubmit={signIn}>
          <label className="block text-sm font-medium">
            Stakeholder role
            <select required value={roleId} onChange={(event) => { setRoleId(event.target.value); setFacility(""); setIdNumber(""); setPassword(""); setError(""); }}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="">Choose a role…</option>
              {stakeholders.map((person) => <option key={person.id} value={person.id}>{person.role}</option>)}
            </select>
          </label>

          {selected?.needsFacility && (
            <label className="block text-sm font-medium">
              Select your hospital or clinic
              <select required value={facility} onChange={(event) => setFacility(event.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="">Choose a hospital or clinic…</option>
                {facilities.map((site) => <option key={site} value={site}>{site}</option>)}
              </select>
            </label>
          )}

          {selected && (
            <>
              <div className="rounded-xl border border-primary/20 bg-primary-soft p-3 text-sm text-primary-deep">
                <p className="flex items-center gap-2 font-semibold"><BadgeCheck className="h-4 w-4" /> Fictional demo credentials</p>
                <p className="mt-1">ID: <code>{selected.id}</code></p>
                <p>Password: <code>{selected.password}</code></p>
              </div>
              <label className="block text-sm font-medium">
                MediCareSync demonstration ID
                <input required autoComplete="username" value={idNumber} onChange={(event) => setIdNumber(event.target.value)}
                  placeholder={selected.id} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <label className="block text-sm font-medium">
                Password
                <div className="relative mt-1">
                  <LockKeyhole className="absolute top-3.5 left-3 h-4 w-4 text-muted-foreground" />
                  <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-input bg-background py-3 pr-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </label>
            </>
          )}

          {error && <p role="alert" className="rounded-xl bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p>}
          <button disabled={!selected} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-50">
            <ShieldCheck className="h-4 w-4" /> Sign in to demo
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">These accounts are fictional and are not government IDs or professional registration numbers. Sign-in is local to this page and does not create or change Supabase accounts.</p>
      </main>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-lg font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
