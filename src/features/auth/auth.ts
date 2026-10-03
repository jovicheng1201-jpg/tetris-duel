import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/database.types";

export async function ensureGuestSession(
  client: SupabaseClient<Database>,
  displayName: string,
  locale: string,
): Promise<string> {
  let { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session) {
    const signIn = await client.auth.signInAnonymously();
    if (signIn.error || !signIn.data.user) throw signIn.error ?? new Error("Guest sign in failed");
    data = { ...data, session: signIn.data.session };
  }
  const userId = data.session?.user.id;
  if (!userId) throw new Error("No authenticated user");

  const profile = await client.rpc("tetris_ensure_profile", {
    p_display_name: displayName.trim().slice(0, 20) || (locale === "zh-TW" ? "玩家" : "Player"),
    p_locale: locale === "zh-TW" ? "zh-TW" : "en",
  });
  if (profile.error) throw profile.error;
  return userId;
}
