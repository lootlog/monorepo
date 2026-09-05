import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RealtimeClient,
  type BasicPresence,
  type ServerEvent,
} from "@lootlog/client/realtime";
import { GatewayEvent } from "@/config/gateway";
import { GatewayClient } from "./gateway-client";

const presence: BasicPresence = {
  userId: "internal-user",
  discordId: "discord-member",
  sessionId: "session-1",
  organizationIds: ["organization-1"],
  platform: "web-app",
  status: "online",
  confidence: "reported",
  isAfk: false,
  lastSeen: 1,
};

afterEach(() => vi.restoreAllMocks());

describe("gateway presence identity", () => {
  it("keys fetched web and game presence by Discord identity", async () => {
    vi.spyOn(RealtimeClient.prototype, "request").mockResolvedValue({
      presences: [
        presence,
        {
          ...presence,
          platform: "game",
          character: {
            world: "alpha",
            name: "Hero",
            lvl: 100,
            icon: "hero.gif",
            characterId: "10",
            accountId: "20",
            prof: "w",
          },
        },
      ],
    });
    const client = new GatewayClient();
    for (const [event, field] of [
      [GatewayEvent.MEMBER_WEB_PRESENCE_FETCH, "sessions"],
      [GatewayEvent.EVENT_PRESENCE_FETCH, "players"],
    ] as const) {
      const acknowledgement = vi.fn();
      client.emit(event, { guildId: "organization-1" }, acknowledgement);
      await vi.waitFor(() => expect(acknowledgement).toHaveBeenCalled());
      expect(acknowledgement.mock.calls[0]?.[0]).toEqual({
        status: "success",
        [field]: {
          "discord-member": [
            expect.objectContaining({ sessionId: "session-1" }),
          ],
        },
      });
    }
  });

  it("preserves Discord identity through snapshot, upsert and removal", () => {
    const subscribe = vi.spyOn(RealtimeClient.prototype, "subscribe");
    const client = new GatewayClient();
    const deliver = subscribe.mock.calls[0]?.[0];
    const webUpdates = vi.fn();
    const gameUpdates = vi.fn();
    client.on(GatewayEvent.MEMBER_WEB_PRESENCE_UPDATE, webUpdates);
    client.on(GatewayEvent.EVENT_PRESENCE_UPDATE, gameUpdates);
    const events: ServerEvent[] = [
      {
        v: 1,
        type: "presence.snapshot",
        data: {
          organizationId: "organization-1",
          revision: 1,
          presences: [presence],
        },
      },
      {
        v: 1,
        type: "presence.delta",
        data: {
          organizationId: "organization-1",
          revision: 1,
          changes: [
            { action: "upsert", presence: { ...presence, platform: "game" } },
          ],
        },
      },
      {
        v: 1,
        type: "presence.delta",
        data: {
          organizationId: "organization-1",
          revision: 1,
          changes: [
            {
              action: "remove",
              userId: presence.userId,
              discordId: presence.discordId,
              sessionId: presence.sessionId,
            },
          ],
        },
      },
    ];
    for (const event of events) deliver?.(event);
    for (const updates of [webUpdates, gameUpdates]) {
      expect(updates).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          discordId: "discord-member",
          status: "online",
        }),
      );
      expect(updates).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          discordId: "discord-member",
          status: "offline",
        }),
      );
    }
  });
});
