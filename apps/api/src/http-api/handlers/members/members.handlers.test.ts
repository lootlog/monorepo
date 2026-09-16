import { createMemberFixture } from "../../../../test/organization-fixtures.js";
import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import {
  MemberBoundary,
  MemberRefreshJobBoundary,
} from "./member-response.schema.js";
import { decodeDomainJson } from "../../domain-json.schema.js";
import {
  NullableMemberRefreshJobResponse,
  MemberRefreshJobResponse,
  MemberResponse,
} from "#src/contracts/members/schemas";
import {
  deactivateGuildMember,
  getCurrentMember,
  MembersAccessDenied,
  MembersAuthorization,
  MembersData,
  MemberReadData,
  MemberRefreshJobData,
  MembersNotFound,
  refreshGuildMember,
} from "./members.handlers.js";

const identity = { userId: "user-a", discordId: "discord-admin" };

const access = {
  ...identity,
  guildId: "guild-a",
  permissions: [Permission.ADMIN, Permission.LOOTLOG_ACCESS],
};

const member = {
  ...createMemberFixture(),
  id: 1,
  userId: "discord-member",
  guildId: "guild-a",
  type: "USER" as const,
  name: "Member",
  avatar: null,
  banner: null,
  active: true,
  roles: [],
  globalUserId: "internal-user",
  updatedAt: new Date("2026-09-02T12:00:00.000Z"),
};

const makeData = (overrides: Partial<MembersData["Service"]> = {}) =>
  MembersData.of({
    getMe: () => Effect.succeed(member),
    refreshMember: () => Effect.succeed(member),
    deactivateMember: () => Effect.succeed({ ...member, active: false }),
    refreshAllMembers: () => Effect.succeed({}),
    ...overrides,
  });

const makeRefreshJobData = (
  overrides: Partial<MemberRefreshJobData["Service"]> = {},
) =>
  MemberRefreshJobData.of({
    getLatestRefreshJob: () => Effect.succeed(null),
    getRefreshJobStatus: () => Effect.succeed({}),
    ...overrides,
  });

const makeReadData = (overrides: Partial<MemberReadData["Service"]> = {}) =>
  MemberReadData.of({
    getLootlogConfigSummary: () => Effect.succeed({}),
    getGuildMembers: () => Effect.succeed([]),
    getGuildMemberReferences: () => Effect.succeed([]),
    getGuildMembersSummary: () => Effect.succeed([]),
    ...overrides,
  });

const makeAuthorization = (
  overrides: Partial<MembersAuthorization["Service"]> = {},
) =>
  MembersAuthorization.of({
    identity: Effect.succeed(identity),
    requireGuild: () => Effect.succeed(access),
    ...overrides,
  });

const provideServices = (
  authorization: MembersAuthorization["Service"],
  data: MembersData["Service"],
  reads: MemberReadData["Service"] = makeReadData(),
  refreshJobs: MemberRefreshJobData["Service"] = makeRefreshJobData(),
) =>
  Layer.mergeAll(
    Layer.succeed(MembersAuthorization, authorization),
    Layer.succeed(MembersData, data),
    Layer.succeed(MemberReadData, reads),
    Layer.succeed(MemberRefreshJobData, refreshJobs),
  );

