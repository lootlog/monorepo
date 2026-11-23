import {
  OperationError,
  withAdapterSpan,
} from "@lootlog/instrumentation/operation";
import { ApplicationError } from "@lootlog/protocol/http/errors";
import { Effect } from "effect";
import type { DiscordGuildMemberClient } from "./discord-guild-member.client.js";
import type { DiscordUserGuildsClient } from "./discord-user-guilds.client.js";

export const makeDiscordOperations = (
  userGuilds: DiscordUserGuildsClient,
  guildMember: DiscordGuildMemberClient,
) => {
  const adapter = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError((cause) =>
        cause instanceof ApplicationError
          ? cause
          : new OperationError({ operation, cause }),
      ),
      withAdapterSpan(operation, "discord"),
    );

  return {
    getUserGuilds: (userId: string, discordId: string) =>
      adapter(
        "discord.userGuilds",
        userGuilds.getUserGuilds(userId, discordId),
      ),
    getFreshCompleteUserGuilds: (userId: string, discordId: string) =>
      adapter(
        "discord.userGuilds.fresh",
        userGuilds.getFreshCompleteUserGuilds(userId, discordId),
      ),
    getCachedCompleteUserGuilds: (userId: string, discordId: string) =>
      adapter(
        "discord.userGuilds.cached",
        userGuilds.getCachedCompleteUserGuilds(userId, discordId),
      ),
    clearUserGuildIdsCache: (options: {
      readonly userId: string;
      readonly discordId: string;
    }) =>
      adapter(
        "discord.userGuilds.cache.clear",
        userGuilds.clearUserGuildIdsCache(options),
      ),
    getGuildMember: (options: {
      readonly guildId: string;
      readonly userId: string;
      readonly discordId: string;
    }) => adapter("discord.guildMember", guildMember.getGuildMember(options)),
    isGuildMemberRefused: (options: {
      readonly guildId: string;
      readonly userId: string;
      readonly discordId: string;
    }) =>
      adapter(
        "discord.guildMember.refused",
        guildMember.isGuildMemberRefused(options),
      ),
    clearGuildMemberCache: (options: {
      readonly guildId: string;
      readonly userId: string;
      readonly discordId: string;
    }) =>
      adapter(
        "discord.guildMember.cache.clear",
        guildMember.clearGuildMemberCache(options),
      ),
  };
};

export type DiscordOperations = ReturnType<typeof makeDiscordOperations>;
