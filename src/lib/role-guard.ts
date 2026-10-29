import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** Client-side gate: requires a session AND the given role. Data is also protected by row-level rules. */
export async function requireRole(role: "patient" | "facility") {
  const { data } = await supabase.auth.getUser();
  const login = role === "patient" ? "/patient-login" : "/facility-login";
  if (!data.user) throw redirect({ to: login });
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
  if (!roles?.some((r) => r.role === role)) throw redirect({ to: "/" });
}

export async function signOut(queryClient: { clear: () => void; cancelQueries: () => Promise<void> }) {
  await queryClient.cancelQueries();
  queryClient.clear();
  await supabase.auth.signOut();
}
