import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** Client-side gate: requires a session AND the given role. Data is also protected by row-level rules. */
export async function requireRole(role: "patient" | "facility") {
  const { data } = await supabase.auth.getUser();
  const login = role === "patient" ? "/patient-login" : "/facility-login";
  if (!data.user) throw redirect({ to: login });
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
  if (!roles?.some((r) => r.role === role)) throw redirect({ to: "/" });
  if (role === 'facility') localStorage.setItem('medicare-facility-session', data.user.id);
}

export async function signOut(queryClient: { clear: () => void; cancelQueries: () => Promise<void> }) {
  await queryClient.cancelQueries();
  queryClient.clear();
  localStorage.removeItem('medicare-facility-session');
  localStorage.removeItem('medicare-manual-offline');
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('medicare-network:')) localStorage.removeItem(key);
  }
  await supabase.auth.signOut();
}
