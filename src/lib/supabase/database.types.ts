export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      tetris_player: { Row: { user_id: string; display_name: string; avatar_key: string | null; locale: string; created_at: string; updated_at: string }; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      tetris_room: { Row: { id: string; room_code: string; host_user_id: string; status: string; rules_version: string; settings: Json; created_at: string; updated_at: string; expires_at: string }; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      tetris_room_member: { Row: { room_id: string; user_id: string; seat: number; is_ready: boolean; rematch_ready: boolean; joined_at: string; left_at: string | null; last_heartbeat_at: string | null }; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      tetris_match: { Row: { id: string; room_id: string | null; mode: string; round_no: number; status: string; seed: number; rules_version: string; player1_user_id: string | null; player2_user_id: string | null; winner_user_id: string | null; finish_reason: string | null; created_at: string; started_at: string | null; finished_at: string | null }; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      tetris_match_result: { Row: { match_id: string; user_id: string; seat: number | null; score: number; lines_cleared: number; final_level: number; elapsed_ms: number; attacks_sent: number; attacks_received: number; outcome: string; verification_status: string; submitted_at: string }; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      tetris_score: { Row: { user_id: string; mode: string; season_key: string; best_score: number; total_score: number; matches_played: number; wins: number; losses: number; draws: number; rating: number; updated_at: string }; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      tetris_ensure_profile: { Args: { p_display_name: string; p_locale: string }; Returns: Json };
      tetris_create_room: { Args: { p_settings: Json }; Returns: Json };
      tetris_join_room: { Args: { p_room_code: string }; Returns: Json };
      tetris_set_ready: { Args: { p_room_id: string; p_ready: boolean }; Returns: Json };
      tetris_start_match: { Args: { p_room_id: string }; Returns: Json };
      tetris_get_room_state: { Args: { p_room_id: string }; Returns: Json };
      tetris_leave_room: { Args: { p_room_id: string }; Returns: Json };
      tetris_mark_presence_heartbeat: { Args: { p_room_id: string }; Returns: Json };
      tetris_request_rematch: { Args: { p_room_id: string; p_match_id: string }; Returns: Json };
      tetris_create_local_match: { Args: { p_mode: string; p_rules_version: string; p_seed: number }; Returns: string };
      tetris_submit_match_result: { Args: { p_match_id: string; p_result: Json }; Returns: Json };
      tetris_get_leaderboard: { Args: { p_mode: string; p_limit: number }; Returns: Json };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
