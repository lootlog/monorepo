import { Effect, Schema } from "effect";
import type { DiscordGuildMemberClient } from "./discord-guild-member.client.js";
import type { DiscordUserGuildsClient } from "./discord-user-guilds.client.js";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class DiscordOperationFailure extends Schema.TaggedError<DiscordOperationFailure>()(
  "DiscordOperationFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeDiscordOperations = (
  userGuilds: DiscordUserGuildsClient,
  guildMember: DiscordGuildMemberClient,
) => {
  const adapter = <A>(operation: string, run: () => Promise<A>) =>
    Effect.tryPromise({
      try: run,
      catch: (cause) => new DiscordOperationFailure({ operation, cause }),
    }).pipe(
      Effect.withSpan(operation, {
        attributes: { adapter: "discord", retryCount: 0 },
      }),
    );
  return {
    getUserGuilds: (userId: string, discordId: string) =>
      adapter("discord.userGuilds", () =>
        userGuilds.getUserGuilds(userId, discordId),
      ),
    getFreshCompleteUserGuilds: (userId: string, discordId: string) =>
      adapter("discord.userGuilds.fresh", () =>
        userGuilds.getFreshCompleteUserGuilds(userId, discordId),
      ),
    clearUserGuildIdsCache: (options: {
      readonly userId: string;
      readonly discordId: string;
    }) =>
      adapter("discord.userGuilds.cache.clear", () =>
        userGuilds.clearUserGuildIdsCache(options),
      ),
    getGuildMember: (options: {
      readonly guildId: string;
      readonly userId: string;
      readonly discordId: string;
    }) =>
      adapter("discord.guildMember", () => guildMember.getGuildMember(options)),
    clearGuildMemberDataCache: (options: {
      readonly guildId: string;
      readonly userId: string;
      readonly discordId: string;
    }) =>
      adapter("discord.guildMember.cache.clear", () =>
        guildMember.clearGuildMemberDataCache(options),
      ),
  };
};

export type DiscordOperations = ReturnType<typeof makeDiscordOperations>;
