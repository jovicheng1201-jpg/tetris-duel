import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../../lib/supabase/database.types";
import { ensureGuestSession } from "../auth/auth";

const RoomMemberSchema = z.object({
  user_id: z.string().uuid(),
  display_name: z.string(),
  seat: z.number().int().min(1).max(2),
  is_ready: z.boolean(),
  rematch_ready: z.boolean().optional(),
  left_at: z.string().nullable().optional(),
});
const MatchSchema = z.object({
  id: z.string().uuid(),
  mode: z.string(),
  status: z.string(),
  seed: z.number(),
  round_no: z.number().int(),
  rules_version: z.string(),
  started_at: z.string().nullable().optional(),
});
const StartMatchSchema = z.object({
  match_id: z.string().uuid(),
  seed: z.number().int().nonnegative(),
  round_no: z.number().int().positive(),
  rules_version: z.string(),
  server_start_at: z.string(),
});
export const RoomStateSchema = z.object({
  id: z.string().uuid(),
  room_code: z.string(),
  host_user_id: z.string().uuid(),
  status: z.string(),
  members: z.array(RoomMemberSchema),
  match: MatchSchema.nullable().optional(),
});
export type RoomState = z.infer<typeof RoomStateSchema>;
export type RoomMember = z.infer<typeof RoomMemberSchema>;

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("Empty response");
  return data;
}

export async function createRoom(
  client: SupabaseClient<Database>,
  displayName: string,
  locale: string,
): Promise<{ roomId: string; roomCode: string }> {
  await ensureGuestSession(client, displayName, locale);
  const result = await client.rpc("tetris_create_room", { p_settings: { rulesVersion: "1.0" } as Json });
  const data = requireData(result.data as { room_id: string; room_code: string } | null, result.error);
  return { roomId: data.room_id, roomCode: data.room_code };
}

export async function joinRoom(
  client: SupabaseClient<Database>,
  roomCode: string,
  displayName: string,
  locale: string,
): Promise<{ roomId: string; roomCode: string }> {
  await ensureGuestSession(client, displayName, locale);
  const normalized = roomCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!/^[A-F0-9]{10}$/.test(normalized)) throw new Error("ROOM_CODE_INVALID");
  const result = await client.rpc("tetris_join_room", { p_room_code: normalized });
  const data = requireData(result.data as { room_id: string; room_code: string } | null, result.error);
  return { roomId: data.room_id, roomCode: data.room_code };
}

export async function loadRoomState(
  client: SupabaseClient<Database>,
  roomId: string,
): Promise<RoomState> {
  const result = await client.rpc("tetris_get_room_state", { p_room_id: roomId });
  const data = requireData(result.data as unknown, result.error);
  return RoomStateSchema.parse(data);
}

export async function setReady(
  client: SupabaseClient<Database>,
  roomId: string,
  ready: boolean,
): Promise<void> {
  const result = await client.rpc("tetris_set_ready", { p_room_id: roomId, p_ready: ready });
  if (result.error) throw result.error;
}

export async function startMatch(client: SupabaseClient<Database>, roomId: string) {
  const result = await client.rpc("tetris_start_match", { p_room_id: roomId });
  const data = requireData(result.data as unknown, result.error);
  return StartMatchSchema.parse(data);
}

export async function leaveRoom(client: SupabaseClient<Database>, roomId: string): Promise<void> {
  const result = await client.rpc("tetris_leave_room", { p_room_id: roomId });
  if (result.error) throw result.error;
}

export async function requestRematch(
  client: SupabaseClient<Database>,
  roomId: string,
  matchId: string,
): Promise<void> {
  const result = await client.rpc("tetris_request_rematch", { p_room_id: roomId, p_match_id: matchId });
  if (result.error) throw result.error;
}

export async function createLocalMatch(
  client: SupabaseClient<Database>,
  mode: "solo" | "ai",
  seed: number,
): Promise<string> {
  const result = await client.rpc("tetris_create_local_match", {
    p_mode: mode,
    p_rules_version: "1.0",
    p_seed: seed,
  });
  return requireData(result.data as string | null, result.error);
}

export async function submitMatchResult(
  client: SupabaseClient<Database>,
  matchId: string,
  result: Record<string, string | number>,
): Promise<void> {
  const response = await client.rpc("tetris_submit_match_result", {
    p_match_id: matchId,
    p_result: result as Json,
  });
  if (response.error) throw response.error;
}
