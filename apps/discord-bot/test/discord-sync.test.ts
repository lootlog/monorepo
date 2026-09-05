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
} from "discord.js";
import { Effect } from "effect";
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
  spyOn(client.rest, "get").mockImplementation(async (route) => {
    if (route === `/guilds/${guildId}`) return guild;
    if (route === `/guilds/${guildId}/roles/${roleId}`) return role;
    if (route === `/guilds/${guildId}/roles`) return [guild.roles[0], role];
    if (route === `/guilds/${guildId}/channels`) return channels;
    if (route === `/guilds/${guildId}/members/${botId}`)
      return {
        user,
        roles: [],
        joined_at: "2026-01-01T00:00:00.000Z",
        deaf: false,
        mute: false,
        flags: 0,
      };
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
  };
}

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
    let previous = await f.sdkGuild.roles.fetch(roleId);
    if (!previous) throw new Error("Missing role");
    await Effect.runPromise(f.sync.handleGuildRoleCreate(previous));
    expect(f.events[0]?.payload).toEqual({
      guildId,
      id: roleId,
      name: "Role",
      color: 0,
      position: 1,
      admin: false,
    });
    for (const permissions of ["8", "0"]) {
      f.role.permissions = permissions;
      f.role.name = "Updated";
      f.role.color = 0xffffff;
      const updated = await f.sdkGuild.roles.fetch(roleId, { force: true });
      if (!updated) throw new Error("Missing role");
      await Effect.runPromise(f.sync.handleGuildRoleUpdate(previous, updated));
      expect(f.events.at(-2)?.payload).toEqual({
        guildId,
        id: roleId,
        name: "Updated",
        color: 0xffffff,
        position: 1,
        admin: permissions === "8",
      });
      previous = updated;
    }
    await Effect.runPromise(f.sync.handleGuildRoleDelete(previous));
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
