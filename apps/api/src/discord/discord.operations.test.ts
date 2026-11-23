import { describe, expect, test } from "bun:test";
import { AuthenticationRequiredError } from "@lootlog/protocol/http/errors";
import { Effect, Exit } from "effect";
import type { DiscordGuildMemberClient } from "./discord-guild-member.client.js";
import type { DiscordUserGuildsClient } from "./discord-user-guilds.client.js";
import { makeDiscordOperations } from "./discord.operations.js";

const userGuildsFailingWith = (
  error: AuthenticationRequiredError,
): DiscordUserGuildsClient => ({
  getUserGuilds: () => Effect.fail(error),
  getFreshCompleteUserGuilds: () => Effect.die("unused"),
  getCachedCompleteUserGuilds: () => Effect.die("unused"),
  clearUserGuildIdsCache: () => Effect.die("unused"),
});

const unusedGuildMember: DiscordGuildMemberClient = {
  getGuildMember: () => Effect.die("unused"),
  isGuildMemberRefused: () => Effect.die("unused"),
  clearGuildMemberCache: () => Effect.die("unused"),
};

const failureOf = async (client: DiscordUserGuildsClient) => {
  const exit = await Effect.runPromiseExit(
    makeDiscordOperations(client, unusedGuildMember).getUserGuilds(
      "user-1",
      "discord-1",
    ),
  );

  if (!Exit.isFailure(exit)) throw new Error("expected a failure");

  return exit.cause.reasons[0]?._tag === "Fail"
    ? exit.cause.reasons[0].error
    : undefined;
};

describe("Discord operations", () => {
  test("keeps a rejected Discord token a 401 application error instead of an opaque 500", async () => {
    const rejected = new AuthenticationRequiredError({
      code: "DISCORD_UNAUTHORIZED",
    });

    expect(await failureOf(userGuildsFailingWith(rejected))).toBe(rejected);
  });
});
