import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Eye, LockKeyhole, Users } from "lucide-react";
import { PrototypeBanner } from "@/components/medicare";
import { StakeholderOperations } from "@/components/stakeholder-operations";

type Stakeholder = {
  id: string;
  name: string;
  role: string;
  password: string;
  needsFacility: boolean;
};

const stakeholders: Stakeholder[] = [
  { id: "KZN-NUR-2026-001", name: "Lindiwe Mthembu", role: "Nurse / Clinic Staff", password: "Clinic!2026-001", needsFacility: true },
  { id: "KZN-PHA-2026-002", name: "Ayesha Patel", role: "Pharmacist", password: "Pharm!2026-002", needsFacility: true },
  { id: "KZN-FAC-2026-003", name: "Bongani Zulu", role: "Facility Manager", password: "Manage!2026-003", needsFacility: true },
  { id: "KZN-WHS-2026-004", name: "Naledi Mokoena", role: "Warehouse Manager", password: "Stock!2026-004", needsFacility: false },
  { id: "KZN-SUP-2026-005", name: "Ravi Naidoo", role: "Supplier / Manufacturer", password: "Supply!2026-005", needsFacility: false },
  { id: "KZN-TRN-2026-006", name: "Themba Cele", role: "Transport", password: "Route!2026-006", needsFacility: false },
  { id: "KZN-DOH-2026-007", name: "Zanele Ndlovu", role: "Department of Health Official", password: "Review!2026-007", needsFacility: false },
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
  ssr: false,
  head: () => ({
    meta: [
      { title: "Healthcare Worker Demo Login — MediCare Sync" },
      { name: "description", content: "Sign in to fictional, operational MediCare Sync stakeholder demonstrations." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StakeholderDemo,
});

function StakeholderDemo() {
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null);
  const [facility, setFacility] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [session, setSession] = useState<DemoSession | null>(null);

  function enterDemo(stakeholder: Stakeholder, selectedFacility = "") {
    setSession({ stakeholder, facility: stakeholder.needsFacility ? selectedFacility : "" });
    setSelectedStakeholder(null);
    setFacility("");
    setWorkerId("");
    setPassword("");
    setError("");
  }

  function chooseAccount(stakeholder: Stakeholder) {
    setSelectedStakeholder(stakeholder);
    setFacility("");
    setWorkerId(stakeholder.id);
    setPassword(stakeholder.password);
    setError("");
  }

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!selectedStakeholder) {
      setError("Select a worker account before signing in.");
      return;
    }
    if (selectedStakeholder.needsFacility && !facility) {
      setError("Select your hospital or clinic before signing in.");
      return;
    }
    if (workerId.trim().toUpperCase() !== selectedStakeholder.id || password !== selectedStakeholder.password) {
      setError("The worker ID or password does not match the selected demo account.");
      return;
    }
    enterDemo(selectedStakeholder, facility);
  }

  if (session) {
    return (
      <div className="min-h-screen bg-background">
        <PrototypeBanner />
        <main className="mx-auto max-w-3xl px-5 py-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-primary"><ArrowLeft className="h-4 w-4" /> Home</Link>
          <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Stakeholder demonstration</p>
                <h1 className="mt-2 text-2xl font-bold">{session.stakeholder.role} dashboard</h1>
                <p className="mt-1 text-muted-foreground">{session.stakeholder.name}{session.facility ? ` · ${session.facility}` : ""} · {session.stakeholder.id}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary"><Eye className="h-3.5 w-3.5" /> Demo account</span>
            </div>
            <StakeholderOperations role={session.stakeholder.role} facility={session.facility} />
            <button type="button" onClick={() => setSession(null)} className="mt-5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Sign out of demo</button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PrototypeBanner />
      <main className="mx-auto max-w-2xl px-5 py-5">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-primary"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <div className="mt-6 flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary"><Users className="h-8 w-8" /></span>
          <h1 className="mt-3 text-2xl font-bold">Healthcare Worker Demo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Select a worker account, review its login details, then sign in.</p>
        </div>
        <div className="mt-6 space-y-2">
          {stakeholders.map((person) => (
            <button key={person.id} type="button" onClick={() => chooseAccount(person)} aria-pressed={selectedStakeholder?.id === person.id}
              className={selectedStakeholder?.id === person.id ? "flex w-full items-center justify-between gap-3 rounded-xl border-2 border-primary bg-primary-soft px-4 py-3 text-left text-sm" : "flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition-colors hover:border-primary"}>
              <span className="min-w-0">
                <span className="block font-semibold">{person.name}</span>
                <span className="block text-xs text-muted-foreground">{person.role} · {person.id}</span>
              </span>
              <span className="shrink-0 rounded-lg bg-primary-soft px-3 py-2 text-xs font-semibold text-primary">
                {selectedStakeholder?.id === person.id ? "Selected" : "Select account"}
              </span>
            </button>
          ))}
        </div>
        {selectedStakeholder && (
          <form onSubmit={signIn} className="mt-4 space-y-3 rounded-2xl border border-primary/30 bg-card p-4">
            <div>
              <p className="font-semibold">Sign in as {selectedStakeholder.name}</p>
              <p className="text-sm text-muted-foreground">{selectedStakeholder.role}</p>
            </div>
            {selectedStakeholder.needsFacility && (
              <label className="block text-sm font-medium">
                Select your hospital or clinic
                <select required value={facility} onChange={(event) => setFacility(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Choose a hospital or clinic…</option>
                  {facilities.map((site) => <option key={site} value={site}>{site}</option>)}
                </select>
              </label>
            )}
            <label className="block text-sm font-medium">
              MediCareSync worker ID
              <input required autoComplete="username" value={workerId} onChange={(event) => setWorkerId(event.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </label>
            <label className="block text-sm font-medium">
              Password
              <div className="relative mt-1">
                <LockKeyhole className="absolute top-3.5 left-3 h-4 w-4 text-muted-foreground" />
                <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-input bg-background py-3 pr-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </label>
            {error && <p role="alert" className="rounded-xl bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p>}
            <button disabled={!selectedStakeholder || (selectedStakeholder.needsFacility && !facility)}
              className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50">
              Sign in to {selectedStakeholder.role} demo
            </button>
          </form>
        )}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Fictional demo accounts only. Sample passwords are shown for training. These are not government IDs or professional registration numbers.
        </p>
      </main>
    </div>
  );
}
