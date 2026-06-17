import { ActivitySource } from "src/gateway/enums/activity-source.enum";
import { ActivityType } from "src/gateway/enums/activity-type.enum";
import { Platform } from "src/gateway/enums/platform.enum";
import { RoutingKey } from "src/gateway/enums/routing-key.enum";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import type { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import type { Socket } from "src/gateway/types/socket-user.type";
import type { UserGuildData } from "src/guilds/types/guild.types";
import { ActivityService } from "./activity.service";

const createGuild = (guildId: string): UserGuildData =>
  ({
    guild: {
      id: guildId,
    },
    roles: [],
  }) as UserGuildData;

const createClient = (overrides: Partial<Socket["data"]>): Socket =>
  ({
    data: {
      discordId: "discord-1",
      userId: "user-1",
      sessionId: "session-1",
      platform: Platform.WEB_APP,
      ...overrides,
    },
    request: {
      headers: {
        "user-agent": "Vitest",
      },
    },
  }) as Socket;

const createPlayer = (): NonNullable<Socket["data"]["player"]> => ({
  world: "alpha",
  name: "Hero",
  characterId: "10",
  accountId: "20",
  icon: "icon.gif",
  lvl: "100",
  prof: "w",
  location: {
    x: 1,
    y: 2,
    map: "Karka-han",
  },
  clan: {
    id: 123,
    name: "Clan",
    rank: 1,
  },
});

describe("ActivityService", () => {
  const publish = vi.fn();
  let service: ActivityService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ActivityService({ publish } as unknown as AmqpConnection);
  });

  it("publishes web connect activity without player data", async () => {
    const client = createClient({ platform: Platform.WEB_APP });

    await service.publishActivityEvent(ActivityType.CONNECT_EVENT, client, [
      createGuild("guild-1"),
    ]);

    expect(publish).toHaveBeenCalledWith(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.ACTIVITY_LOG_CREATE,
      expect.objectContaining({
        userId: "user-1",
        guildId: "guild-1",
        discordId: "discord-1",
        type: ActivityType.CONNECT_EVENT,
        source: ActivitySource.WEB_APP,
        details: {
          sessionId: "session-1",
          userAgent: "Vitest",
        },
        actorSnapshot: undefined,
        world: undefined,
      }),
    );
  });

  it("publishes web disconnect activity without player data", async () => {
    const client = createClient({ platform: Platform.WEB_APP });

    await service.publishActivityEvent(ActivityType.DISCONNECT_EVENT, client, [
      createGuild("guild-1"),
    ]);

    expect(publish).toHaveBeenCalledWith(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.ACTIVITY_LOG_CREATE,
      expect.objectContaining({
        type: ActivityType.DISCONNECT_EVENT,
        source: ActivitySource.WEB_APP,
        actorSnapshot: undefined,
        world: undefined,
      }),
    );
  });

  it("publishes game activity with actor snapshot", async () => {
    const client = createClient({
      platform: Platform.GAME,
      player: createPlayer(),
    });

    await service.publishActivityEvent(ActivityType.CONNECT_EVENT, client, [
      createGuild("guild-1"),
    ]);

    expect(publish).toHaveBeenCalledWith(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.ACTIVITY_LOG_CREATE,
      expect.objectContaining({
        source: ActivitySource.GAME,
        world: "alpha",
        actorSnapshot: {
          accountId: 20,
          characterId: 10,
          clanName: "Clan",
          name: "Hero",
          clanId: 123,
          icon: "icon.gif",
          lvl: 100,
          prof: "w",
        },
      }),
    );
  });

  it("does not publish game activity without player data", async () => {
    const client = createClient({ platform: Platform.GAME });

    await service.publishActivityEvent(ActivityType.CONNECT_EVENT, client, [
      createGuild("guild-1"),
    ]);

    expect(publish).not.toHaveBeenCalled();
  });
});
