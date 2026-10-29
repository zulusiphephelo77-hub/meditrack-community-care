import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Prototype: fictional demo accounts only. Shared password for all demo facility accounts.
export const DEMO_FACILITY_PASSWORD = "MediCare2026!";

async function derivePassword(seed: string) {
  const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(seed));
  return btoa(String.fromCharCode(...new Uint8Array(sig))) + "Aa1!";
}

async function ensureUserAndSignIn(
  email: string,
  password: string,
  role: "patient" | "facility",
  existingUserId: string | null,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let userId = existingUserId;
  if (!userId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error("Could not set up the account");
    userId = data.user.id;
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
  }
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error("Sign-in failed");
  return {
    userId,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export const patientLogin = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        patientNumber: z.string().trim().min(3).max(20),
        fullName: z.string().trim().min(2).max(100),
        dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const num = data.patientNumber.toUpperCase();
    const { data: p } = await supabaseAdmin
      .from("patients")
      .select("id, full_name, date_of_birth, user_id")
      .eq("patient_number", num)
      .maybeSingle();
    if (!p || norm(p.full_name) !== norm(data.fullName) || p.date_of_birth !== data.dateOfBirth) {
      return { ok: false as const, error: "We couldn't match those details. Please check and try again." };
    }
    const email = `${num.toLowerCase()}@patients.medicaresync.test`;
    const s = await ensureUserAndSignIn(email, await derivePassword(`patient:${num}`), "patient", p.user_id);
    if (!p.user_id) await supabaseAdmin.from("patients").update({ user_id: s.userId }).eq("id", p.id);
    return { ok: true as const, access_token: s.access_token, refresh_token: s.refresh_token };
  });

export const facilityLogin = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ username: z.string().trim().min(2).max(50), password: z.string().min(1).max(100) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: f } = await supabaseAdmin
      .from("facilities")
      .select("id, username, user_id")
      .eq("username", data.username.toLowerCase())
      .maybeSingle();
    if (!f || data.password !== DEMO_FACILITY_PASSWORD) {
      return { ok: false as const, error: "Incorrect username or password." };
    }
    const email = `${f.username}@facilities.medicaresync.test`;
    const s = await ensureUserAndSignIn(email, DEMO_FACILITY_PASSWORD, "facility", f.user_id);
    if (!f.user_id) await supabaseAdmin.from("facilities").update({ user_id: s.userId }).eq("id", f.id);
    return { ok: true as const, access_token: s.access_token, refresh_token: s.refresh_token };
  });
