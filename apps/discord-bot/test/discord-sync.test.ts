import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  ChannelType,
  DiscordAPIError,
  Client,
  Options,
  type APIGuild,
  type APITextChannel,
  type APIChannel,
  type APIRole,
  type GuildBasedChannel,
  type Role,
} from "discord.js";
import { Effect, Fiber } from "effect";
import { decodeRabbitEventJson } from "@lootlog/protocol/rabbit/events";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { makeDiscordSync } from "../src/bot/discord-sync.service.js";

const guildId = "100000000000000001";

const botId = "100000000000000002";

const roleId = "100000000000000003";

const channelId = "100000000000000004";

const clients: Client[] = [];

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.destroy()));
});

async function fixture(cacheMembers = true) {
  const client = new Client({
    intents: [],
    makeCache: Options.cacheWithLimits({
      GuildMemberManager: cacheMembers ? 200 : 0,
    }),
  });

  clients.push(client);

  const role: Pick<
    APIRole,
    | "id"
    | "name"
    | "color"
    | "position"
    | "permissions"
    | "hoist"
    | "managed"
    | "mentionable"
  > = {
    id: roleId,
    name: "Role",
    color: 0,
    position: 1,
    permissions: "0",
    hoist: false,
    managed: false,
    mentionable: false,
  };

  const user = {
    id: botId,
    username: "Bot",
    discriminator: "0",
    avatar: null,
    bot: true,
  };

  const guild: Pick<
    APIGuild,
    "id" | "name" | "icon" | "owner_id" | "emojis" | "features"
  > & { roles: (typeof role)[] } = {
    id: guildId,
    name: "Guild",
    icon: null,
    owner_id: guildId,
    roles: [{ ...role, id: guildId, name: "@everyone", position: 0 }],
    emojis: [],
    features: [],
  };

  const channel: Pick<
    APITextChannel,
    | "id"
    | "guild_id"
    | "name"
    | "position"
    | "parent_id"
    | "permission_overwrites"
  > &
    Pick<APIChannel, "type"> = {
    id: channelId,
    guild_id: guildId,
    name: "general",
    type: ChannelType.GuildText,
    position: 0,
    parent_id: null,
    permission_overwrites: [],
  };

  let channels = [channel];
  const restCalls: string[] = [];
  let memberFetchError: Error | undefined;
  let channelsGate: Promise<void> | undefined;
  spyOn(client.rest, "get").mockImplementation(async (route) => {
    restCalls.push(String(route));

    if (route === `/guilds/${guildId}/channels` && channelsGate) {
      await channelsGate;
    }

    if (route === `/guilds/${guildId}`) return guild;

    if (route === `/guilds/${guildId}/roles/${roleId}`) return role;

    if (route === `/guilds/${guildId}/roles`) return [guild.roles[0], role];

    if (route === `/guilds/${guildId}/channels`) return channels;

    if (route === `/guilds/${guildId}/members/${botId}`) {
      if (memberFetchError) throw memberFetchError;

      return {
        user,
        roles: [],
        joined_at: "2026-01-01T00:00:00.000Z",
        deaf: false,
        mute: false,
        flags: 0,
      };
    }

    if (route === `/users/${botId}`) return user;
    throw new Error(`Unexpected Discord REST route: ${route}`);
  });
  Object.defineProperty(client, "user", {
    value: await client.users.fetch(botId),
    configurable: true,
  });
  const events: { routingKey: string; payload: unknown }[] = [];

  const sync = makeDiscordSync(
    {
      publish: (_exchange, routingKey, payload) =>
        Effect.sync(() => {
          // Every emitted wire payload must pass the same decoder as the API consumer.
          const key = [
            RabbitRoutingKey.GUILDS_CREATE,
            RabbitRoutingKey.GUILDS_UPDATE,
            RabbitRoutingKey.GUILDS_DELETE,
            RabbitRoutingKey.GUILDS_CREATE_ROLE,
            RabbitRoutingKey.GUILDS_UPDATE_ROLE,
            RabbitRoutingKey.GUILDS_DELETE_ROLE,
            RabbitRoutingKey.DISCORD_GUILD_SYNC_STATE_UPDATED,
            RabbitRoutingKey.DISCORD_GUILD_CHANNEL_UPSERTED,
            RabbitRoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
            RabbitRoutingKey.DISCORD_GUILD_CHANNELS_SYNC_FAILED,
          ].find((value) => value === routingKey);

          if (!key) throw new Error(`Unknown routing key: ${routingKey}`);
          events.push({
            routingKey,
            payload: decodeRabbitEventJson(key, JSON.stringify(payload)),
          });
        }),
    },
    client,
  );

  const fetchGuild = () =>
    client.guilds.fetch({ guild: guildId, force: true, cache: false });

  const sdkGuild = await fetchGuild();

  const fetchChannel = async () => {
    const value = (await sdkGuild.channels.fetch()).get(channelId);

    if (!value) throw new Error("Missing channel");

    return value;
  };

  return {
    client,
    guild,
    role,
    channel,
    sdkGuild,
    sync,
    events,
    fetchGuild,
    fetchChannel,
    removeChannels: () => {
      channels = [];
    },
    restCalls,
    failMemberFetch: (error: Error | undefined) => {
      memberFetchError = error;
    },
    gateChannels: (gate: Promise<void>) => {
      channelsGate = gate;
    },
  };
}

