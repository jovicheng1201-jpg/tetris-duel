import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/database.types";

const EntrySchema = z.object({
  rank: z.number().int(),
  user_id: z.string().uuid(),
  display_name: z.string(),
  best_score: z.number(),
  wins: z.number(),
  rating: z.number(),
});
export type LeaderboardEntry = z.infer<typeof EntrySchema>;

export async function loadLeaderboard(
  client: SupabaseClient<Database>,
  mode: "solo" | "ai" | "online_pvp",
): Promise<LeaderboardEntry[]> {
  const { data, error } = await client.rpc("tetris_get_leaderboard", { p_mode: mode, p_limit: 50 });
  if (error) throw error;
  const parsed = z.array(EntrySchema).safeParse(data);
  if (!parsed.success) throw new Error("Invalid leaderboard response");
  return parsed.data;
}
