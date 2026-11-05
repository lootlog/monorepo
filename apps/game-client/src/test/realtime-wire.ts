import type { RealtimeWebSocket } from "@lootlog/client/realtime";
import type { BasicPresence, RealtimeFrame } from "@lootlog/protocol/realtime";
import {
  decodeRealtimeFrame,
  encodeRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";
import {
  createAccessPolicySnapshot,
  type AccessPolicySnapshot,
} from "@lootlog/protocol/realtime/access-policy";

/** A policy owning every listed Lootlog, so no permission restricts the test. */
export const ownerAccessPolicy = (
  organizationIds: readonly string[],
): AccessPolicySnapshot =>
  createAccessPolicySnapshot(
    organizationIds.map((id) => ({
      guild: { id, ownerId: "owner" },
      roles: [],
    })),
    "owner",
  );

/** The presence the gateway answers a `presence.publish` with. */
export const publishedPresence = (sessionId: string): BasicPresence => ({
  userId: "user-1",
  sessionId,
  organizationIds: ["guild-1"],
  platform: "game",
  status: "online",
  confidence: "reported",
  isAfk: false,
  lastSeen: 1,
});

type WireEvent = Parameters<RealtimeWebSocket["addEventListener"]>[0];

type WireListener = Parameters<RealtimeWebSocket["addEventListener"]>[1];

export class RealtimeWire implements RealtimeWebSocket {
  readyState = 0;
  readonly frames: ReturnType<typeof decodeRealtimeFrame>[] = [];
  private readonly listeners = new Map<WireEvent, WireListener>();

  addEventListener(type: WireEvent, listener: WireListener): void {
    this.listeners.set(type, listener);
  }

  send(data: string): void {
    this.frames.push(decodeRealtimeFrame(data));
  }

  receive(frame: RealtimeFrame): void {
    this.receiveText(encodeRealtimeFrame(frame));
  }

  receiveText(data: string): void {
    this.listeners.get("message")?.({ data });
  }

  open(): void {
    this.readyState = 1;
    this.listeners.get("open")?.({});
  }

  close(): void {
    this.readyState = 3;
    this.listeners.get("close")?.({});
  }
}