describe("Members HttpApi handlers", () => {
  it("returns the authenticated member through the generated response schema", async () => {
    const calls: unknown[] = [];

    const layer = provideServices(
      makeAuthorization(),
      makeData({
        getMe: (current, guildId, refresh) => {
          calls.push({ current, guildId, refresh });

          return Effect.succeed(member);
        },
      }),
    );

    const response = await Effect.runPromise(
      getCurrentMember("guild-a").pipe(Effect.provide(layer)),
    );

    expect(calls).toEqual([
      { current: identity, guildId: "guild-a", refresh: false },
    ]);
    expect(response?.updatedAt).toBe("2026-09-02T12:00:00.000Z");
    expect(Schema.is(MemberResponse)(response)).toBe(true);
  });

  it("fails closed before a privileged refresh when capability checks fail", async () => {
    const denied = new MembersAccessDenied({
      status: 403,
      code: "MEMBER_ADMIN_REQUIRED",
    });

    let dataCalled = false;

    const layer = provideServices(
      makeAuthorization({ requireGuild: () => Effect.fail(denied) }),
      makeData({
        refreshMember: () => {
          dataCalled = true;

          return Effect.succeed(member);
        },
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        refreshGuildMember("guild-a", "discord-member").pipe(
          Effect.provide(layer),
        ),
      ),
    );

    expect(error).toBe(denied);
    expect(dataCalled).toBe(false);
  });

  it("keeps a member in another Organization hidden as not-found", async () => {
    const hidden = new MembersNotFound({
      status: 404,
      code: "MEMBER_NOT_FOUND",
    });

    let dataCalled = false;

    const layer = provideServices(
      makeAuthorization({ requireGuild: () => Effect.fail(hidden) }),
      makeData({
        deactivateMember: () => {
          dataCalled = true;

          return Effect.succeed(member);
        },
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        deactivateGuildMember("guild-b", "discord-member").pipe(
          Effect.provide(layer),
        ),
      ),
    );

    expect(error).toBe(hidden);
    expect(dataCalled).toBe(false);
  });

  it("uses canonical Organization scope for refresh and deactivate mutations", async () => {
    const authorizationCalls: unknown[] = [];
    const mutationCalls: unknown[] = [];

    const layer = provideServices(
      makeAuthorization({
        requireGuild: (options) => {
          authorizationCalls.push(options);

          return Effect.succeed(access);
        },
      }),
      makeData({
        refreshMember: (guildId, discordId) => {
          mutationCalls.push({ kind: "refresh", guildId, discordId });

          return Effect.succeed(member);
        },
        deactivateMember: (guildId, discordId) => {
          mutationCalls.push({ kind: "deactivate", guildId, discordId });

          return Effect.succeed({ ...member, active: false });
        },
      }),
    );

    await Effect.runPromise(
      refreshGuildMember("guild-alias", "discord-member").pipe(
        Effect.provide(layer),
      ),
    );

    const deactivated = await Effect.runPromise(
      deactivateGuildMember("guild-alias", "discord-member").pipe(
        Effect.provide(layer),
      ),
    );

    expect(authorizationCalls).toEqual([
      {
        guildId: "guild-alias",
        anyOf: [Permission.ADMIN, Permission.OWNER],
      },
      {
        guildId: "guild-alias",
        anyOf: [Permission.ADMIN, Permission.OWNER],
      },
    ]);
    expect(mutationCalls).toEqual([
      { kind: "refresh", guildId: "guild-a", discordId: "discord-member" },
      {
        kind: "deactivate",
        guildId: "guild-a",
        discordId: "discord-member",
      },
    ]);
    expect(deactivated.active).toBe(false);
  });
});

describe("member response projections", () => {
  it("preserves member dates, nulls and omitted fields", async () => {
    for (const updatedAt of [
      member.updatedAt,
      member.updatedAt.toISOString(),
    ]) {
      const value = {
        ...member,
        updatedAt,
        lastDiscordSyncAt: member.updatedAt,
        nextRefreshAt: null,
      };

      expect(
        await Effect.runPromise(
          Schema.decodeUnknownEffect(MemberBoundary)(value),
        ),
      ).toEqual(
        await Effect.runPromise(decodeDomainJson(MemberResponse, value)),
      );
    }

    for (const value of [
      { ...member, lastDiscordSyncAt: undefined },
      { ...member, updatedAt: new Date(Number.NaN) },
      { ...member, updatedAt: "invalid" },
      { ...member, id: Infinity },
      { ...member, roles: [{ id: 1 }] },
    ]) {
      expect(
        await Effect.runPromise(
          Effect.isFailure(Schema.decodeUnknownEffect(MemberBoundary)(value)),
        ),
      ).toBe(true);
      expect(
        await Effect.runPromise(
          Effect.isFailure(decodeDomainJson(MemberResponse, value)),
        ),
      ).toBe(true);
    }
  });

  it("preserves refresh job dates and rejects malformed producer values", async () => {
    const job = {
      id: 1,
      guildId: "guild-a",
      status: "PENDING",
      totalMembers: 4,
      processedMembers: 0,
      failedMembers: 0,
      createdAt: member.updatedAt,
      nextAvailableAt: member.updatedAt,
    };

    for (const value of [
      job,
      { ...job, completedAt: null },
      { ...job, completedAt: member.updatedAt },
      { ...job, createdAt: member.updatedAt.toISOString() },
    ]) {
      expect(
        await Effect.runPromise(
          Schema.decodeUnknownEffect(MemberRefreshJobBoundary)(value),
        ),
      ).toEqual(
        await Effect.runPromise(
          decodeDomainJson(MemberRefreshJobResponse, value),
        ),
      );
    }

    for (const value of [
      { ...job, completedAt: undefined },
      { ...job, createdAt: "invalid" },
      { ...job, completedAt: new Date(Number.NaN) },
      { ...job, totalMembers: "4" },
    ]) {
      expect(
        await Effect.runPromise(
          Effect.isFailure(
            Schema.decodeUnknownEffect(MemberRefreshJobBoundary)(value),
          ),
        ),
      ).toBe(true);
      expect(
        await Effect.runPromise(
          Effect.isFailure(decodeDomainJson(MemberRefreshJobResponse, value)),
        ),
      ).toBe(true);
    }
  });

  it("preserves additional nested dates and null in the open refresh job contract", async () => {
    const response = await Effect.runPromise(
      decodeDomainJson(NullableMemberRefreshJobResponse, {
        id: 1,
        guildId: "guild-a",
        status: "PENDING",
        totalMembers: 4,
        processedMembers: 0,
        failedMembers: 0,
        createdAt: member.updatedAt,
        nextAvailableAt: member.updatedAt,
        metadata: { observedAt: member.updatedAt },
      }),
    );

    expect(response?.metadata).toEqual({
      observedAt: member.updatedAt.toISOString(),
    });
    expect(
      await Effect.runPromise(
        decodeDomainJson(NullableMemberRefreshJobResponse, null),
      ),
    ).toBeNull();
  });

  it("retains additional nested date fields on the open member response", async () => {
    const layer = provideServices(
      makeAuthorization(),
      makeData({
        refreshMember: () =>
          Effect.succeed({
            ...member,
            metadata: { observedAt: member.updatedAt },
          }),
      }),
    );

    const response = await Effect.runPromise(
      refreshGuildMember("guild-a", "discord-member").pipe(
        Effect.provide(layer),
      ),
    );

    expect(response?.metadata).toEqual({
      observedAt: member.updatedAt.toISOString(),
    });
  });
});