const channelsRoute = `/guilds/${guildId}/channels`;

/**
 * Applies a gateway CHANNEL_UPDATE the way discord.js does: the cached channel
 * is cloned, then patched in place, and the clone is what handlers receive as
 * `oldChannel`.
 */
type GatewayChannelPatch = Partial<Omit<APITextChannel, "type">> &
  Pick<APIChannel, "type">;

const gatewayUpdate = (
  channel: GuildBasedChannel,
  data: GatewayChannelPatch,
) => {
  // SAFETY: `_update` is discord.js's internal Base method used by the
  // ChannelUpdate action; it exists on every cached structure.
  const patchable = channel as GuildBasedChannel & {
    _update: (data: GatewayChannelPatch) => GuildBasedChannel;
  };

  return patchable._update(data);
};

/**
 * Applies a gateway GUILD_ROLE_UPDATE the way discord.js does: handlers receive
 * a clone of the cached role as `oldRole` and the patched role as `newRole`.
 */
const gatewayRoleUpdate = (role: Role, data: Partial<APIRole>) => {
  // SAFETY: `_update` is discord.js's internal Base method used by the
  // GuildRoleUpdate action; it exists on every cached structure.
  const patchable = role as Role & {
    _update: (data: Partial<APIRole>) => Role;
  };

  return patchable._update(data);
};

const missingAccessError = () =>
  new DiscordAPIError(
    { message: "Missing Access", code: 50001 },
    50001,
    403,
    "GET",
    `https://discord.com/api/v10/guilds/${guildId}/members/${botId}`,
    {},
  );

