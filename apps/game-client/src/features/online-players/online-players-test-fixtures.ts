import { vi } from "vitest";
import type {
  PresenceWithLocation,
  ServerEvent,
} from "@lootlog/protocol/realtime";
import { createRealtimeTest } from "@/test/realtime-test";

export type PresenceSnapshotData = Extract<
  ServerEvent,
  { type: "presence.snapshot" }
>["data"];
export const createOnlinePresence = (
  overrides: Partial<PresenceWithLocation> = {},
): PresenceWithLocation => ({
  userId: "user-1",
  discordId: "discord-1",
  sessionId: "session-1",
  organizationIds: ["guild-1"],
  platform: "game",
  status: "online",
  confidence: "reported",
  isAfk: false,
  lastSeen: Date.parse("2026-09-01T00:00:00.000Z"),
  character: {
    world: "alpha",
    name: "Hero",
    lvl: 123,
    icon: "hero.png",
    characterId: "10",
    accountId: "20",
    prof: "w",
    clan: { id: 15191, name: "Karhu", rank: 100 },
  },
  location: { map: "Karka-han", x: 1, y: 2 },
  ...overrides,
});
export const createPresenceSnapshot = (
  presences: PresenceSnapshotData["presences"] = [createOnlinePresence()],
): PresenceSnapshotData => ({
  organizationId: "guild-1",
  world: "alpha",
  revision: 1,
  presences,
});
export const createOnlinePlayersTest = () => {
  const realtime = createRealtimeTest();
  const fetchPresence = vi
    .fn<
      (organizationId: string, world?: string) => Promise<PresenceSnapshotData>
    >()
    .mockResolvedValue(createPresenceSnapshot());
  const send = realtime.wire.send.bind(realtime.wire);
  vi.spyOn(realtime.wire, "send").mockImplementation((data) => {
    send(data);
    const request = realtime.wire.frames.at(-1);
    if (
      !request ||
      !("type" in request) ||
      request.type !== "presence.fetch" ||
      !request.requestId
    )
      return;
    const requestId = request.requestId;
    void fetchPresence(request.data.organizationId, request.data.world).then(
      (response) =>
        realtime.wire.receive({
          v: 1,
          requestId,
          status: "success",
          data: response,
        }),
      () =>
        realtime.wire.receive({
          v: 1,
          requestId,
          status: "error",
          error: {
            code: "COMMAND_REJECTED",
            message: "organization access denied",
            retryable: false,
          },
        }),
    );
  });
  return { ...realtime, fetchPresence };
};
