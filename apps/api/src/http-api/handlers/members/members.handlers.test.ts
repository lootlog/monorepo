import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { MemberResponseDto } from "../../lootlog-api.generated.js";
import {
  deactivateGuildMember,
  getCurrentMember,
  MembersAccessDenied,
  MembersAuthorization,
  MembersData,
  MembersNotFound,
  refreshGuildMember,
} from "./members.handlers.js";

const expectedHandlerIdentifiers = [
  "MembersControllerGetMe",
  "MembersControllerRefreshMe",
  "MembersControllerRefreshMember",
  "MembersControllerDeactivateMember",
  "MembersControllerGetMemberLootlogConfigSummary",
  "MembersControllerGetGuildMembers",
  "MembersControllerGetGuildMemberReferences",
  "MembersControllerGetGuildMembersSummary",
  "MembersControllerRefreshAllMembers",
  "MembersControllerGetLatestRefreshJob",
  "MembersControllerGetRefreshJobStatus",
] as const;

const identity = { userId: "user-a", discordId: "discord-admin" };
const access = {
  ...identity,
  guildId: "guild-a",
  permissions: [Permission.ADMIN, Permission.LOOTLOG_ACCESS],
};

const member = {
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
    getLootlogConfigSummary: () => Effect.succeed({}),
    getGuildMembers: () => Effect.succeed([]),
    getGuildMemberReferences: () => Effect.succeed([]),
    getGuildMembersSummary: () => Effect.succeed([]),
    refreshAllMembers: () => Effect.succeed({}),
    getLatestRefreshJob: () => Effect.succeed(null),
    getRefreshJobStatus: () => Effect.succeed({}),
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
) =>
  Layer.merge(
    Layer.succeed(MembersAuthorization, authorization),
    Layer.succeed(MembersData, data),
  );

describe("Members HttpApi handlers", () => {
  it("wires every generated Members endpoint identifier exactly once", async () => {
    const source = await Bun.file(
      new URL("./members.handlers.ts", import.meta.url),
    ).text();
    const actual = [...source.matchAll(/\.handle\(\s*"([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(actual).toHaveLength(11);
    expect(new Set(actual).size).toBe(11);
    expect(actual).toEqual([...expectedHandlerIdentifiers]);
  });

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
    expect(Schema.is(MemberResponseDto)(response)).toBe(true);
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
