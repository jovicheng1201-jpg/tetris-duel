import { z } from "zod";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/database.types";
import type { ActivePiece } from "../../game/engine/types";

const ActiveSchema = z.object({
  type: z.enum(["I", "O", "T", "S", "Z", "J", "L"]),
  x: z.number().int(),
  y: z.number().int(),
  rotation: z.number().int().min(0).max(3).transform((rotation) => rotation as ActivePiece["rotation"]),
});
const Common = {
  protocolVersion: z.literal(1),
  roomId: z.string().uuid(),
  matchId: z.string().uuid().nullable(),
  senderUserId: z.string().uuid(),
  seq: z.number().int().nonnegative(),
  sentAt: z.string(),
};
const RoomEventSchema = z.discriminatedUnion("kind", [
  z.object({ ...Common, kind: z.literal("player_joined") }),
  z.object({ ...Common, kind: z.literal("ready"), ready: z.boolean(), seat: z.number().int().min(1).max(2) }),
  z.object({ ...Common, kind: z.literal("start"), seed: z.number().int().nonnegative(), rulesVersion: z.string(), roundNo: z.number().int(), serverStartAt: z.string() }),
  z.object({ ...Common, kind: z.literal("attack"), attackId: z.string().min(1).max(96), lines: z.number().int().min(1).max(8), holes: z.array(z.number().int().min(0).max(9)).min(1).max(8) }),
  z.object({ ...Common, kind: z.literal("snapshot"), rows: z.array(z.number().int().min(0).max(1023)).length(22), active: ActiveSchema.nullable(), hold: z.enum(["I", "O", "T", "S", "Z", "J", "L"]).nullable(), score: z.number().int().nonnegative(), lines: z.number().int().nonnegative(), level: z.number().int().min(1), status: z.enum(["playing", "paused", "game_over"]) }),
  z.object({ ...Common, kind: z.literal("game_over"), reason: z.enum(["top_out", "disconnect"]), score: z.number().int().nonnegative(), lines: z.number().int().nonnegative(), level: z.number().int().min(1), elapsedMs: z.number().int().nonnegative(), attacksSent: z.number().int().nonnegative(), attacksReceived: z.number().int().nonnegative() }),
  z.object({ ...Common, kind: z.literal("rematch"), requestId: z.string().uuid(), action: z.enum(["request", "accept", "decline"]) }),
  z.object({ ...Common, kind: z.literal("sync_request") }),
]);
export type RoomEvent = z.infer<typeof RoomEventSchema>;
export type PresencePlayer = { userId: string; displayName: string; seat: number; state: "lobby" | "playing" | "away" };

export interface RoomRealtimeHandlers {
  onEvent: (event: RoomEvent) => void;
  onPresence: (players: PresencePlayer[]) => void;
  onStatus: (status: string) => void;
  onInvalidMessage?: () => void;
}

export class RoomRealtime {
  private readonly channel: RealtimeChannel;
  private sequence = 0;
  private disposed = false;

  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly roomId: string,
    private readonly userId: string,
    private readonly displayName: string,
    private readonly seat: number,
    private readonly handlers: RoomRealtimeHandlers,
  ) {
    const sessionKey = userId + ":" + crypto.randomUUID();
    this.channel = client.channel("tetris-room:" + roomId, {
      config: {
        private: true,
        broadcast: { self: false, ack: true },
        presence: { key: sessionKey },
      },
    });
    this.channel
      .on("broadcast", { event: "tetris_event" }, (message) => this.onBroadcast(message.payload))
      .on("presence", { event: "sync" }, () => this.publishPresence())
      .on("presence", { event: "join" }, () => this.publishPresence())
      .on("presence", { event: "leave" }, () => this.publishPresence());
  }

  async subscribe(): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("Realtime subscription timed out"));
        }
      }, 12000);
      this.channel.subscribe(async (status, error) => {
        this.handlers.onStatus(status);
        if (status === "SUBSCRIBED" && !settled) {
          const tracked = await this.channel.track({
            userId: this.userId,
            displayName: this.displayName,
            seat: this.seat,
            state: "lobby",
          });
          if (tracked === "ok") {
            settled = true;
            window.clearTimeout(timeout);
            resolve();
            this.publishPresence();
          } else {
            settled = true;
            window.clearTimeout(timeout);
            reject(new Error("Could not publish room presence"));
          }
        } else if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") && !settled) {
          settled = true;
          window.clearTimeout(timeout);
          reject(error ?? new Error("Realtime channel unavailable"));
        }
      });
    });
  }

  async send(
    kind: RoomEvent["kind"],
    matchId: string | null,
    fields: Record<string, unknown> = {},
  ): Promise<void> {
    if (this.disposed) return;
    this.sequence += 1;
    const payload = {
      ...fields,
      kind,
      protocolVersion: 1,
      roomId: this.roomId,
      matchId,
      senderUserId: this.userId,
      seq: this.sequence,
      sentAt: new Date().toISOString(),
    };
    const parsed = RoomEventSchema.safeParse(payload);
    if (!parsed.success) throw new Error("Invalid outgoing realtime event");
    const status = this.channel.state === "joined"
      ? await this.channel.send({ type: "broadcast", event: "tetris_event", payload: parsed.data })
      : (await this.channel.httpSend("tetris_event", parsed.data)).success ? "ok" : "error";
    if (status !== "ok") throw new Error("Realtime event was not accepted");
  }

  async setPresenceState(state: PresencePlayer["state"]): Promise<void> {
    if (this.disposed) return;
    await this.channel.track({
      userId: this.userId,
      displayName: this.displayName,
      seat: this.seat,
      state,
    });
  }

  async close(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    await this.channel.untrack();
    await this.client.removeChannel(this.channel);
  }

  private onBroadcast(payload: unknown): void {
    const parsed = RoomEventSchema.safeParse(payload);
    if (!parsed.success || parsed.data.roomId !== this.roomId || parsed.data.senderUserId === this.userId) {
      this.handlers.onInvalidMessage?.();
      return;
    }
    this.handlers.onEvent(parsed.data);
  }

  private publishPresence(): void {
    const state = this.channel.presenceState<Record<string, unknown>>();
    const players = new Map<string, PresencePlayer>();
    for (const entries of Object.values(state)) {
      for (const raw of entries) {
        if (typeof raw.userId !== "string" || typeof raw.displayName !== "string") continue;
        const seat = Number(raw.seat);
        if (seat !== 1 && seat !== 2) continue;
        const presenceState = raw.state === "away" || raw.state === "playing" ? raw.state : "lobby";
        players.set(raw.userId, {
          userId: raw.userId,
          displayName: raw.displayName.slice(0, 20),
          seat,
          state: presenceState,
        });
      }
    }
    this.handlers.onPresence([...players.values()]);
  }
}