describe("Discord SDK to RabbitMQ contracts", () => {
  test("creates a guild without an icon and includes the SDK default role color", async () => {
    const f = await fixture();
    await Effect.runPromise(f.sync.handleGuildCreate(f.sdkGuild));
    expect(f.events).toContainEqual({
      routingKey: RabbitRoutingKey.GUILDS_CREATE,
      payload: {
        guildId,
        name: "Guild",
        icon: null,
        ownerId: guildId,
        roles: [
          {
            id: guildId,
            name: "@everyone",
            color: 0,
            admin: false,
            position: 0,
          },
          { id: roleId, name: "Role", color: 0, admin: false, position: 1 },
        ],
      },
    });
  });

  test("publishes rename, icon addition/removal and ownership changes", async () => {
    const f = await fixture();

    for (const icon of [null, "a_12345678901234567890123456789012", null]) {
      f.guild.name = "testowankox";
      f.guild.icon = icon;
      f.guild.owner_id = roleId;
      const updated = await f.fetchGuild();
      await Effect.runPromise(f.sync.handleGuildUpdate(f.sdkGuild, updated));
      expect(f.events.at(-1)).toEqual({
        routingKey: RabbitRoutingKey.GUILDS_UPDATE,
        payload: {
          guildId,
          name: "testowankox",
          icon: updated.iconURL(),
          ownerId: roleId,
        },
      });
    }

    await Effect.runPromise(f.sync.handleGuildDelete(f.sdkGuild));
    expect(f.events.slice(-2)).toEqual([
      { routingKey: RabbitRoutingKey.GUILDS_DELETE, payload: { guildId } },
      {
        routingKey: RabbitRoutingKey.DISCORD_GUILD_CHANNELS_SYNC_FAILED,
        payload: expect.objectContaining({ guildId, status: "NOT_FOUND" }),
      },
    ]);
  });

  test("publishes role creation, edits, administrator removal and deletion", async () => {
    const f = await fixture();
    const role = await f.sdkGuild.roles.fetch(roleId);

    if (!role) throw new Error("Missing role");
    await Effect.runPromise(f.sync.handleGuildRoleCreate(role));
    expect(f.events[0]?.payload).toEqual({
      guildId,
      id: roleId,
      name: "Role",
      color: 0,
      position: 1,
      admin: false,
    });

    for (const permissions of ["8", "0"]) {
      const previous = gatewayRoleUpdate(role, {
        ...f.role,
        name: "Updated",
        color: 0xffffff,
        permissions,
      });

      await Effect.runPromise(f.sync.handleGuildRoleUpdate(previous, role));
      expect(f.events.at(-2)?.payload).toEqual({
        guildId,
        id: roleId,
        name: "Updated",
        color: 0xffffff,
        position: 1,
        admin: permissions === "8",
        previousAdmin: permissions !== "8",
      });
    }

    await Effect.runPromise(f.sync.handleGuildRoleDelete(role));
    expect(f.events.at(-2)).toEqual({
      routingKey: RabbitRoutingKey.GUILDS_DELETE_ROLE,
      payload: { guildId, id: roleId },
    });
  });

  test("publishes text/announcement channels with nullable parents and permission state, then deletion", async () => {
    const f = await fixture();
    const original = await f.fetchChannel();
    await Effect.runPromise(f.sync.handleChannelCreate(original));
    expect(f.events.at(-1)?.payload).toEqual(
      expect.objectContaining({
        channel: expect.objectContaining({
          parentId: null,
          channelType: "GuildText",
          canView: false,
          canSend: false,
        }),
      }),
    );
    f.channel.type = ChannelType.GuildAnnouncement;
    f.channel.parent_id = roleId;
    f.channel.name = "announcements";
    f.sdkGuild.channels.cache.delete(channelId);
    f.client.channels.cache.delete(channelId);
    const updated = await f.fetchChannel();
    await Effect.runPromise(f.sync.handleChannelUpdate(original, updated));
    expect(f.events.at(-1)?.payload).toEqual(
      expect.objectContaining({
        channel: expect.objectContaining({
          parentId: roleId,
          channelType: "GuildAnnouncement",
          name: "announcements",
        }),
      }),
    );
    f.removeChannels();
    await Effect.runPromise(f.sync.handleChannelDelete(updated));
    expect(f.events.at(-1)).toEqual({
      routingKey: RabbitRoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
      payload: expect.objectContaining({ guildId, channelId }),
    });
  });

  test("returns a complete channel refresh accepted by the API event contract", async () => {
    const f = await fixture();
    const payload = await Effect.runPromise(f.sync.getGuildChannels(guildId));
    expect(
      decodeRabbitEventJson(
        RabbitRoutingKey.DISCORD_GUILD_CHANNELS_SYNCED,
        JSON.stringify(payload),
      ),
    ).toEqual(
      expect.objectContaining({
        guildId,
        channels: [expect.objectContaining({ channelId, parentId: null })],
        syncState: expect.objectContaining({
          status: "SYNCED",
          channelCount: 1,
        }),
      }),
    );
  });

  test("reports unavailable guilds without inventing channel state", async () => {
    const f = await fixture();
    f.client.guilds.cache.clear();
    spyOn(f.client.rest, "get").mockRejectedValue(
      new DiscordAPIError(
        { message: "Unknown Guild", code: 10004 },
        10004,
        404,
        "GET",
        "https://discord.com/api/v10/guilds/unknown",
        {},
      ),
    );
    const payload = await Effect.runPromise(f.sync.getGuildChannels(guildId));
    expect(
      decodeRabbitEventJson(
        RabbitRoutingKey.DISCORD_GUILD_CHANNELS_SYNCED,
        JSON.stringify(payload),
      ),
    ).toEqual(
      expect.objectContaining({
        guildId,
        channels: [],
        syncState: expect.objectContaining({
          status: "NOT_FOUND",
          lastSuccessAt: null,
        }),
      }),
    );
  });

  test("treats unavailable channel permissions as denied", async () => {
    const f = await fixture(false);
    const channel = await f.fetchChannel();
    expect(channel.permissionsFor(botId)).toBeNull();
    await Effect.runPromise(f.sync.handleChannelCreate(channel));
    expect(f.events.at(-1)?.payload).toEqual(
      expect.objectContaining({
        channel: expect.objectContaining({
          canView: false,
          canSend: false,
          hasRequiredPermissions: false,
          grantedPermissions: [],
        }),
      }),
    );
  });

  test("removes a previously synced channel when its type becomes unsupported", async () => {
    const f = await fixture();
    const original = await f.fetchChannel();
    f.channel.type = ChannelType.GuildVoice;
    f.sdkGuild.channels.cache.delete(channelId);
    f.client.channels.cache.delete(channelId);
    const updated = await f.fetchChannel();
    await Effect.runPromise(f.sync.handleChannelUpdate(original, updated));
    expect(f.events.at(-1)).toEqual({
      routingKey: RabbitRoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
      payload: expect.objectContaining({ guildId, channelId }),
    });
  });

  test("serves gateway channel events from the cache without a REST refetch", async () => {
    const f = await fixture();
    const channel = await f.fetchChannel();
    f.restCalls.length = 0;
    await Effect.runPromise(
      Effect.all(
        Array.from({ length: 5 }, () => f.sync.handleChannelCreate(channel)),
        { concurrency: "unbounded" },
      ),
    );
    await Effect.runPromise(f.sync.handleChannelDelete(channel));
    expect(f.restCalls.filter((route) => route === channelsRoute)).toEqual([]);
    expect(f.events.map((event) => event.routingKey)).toEqual([
      ...Array.from(
        { length: 5 },
        () => RabbitRoutingKey.DISCORD_GUILD_CHANNEL_UPSERTED,
      ),
      RabbitRoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
    ]);
  });

  test("ignores channel updates that do not change the synced projection", async () => {
    const f = await fixture();
    const original = await f.fetchChannel();
    f.sdkGuild.channels.cache.delete(channelId);
    f.client.channels.cache.delete(channelId);
    const sameProjection = await f.fetchChannel();
    await Effect.runPromise(
      f.sync.handleChannelUpdate(original, sameProjection),
    );
    expect(f.events).toEqual([]);
    f.channel.name = "renamed";
    f.sdkGuild.channels.cache.delete(channelId);
    f.client.channels.cache.delete(channelId);
    const renamed = await f.fetchChannel();
    await Effect.runPromise(f.sync.handleChannelUpdate(original, renamed));
    expect(f.events.at(-1)?.payload).toEqual(
      expect.objectContaining({
        channel: expect.objectContaining({ name: "renamed" }),
      }),
    );
  });

  test("publishes a permission overwrite change delivered through the gateway update path", async () => {
    const f = await fixture();
    const channel = await f.fetchChannel();

    // discord.js clones the cached channel and patches it in place on a
    // gateway CHANNEL_UPDATE; the handler receives that clone and the patched
    // channel, so the projection key must see the overwrite change.
    const withOverwrite = {
      ...f.channel,
      permission_overwrites: [{ id: botId, type: 1, allow: "3072", deny: "0" }],
    };

    const old = gatewayUpdate(channel, withOverwrite);

    await Effect.runPromise(f.sync.handleChannelUpdate(old, channel));
    expect(f.events.at(-1)?.payload).toEqual(
      expect.objectContaining({
        channel: expect.objectContaining({ canView: true, canSend: true }),
      }),
    );

    const unchanged = gatewayUpdate(channel, {
      ...withOverwrite,
      topic: "new topic",
    });

    await Effect.runPromise(f.sync.handleChannelUpdate(unchanged, channel));
    expect(f.events).toHaveLength(1);
  });

  test("keeps a coalesced refresh alive when the first caller is interrupted", async () => {
    const f = await fixture();
    let releaseChannels: (() => void) | undefined;

    const gate = new Promise<void>((resolve) => {
      releaseChannels = resolve;
    });

    f.gateChannels(gate);
    const leader = Effect.runFork(f.sync.getGuildChannels(guildId));

    while (!f.restCalls.includes(channelsRoute)) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const follower = Effect.runPromise(f.sync.refreshGuildChannels(guildId));
    await Effect.runPromise(Fiber.interrupt(leader));
    releaseChannels?.();
    await expect(follower).resolves.toEqual(
      expect.objectContaining({ channels: [expect.anything()] }),
    );
  });

  test("reports a failed gateway sync downstream and recovers on the next event", async () => {
    const f = await fixture(false);
    const channel = await f.fetchChannel();
    f.failMemberFetch(missingAccessError());
    await expect(
      Effect.runPromise(f.sync.handleChannelCreate(channel)),
    ).rejects.toThrow();
    expect(f.events.at(-1)).toEqual({
      routingKey: RabbitRoutingKey.DISCORD_GUILD_CHANNELS_SYNC_FAILED,
      payload: expect.objectContaining({
        guildId,
        status: "STALE",
        lastError: expect.stringContaining("Missing Access"),
      }),
    });
    f.failMemberFetch(undefined);
    await Effect.runPromise(f.sync.handleChannelCreate(channel));
    expect(f.events.at(-1)).toEqual({
      routingKey: RabbitRoutingKey.DISCORD_GUILD_CHANNEL_UPSERTED,
      payload: expect.objectContaining({
        syncState: expect.objectContaining({ status: "SYNCED" }),
      }),
    });
  });

  test("coalesces concurrent channel refreshes of one guild into a single REST read", async () => {
    const f = await fixture();
    f.restCalls.length = 0;

    const payloads = await Effect.runPromise(
      Effect.all(
        [
          f.sync.getGuildChannels(guildId),
          f.sync.refreshGuildChannels(guildId),
          f.sync.getGuildChannels(guildId),
        ],
        { concurrency: "unbounded" },
      ),
    );

    expect(f.restCalls.filter((route) => route === channelsRoute)).toEqual([
      channelsRoute,
    ]);
    expect(payloads.map((payload) => payload.channels.length)).toEqual([
      1, 1, 1,
    ]);
    f.restCalls.length = 0;
    await Effect.runPromise(f.sync.refreshGuildChannels(guildId));
    expect(f.restCalls.filter((route) => route === channelsRoute)).toEqual([
      channelsRoute,
    ]);
  });

  test("ignores unsupported channel types", async () => {
    const f = await fixture();
    f.channel.type = ChannelType.GuildVoice;
    const voice = await f.fetchChannel();
    await Effect.runPromise(f.sync.handleChannelCreate(voice));
    await Effect.runPromise(f.sync.handleChannelUpdate(voice, voice));
    await Effect.runPromise(f.sync.handleChannelDelete(voice));
    expect(f.events).toEqual([]);
  });
});
