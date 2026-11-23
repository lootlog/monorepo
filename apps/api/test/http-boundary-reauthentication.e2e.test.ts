import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import type { ApiDatabaseValue } from "../src/database/drizzle/database.js";
import type { RedisService } from "#src/redis/redis.service";
import { Schema } from "effect";
import { eq } from "drizzle-orm";
import { ReauthenticationRequired } from "@lootlog/protocol/http/errors";
import { memberTable } from "../src/database/drizzle/organization.schema.js";
import {
  authorizedGuildId,
  caller,
  makeHttpBoundaryFixture,
  world,
} from "./http-boundary-fixtures.js";

const fixture = makeHttpBoundaryFixture();

const {
  request,
  databaseRuntime,
  answerAuthService,
  issueRevokedDiscordToken,
} = fixture;

let database: ApiDatabaseValue;

let redis: RedisService;

describe("API HTTP boundary reauthentication", () => {
  beforeAll(async () => {
    ({ database, redis } = await fixture.connect());
  });

  beforeEach(fixture.reset);

  afterAll(fixture.close);

  it.each([
    {
      code: "DISCORD_UNAUTHORIZED",
      reason: "Discord rejected their token",
      arrange: () => issueRevokedDiscordToken(redis, caller),
    },
    {
      code: "TOKEN_EXPIRED",
      reason: "their Discord token expired",
      arrange: () => {
        answerAuthService(() =>
          Response.json({ code: "TOKEN_EXPIRED" }, { status: 401 }),
        );
      },
    },
  ])(
    "asks the caller to sign in again when $reason",
    async ({ code, arrange }) => {
      await databaseRuntime.runPromise(
        database
          .update(memberTable)
          .set({
            lastDiscordSyncAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          })
          .where(eq(memberTable.guildId, authorizedGuildId)),
      );
      await arrange();

      for (const path of [
        "/members/@me",
        "/events",
        `/timers/missing-timer/history?world=${world}`,
      ]) {
        const response = await request(`/guilds/${authorizedGuildId}${path}`);

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual(
          Schema.encodeSync(ReauthenticationRequired)(
            new ReauthenticationRequired({ code, requiresReauth: true }),
          ),
        );
      }
    },
  );

  it("keeps an admin signed in when another member's Discord authorization fails", async () => {
    const other = { userId: "user-2", discordId: "discord-2" };

    await databaseRuntime.runPromise(
      database.insert(memberTable).values({
        userId: other.discordId,
        globalUserId: other.userId,
        guildId: authorizedGuildId,
        name: "Member with expired Discord authorization",
        lastDiscordSyncAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      }),
    );
    await issueRevokedDiscordToken(redis, other);

    const response = await request(
      `/guilds/${authorizedGuildId}/members/${other.discordId}/refresh`,
      { method: "POST" },
    );

    expect(response.status).not.toBe(401);
    expect(response.status).toBeLessThan(500);
  });
});
