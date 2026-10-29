import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Building2, ChevronLeft, Eye, EyeOff, Loader2, Lock, UserRound } from "lucide-react";
import { facilityLogin } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { PrototypeBanner } from "@/components/medicare";

export const Route = createFileRoute("/facility-login")({
  head: () => ({
    meta: [
      { title: "Healthcare Facility Login — MediCare Sync" },
      { name: "description", content: "Facility staff sign in to manage stock, orders and patients." },
      { property: "og:title", content: "Healthcare Facility Login — MediCare Sync" },
      { property: "og:description", content: "Smarter stock. Safer care. Better decisions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FacilityLogin,
});

const DEMO_PASSWORD = "MediCare2026!";
const DEMO_FACILITIES = [
  { username: "warehouse.pmb", name: "Provincial Warehouse Pietermaritzburg" },
  { username: "edendale", name: "Edendale Hospital" },
  { username: "kwadabeka", name: "KwaDabeka CHC" },
  { username: "ndwedwe", name: "Ndwedwe Rural Clinic" },
  { username: "ixopo", name: "Ixopo Rural Clinic" },
  { username: "mobile1", name: "Mobile Clinic Unit 1" },
];

function FacilityLogin() {
  const login = useServerFn(facilityLogin);
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(u = username, p = password) {
    setBusy(true);
    setError(null);
    try {
      const res = await login({ data: { username: u, password: p } });
      if (!res.ok) return setError(res.error);
      await supabase.auth.setSession({ access_token: res.access_token, refresh_token: res.refresh_token });
      navigate({ to: "/facility" });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full rounded-xl border border-input bg-card py-3 pr-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-ring";
  return (
    <div className="theme-facility min-h-screen bg-background">
      <PrototypeBanner />
      <div className="mx-auto max-w-md px-5 py-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
        <div className="mt-6 flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Building2 className="h-8 w-8" />
          </span>
          <h1 className="mt-3 text-2xl font-bold">Healthcare Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">Login to your facility account</p>
        </div>

        <label className="mt-6 block text-sm font-medium">
          Use demo account
          <select
            className="mt-1 w-full rounded-xl border border-input bg-primary-soft px-3 py-3 text-sm font-medium text-primary-deep outline-none focus:ring-2 focus:ring-ring"
            defaultValue=""
            disabled={busy}
            onChange={(e) => {
              if (!e.target.value) return;
              setUsername(e.target.value);
              setPassword(DEMO_PASSWORD);
              submit(e.target.value, DEMO_PASSWORD);
            }}
          >
            <option value="">Choose a demo facility…</option>
            {DEMO_FACILITIES.map((f) => (
              <option key={f.username} value={f.username}>{f.name}</option>
            ))}
          </select>
        </label>

        <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <label className="block text-sm font-medium">
            Username
            <div className="relative mt-1">
              <UserRound className="absolute top-3.5 left-3 h-4 w-4 text-muted-foreground" />
              <input required autoComplete="username" className={field} placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
          </label>
          <label className="block text-sm font-medium">
            Password
            <div className="relative mt-1">
              <Lock className="absolute top-3.5 left-3 h-4 w-4 text-muted-foreground" />
              <input required type={show ? "text" : "password"} autoComplete="current-password" className={field} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" aria-label="Show password" onClick={() => setShow(!show)} className="absolute top-3 right-3 text-muted-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          {error && <p className="rounded-xl bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Login
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">Use your facility credentials provided by your organisation.</p>
      </div>
    </div>
  );
}
