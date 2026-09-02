import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import {
  PartyReadyRoomClientUpdateDto_Output,
  PartyReadyRoomProjectionDto_Output,
} from "../../lootlog-api.js";
import {
  ReadyRoomAccessDenied,
  ReadyRoomAuthorization,
  ReadyRoomData,
  ReadyRoomOperationError,
  cancelReadyRoom,
  createReadyRoom,
  getReadyRoom,
  removeFromReadyRoom,
} from "./party-ready-room.handlers.js";

const expectedHandlerIdentifiers = [
  "PartyReadyRoomControllerList",
  "PartyReadyRoomControllerCreate",
  "PartyReadyRoomControllerGet",
  "PartyReadyRoomControllerApply",
  "PartyReadyRoomControllerWithdraw",
  "PartyReadyRoomControllerRemove",
  "PartyReadyRoomControllerResolveInvitationTargets",
  "PartyReadyRoomControllerObserveParty",
  "PartyReadyRoomControllerCancel",
] as const;

const identity = { userId: "user-a", discordId: "discord-organizer" };
const character = {
  lvl: 300,
  nick: "Hero",
  accountId: "account-a",
  characterId: "character-a",
  prof: "w",
  icon: "hero.gif",
};
const projection = {
  schemaVersion: 3 as const,
  notificationId: "room-a",
  organizerDiscordId: identity.discordId,
  organizerCharacter: character,
  guildIds: ["guild-visible"],
  world: "Fobos",
  status: "ACTIVE" as const,
  revision: 4,
  createdAt: "2026-09-02T12:00:00.000Z",
  updatedAt: "2026-09-02T12:01:00.000Z",
  expiresAt: "2026-09-02T12:30:00.000Z",
  viewer: "ORGANIZER" as const,
  participants: {},
  ownedParticipantIds: [],
};
const update = {
  schemaVersion: 3 as const,
  type: "UPSERT" as const,
  projection,
};

const makeAuthorization = (
  overrides: Partial<ReadyRoomAuthorization["Service"]> = {},
) =>
  ReadyRoomAuthorization.of({
    identity: Effect.succeed(identity),
    ...overrides,
  });

const makeData = (overrides: Partial<ReadyRoomData["Service"]> = {}) =>
  ReadyRoomData.of({
    accessibleGuildIds: () => Effect.succeed(["guild-visible"]),
    create: () => Effect.succeed(projection),
    list: () => Effect.succeed([projection]),
    get: () => Effect.succeed(projection),
    apply: () => Effect.succeed(projection),
    withdraw: () => Effect.succeed(update),
    remove: () => Effect.succeed(update),
    resolveInvitationTargets: () => Effect.succeed({ targets: [] }),
    observeParty: () => Effect.succeed(projection),
    cancel: () => Effect.succeed(update),
    ...overrides,
  });

const provideServices = (
  authorization: ReadyRoomAuthorization["Service"],
  data: ReadyRoomData["Service"],
) =>
  Layer.merge(
    Layer.succeed(ReadyRoomAuthorization, authorization),
    Layer.succeed(ReadyRoomData, data),
  );

describe("Party Ready Room HttpApi handlers", () => {
  it("wires every generated Party Ready Room endpoint identifier exactly once", async () => {
    const source = await Bun.file(
      new URL("./party-ready-room.handlers.ts", import.meta.url),
    ).text();
    const actual = [...source.matchAll(/\.handle\(\s*"([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(actual).toHaveLength(9);
    expect(new Set(actual).size).toBe(9);
    expect(actual).toEqual([...expectedHandlerIdentifiers]);
  });

  it("creates a room only for visible Organizations and preserves projection TTL fields", async () => {
    const calls: unknown[] = [];
    const layer = provideServices(
      makeAuthorization(),
      makeData({
        accessibleGuildIds: () =>
          Effect.succeed(["guild-visible", "guild-second"]),
        create: (current, guildIds, payload) => {
          calls.push({ current, guildIds, payload });
          return Effect.succeed(projection);
        },
      }),
    );

    const response = await Effect.runPromise(
      createReadyRoom({
        guildIds: ["guild-hidden", "guild-visible"],
        world: "Fobos",
        character,
      }).pipe(Effect.provide(layer)),
    );

    expect(calls).toEqual([
      {
        current: identity,
        guildIds: ["guild-visible"],
        payload: {
          guildIds: ["guild-hidden", "guild-visible"],
          world: "Fobos",
          character,
        },
      },
    ]);
    expect(response.expiresAt).toBe("2026-09-02T12:30:00.000Z");
    expect(Schema.is(PartyReadyRoomProjectionDto_Output)(response)).toBe(true);
  });

  it("fails closed before data access when identity authentication fails", async () => {
    const denied = new ReadyRoomAccessDenied({
      status: 401,
      code: "AUTH_REQUIRED",
    });
    let dataCalled = false;
    const layer = provideServices(
      makeAuthorization({ identity: Effect.fail(denied) }),
      makeData({
        get: () => {
          dataCalled = true;
          return Effect.succeed(projection);
        },
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(getReadyRoom("room-a").pipe(Effect.provide(layer))),
    );

    expect(error).toBe(denied);
    expect(dataCalled).toBe(false);
  });

  it("preserves stale revision conflicts from the Ready Room service", async () => {
    const conflictCause = {
      getStatus: () => 409,
      response: { code: "REVISION_CONFLICT" },
    };
    const conflict = new ReadyRoomOperationError({ cause: conflictCause });
    const calls: string[] = [];
    const layer = provideServices(
      makeAuthorization(),
      makeData({
        get: () => {
          calls.push("visibility");
          return Effect.succeed(projection);
        },
        cancel: (_current, _notificationId, payload) => {
          calls.push(`cancel:${payload.expectedRevision}`);
          return Effect.fail(conflict);
        },
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        cancelReadyRoom("room-a", { expectedRevision: 3 }).pipe(
          Effect.provide(layer),
        ),
      ),
    );

    expect(calls).toEqual(["visibility", "cancel:3"]);
    expect(error).toBe(conflict);
    expect(error.cause).toBe(conflictCause);
  });

  it("hides unauthorized rooms before organizer mutations", async () => {
    const forbidden = new ReadyRoomOperationError({
      cause: { getStatus: () => 403, response: { code: "FORBIDDEN" } },
    });
    let removeCalled = false;
    const layer = provideServices(
      makeAuthorization(),
      makeData({
        get: () => Effect.fail(forbidden),
        remove: () => {
          removeCalled = true;
          return Effect.succeed(update);
        },
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        removeFromReadyRoom("room-hidden", {
          participantId: "participant-a",
          expectedRevision: 4,
        }).pipe(Effect.provide(layer)),
      ),
    );

    expect(error).toBe(forbidden);
    expect(removeCalled).toBe(false);
    expect(Schema.is(PartyReadyRoomClientUpdateDto_Output)(update)).toBe(true);
  });
});
