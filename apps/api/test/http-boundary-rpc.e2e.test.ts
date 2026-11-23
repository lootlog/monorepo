import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { TEST_RPC_TOKEN } from "@lootlog/rpc/testing";
import { and, eq } from "drizzle-orm";
import { Effect, Redacted } from "effect";
import type { ApiDatabaseValue } from "../src/database/drizzle/database.js";
import { memberTable } from "../src/database/drizzle/organization.schema.js";
import {
  authorizedGuildId,
  caller,
  forbiddenGuildId,
  makeHttpBoundaryFixture,
  world,
} from "./http-boundary-fixtures.js";

const fixture = makeHttpBoundaryFixture();

const { request, callRpc, callOperatorRpc, requestRpcPort, databaseRuntime } =
  fixture;

let database: ApiDatabaseValue;

describe("API RPC boundary", () => {
  beforeAll(async () => {
    ({ database } = await fixture.connect());
  });

  beforeEach(fixture.reset);

  afterAll(fixture.close);

  it("serves member reads through the HTTP access policy of the acting member", async () => {
    const created = await request(
      `/guilds/${authorizedGuildId}/timers/manual`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Test boss",
          actorCharacter: {
            accountId: "123",
            characterId: "456",
            name: "Timer reporter",
            prof: "w",
            icon: "reporter.gif",
            lvl: 80,
          },
          minSeconds: 60,
          maxSeconds: 120,
          world,
        }),
      },
    );

    expect(created.status).toBe(201);

    const [timers, otherWorld, forbidden, stranger] = await callRpc(
      TEST_RPC_TOKEN,
      (client) =>
        Effect.all([
          client.listGuildTimers({ ...caller, guildId: authorizedGuildId }),
          client.listGuildTimers({
            ...caller,
            guildId: authorizedGuildId,
            world: "other world",
          }),
          client
            .listGuildTimers({ ...caller, guildId: forbiddenGuildId })
            .pipe(Effect.flip),
          client
            .listGuildTimers({
              userId: "stranger",
              discordId: "stranger-discord",
              guildId: authorizedGuildId,
            })
            .pipe(Effect.flip),
        ]),
    );

    expect(timers).toEqual([
      expect.objectContaining({
        world,
        npc: expect.objectContaining({ name: "Test boss" }),
      }),
    ]);
    expect(otherWorld).toEqual([]);
    expect(forbidden._tag).toBe("RpcForbiddenError");
    expect(["RpcForbiddenError", "RpcNotFoundError"]).toContain(stranger._tag);
  });

  it("lets the panel grant and revoke auras, which decides whether the User may choose one", async () => {
    const ownAura = async () =>
      (await request("/users/@me/character-aura")).json();

    expect(await ownAura()).toMatchObject({ canChange: false });

    const grants = await callOperatorRpc((client) =>
      Effect.andThen(
        client.grantCharacterAuras({
          userId: caller.userId,
          operatorUserId: "operator-1",
        }),
        client.getCharacterAuraGrants({ userId: caller.userId }),
      ),
    );

    expect(grants).toEqual({
      admin: false,
      granted: true,
      personalAuraIds: [],
    });
    expect(await ownAura()).toMatchObject({ canChange: true });

    const holders = await callOperatorRpc((client) =>
      Effect.andThen(
        client.revokeCharacterAuras({ userId: caller.userId }),
        client.listCharacterAuraGrantHolders(),
      ),
    );

    expect(holders).toEqual({ holders: [] });
    expect(await ownAura()).toMatchObject({ canChange: false });
  });

  it("resolves a member identity only for an active member of that Organization", async () => {
    await databaseRuntime.runPromise(
      database
        .update(memberTable)
        .set({ active: false })
        .where(eq(memberTable.guildId, forbiddenGuildId)),
    );

    const [member] = await databaseRuntime.runPromise(
      database
        .select({ id: memberTable.id })
        .from(memberTable)
        .where(
          and(
            eq(memberTable.guildId, authorizedGuildId),
            eq(memberTable.userId, caller.discordId),
          ),
        ),
    );

    const { active, missing } = await callRpc(TEST_RPC_TOKEN, (client) =>
      Effect.all({
        active: client.getMemberIdentity({
          guildId: authorizedGuildId,
          discordId: caller.discordId,
        }),
        missing: Effect.forEach(
          [
            { guildId: forbiddenGuildId, discordId: caller.discordId },
            { guildId: authorizedGuildId, discordId: "discord-unknown" },
            { guildId: "guild-unknown", discordId: caller.discordId },
          ],
          (identity) => client.getMemberIdentity(identity).pipe(Effect.flip),
        ),
      }),
    );

    expect(member).toBeDefined();
    expect(active).toMatchObject({
      userId: caller.userId,
      memberId: member?.id,
    });
    expect(missing.map((failure) => failure._tag)).toEqual([
      "RpcNotFoundError",
      "RpcNotFoundError",
      "RpcNotFoundError",
    ]);
  });

  it("rejects a caller that does not hold a token for the procedure", async () => {
    const rejected = await callRpc(Redacted.make("wrong-token"), (client) =>
      client
        .listGuildTimers({ ...caller, guildId: authorizedGuildId })
        .pipe(Effect.flip),
    );

    expect(rejected._tag).toBe("RpcCallerRejectedError");
  });

  it("does not serve the identity-trusting HTTP API on the RPC port", async () => {
    const response = await requestRpcPort(
      `/guilds/${authorizedGuildId}/timers`,
    );

    expect(response.status).toBe(404);
  });
});
