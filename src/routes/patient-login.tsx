import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CalendarDays, ChevronLeft, Hash, Loader2, UserRound } from "lucide-react";
import { patientLogin } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { PrototypeBanner } from "@/components/medicare";

export const Route = createFileRoute("/patient-login")({
  head: () => ({
    meta: [
      { title: "Patient Login — MediCare Sync" },
      { name: "description", content: "Sign in with your hospital number, name and date of birth to see your appointments and medicine." },
      { property: "og:title", content: "Patient Login — MediCare Sync" },
      { property: "og:description", content: "Access your care, appointments and medicine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PatientLogin,
});

const DEMO_PATIENTS = [
  { patientNumber: "HN123456", fullName: "Zimbili Mkhize", dateOfBirth: "1968-04-12", note: "Hypertension · Ndwedwe" },
  { patientNumber: "HN234567", fullName: "Sipho Ndlovu", dateOfBirth: "1955-09-03", note: "Diabetes · KwaDabeka" },
  { patientNumber: "HN345678", fullName: "Thandeka Dlamini", dateOfBirth: "1990-01-20", note: "TB · Edendale" },
];

function PatientLogin() {
  const login = useServerFn(patientLogin);
  const navigate = useNavigate();
  const [form, setForm] = useState({ patientNumber: "", fullName: "", dateOfBirth: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(values = form) {
    setBusy(true);
    setError(null);
    try {
      const res = await login({ data: values });
      if (!res.ok) return setError(res.error);
      await supabase.auth.setSession({ access_token: res.access_token, refresh_token: res.refresh_token });
      navigate({ to: "/patient" });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full rounded-xl border border-input bg-card py-3 pr-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-ring";
  return (
    <div className="min-h-screen bg-background">
      <PrototypeBanner />
      <div className="mx-auto max-w-md px-5 py-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
        <div className="mt-6 flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary">
            <UserRound className="h-8 w-8" />
          </span>
          <h1 className="mt-3 text-2xl font-bold">Patient Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">Use your hospital details to access your information.</p>
        </div>
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="block text-sm font-medium">
            Hospital / Patient Number
            <div className="relative mt-1">
              <Hash className="absolute top-3.5 left-3 h-4 w-4 text-muted-foreground" />
              <input required maxLength={20} className={field} placeholder="e.g. HN123456" value={form.patientNumber}
                onChange={(e) => setForm({ ...form, patientNumber: e.target.value })} />
            </div>
          </label>
          <label className="block text-sm font-medium">
            Full Name
            <div className="relative mt-1">
              <UserRound className="absolute top-3.5 left-3 h-4 w-4 text-muted-foreground" />
              <input required maxLength={100} className={field} placeholder="Your full name" value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
          </label>
          <label className="block text-sm font-medium">
            Date of Birth
            <div className="relative mt-1">
              <CalendarDays className="absolute top-3.5 left-3 h-4 w-4 text-muted-foreground" />
              <input required type="date" className={field} value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            </div>
          </label>
          {error && <p className="rounded-xl bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Login
          </button>
        </form>

        <div className="mt-8">
          <p className="text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">Or use a demo patient</p>
          <div className="mt-3 space-y-2">
            {DEMO_PATIENTS.map((p) => (
              <button key={p.patientNumber} disabled={busy}
                onClick={() => { setForm(p); submit(p); }}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left text-sm hover:border-primary">
                <span><span className="font-semibold">{p.fullName}</span><span className="block text-xs text-muted-foreground">{p.patientNumber} · {p.note}</span></span>
                <span className="text-xs font-semibold text-primary">Demo account</span>
              </button>
            ))}
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">Need help? Contact your clinic.</p>
      </div>
    </div>
  );
}
