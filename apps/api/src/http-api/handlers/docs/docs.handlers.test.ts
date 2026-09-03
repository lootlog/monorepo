import { describe, expect, it } from "bun:test";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Layer } from "effect";
import type { DocsService } from "#src/docs/docs.service";
import {
  createDocument,
  DocsAccessDenied,
  DocsAuthorization,
  DocsConflict,
  DocsData,
  getDocument,
  getHistory,
  restoreDocument,
  updateDocument,
  type AuthorizedDocsCaller,
} from "./docs.handlers.js";

const caller: AuthorizedDocsCaller = {
  discordId: "discord-1",
  userId: "user-1",
  guild: { id: "guild-a" } as AuthorizedDocsCaller["guild"],
  member: { userId: "user-1" } as AuthorizedDocsCaller["member"],
  accessPolicy: createAccessPolicy({
    capabilities: [
      Permission.LOOTLOG_DOCS_READ,
      Permission.LOOTLOG_DOCS_WRITE,
      Permission.ADMIN,
    ],
  }),
  roles: [],
};

const document = {
  id: "document-1",
  guildId: "guild-a",
  title: "Raid notes",
  version: 2,
  createdByMemberId: "member-1",
  createdBy: { memberId: "member-1", name: "Alice" },
  updatedByMemberId: "member-1",
  updatedBy: { memberId: "member-1", name: "Alice" },
  createdAt: "2026-09-01T10:00:00Z",
  updatedAt: "2026-09-01T10:01:00Z",
  content: { root: { children: [] } },
};

const unexpected = () => Effect.die("unexpected data access");

const makeData = (overrides: Partial<DocsData["Service"]> = {}) =>
  DocsData.of({
    list: unexpected,
    create: unexpected,
    trash: unexpected,
    history: unexpected,
    historySnapshot: unexpected,
    get: unexpected,
    update: unexpected,
    moveToTrash: unexpected,
    restore: unexpected,
    purge: unexpected,
    ...overrides,
  });

const makeAuthorization = (
  overrides: Partial<DocsAuthorization["Service"]> = {},
) =>
  DocsAuthorization.of({
    requireGuild: () => Effect.succeed(caller),
    ...overrides,
  });

const services = (
  authorization: DocsAuthorization["Service"],
  data: DocsData["Service"],
) =>
  Layer.merge(
    Layer.succeed(DocsAuthorization, authorization),
    DocsData.layer(data),
  );

describe("Docs HttpApi handlers", () => {
  it("encodes service timestamps before generated HTTP validation", async () => {
    const createdAt = new Date("2026-09-01T10:00:00.000Z");
    const service = new Proxy(
      {},
      {
        get: () => () =>
          Effect.succeed({
            ...document,
            createdAt,
            updatedAt: createdAt,
          }),
      },
    ) as DocsService;

    const result = await Effect.runPromise(
      DocsData.makeService(service).create(caller, { title: "Raid notes" }),
    );

    expect(result).toMatchObject({
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });
  });

  it("creates a document only after write authorization and preserves caller identity", async () => {
    const authorizationCalls: unknown[] = [];
    const dataCalls: unknown[] = [];
    const payload = { title: "Raid notes" };

    const result = await Effect.runPromise(
      createDocument("guild-a", payload).pipe(
        Effect.provide(
          services(
            makeAuthorization({
              requireGuild: (requirement) => {
                authorizationCalls.push(requirement);
                return Effect.succeed(caller);
              },
            }),
            makeData({
              create: (receivedCaller, receivedPayload) => {
                dataCalls.push({ receivedCaller, receivedPayload });
                return Effect.succeed(document);
              },
            }),
          ),
        ),
      ),
    );

    expect(result).toEqual(document);
    expect(authorizationCalls).toEqual([
      {
        guildId: "guild-a",
        capabilities: [Permission.LOOTLOG_DOCS_WRITE],
        mode: "all",
      },
    ]);
    expect(dataCalls).toEqual([
      { receivedCaller: caller, receivedPayload: payload },
    ]);
  });

  it("fails closed before reading data when authorization fails", async () => {
    const denied = new DocsAccessDenied({
      status: 401,
      code: "AUTHENTICATION_REQUIRED",
    });
    let dataAccessed = false;

    const error = await Effect.runPromise(
      Effect.flip(
        getDocument("guild-a", "document-1").pipe(
          Effect.provide(
            services(
              makeAuthorization({ requireGuild: () => Effect.fail(denied) }),
              makeData({
                get: () => {
                  dataAccessed = true;
                  return Effect.die("must not run");
                },
              }),
            ),
          ),
        ),
      ),
    );

    expect(error).toBe(denied);
    expect(dataAccessed).toBe(false);
  });

  it("does not cross the requested Organization boundary", async () => {
    const denied = new DocsAccessDenied({
      status: 403,
      code: "ORGANIZATION_ACCESS_DENIED",
    });
    const requestedGuilds: string[] = [];
    let dataAccessed = false;

    const error = await Effect.runPromise(
      Effect.flip(
        getDocument("guild-b", "document-from-guild-a").pipe(
          Effect.provide(
            services(
              makeAuthorization({
                requireGuild: (requirement) => {
                  requestedGuilds.push(requirement.guildId);
                  return Effect.fail(denied);
                },
              }),
              makeData({
                get: () => {
                  dataAccessed = true;
                  return Effect.die("must not run");
                },
              }),
            ),
          ),
        ),
      ),
    );

    expect(error).toBe(denied);
    expect(requestedGuilds).toEqual(["guild-b"]);
    expect(dataAccessed).toBe(false);
  });

  it("preserves an optimistic update conflict", async () => {
    const conflict = new DocsConflict({
      status: 409,
      code: "DOCS_CONFLICT",
    });

    const error = await Effect.runPromise(
      Effect.flip(
        updateDocument("guild-a", "document-1", {
          title: "Concurrent edit",
          content: { root: { children: [] } },
        }).pipe(
          Effect.provide(
            services(
              makeAuthorization(),
              makeData({ update: () => Effect.fail(conflict) }),
            ),
          ),
        ),
      ),
    );

    expect(error).toBe(conflict);
  });

  it("scopes history to both Organization and document", async () => {
    const calls: unknown[] = [];
    const history = {
      items: [
        {
          id: "history-1",
          documentId: "document-1",
          guildId: "guild-a",
          version: 1,
          title: "Raid notes",
          action: "SAVE",
          actorMemberId: "member-1",
          actor: { memberId: "member-1", name: "Alice" },
          editedAt: "2026-09-01T10:00:00Z",
        },
      ],
    } as const;

    const result = await Effect.runPromise(
      getHistory("guild-a", "document-1").pipe(
        Effect.provide(
          services(
            makeAuthorization(),
            makeData({
              history: (receivedCaller, documentId) => {
                calls.push({ guildId: receivedCaller.guild.id, documentId });
                return Effect.succeed(history);
              },
            }),
          ),
        ),
      ),
    );

    expect(result).toEqual(history);
    expect(calls).toEqual([{ guildId: "guild-a", documentId: "document-1" }]);
  });

  it("requires owner or admin before restoring a trashed document", async () => {
    const authorizationCalls: unknown[] = [];

    await Effect.runPromise(
      restoreDocument("guild-a", "document-1").pipe(
        Effect.provide(
          services(
            makeAuthorization({
              requireGuild: (requirement) => {
                authorizationCalls.push(requirement);
                return Effect.succeed(caller);
              },
            }),
            makeData({ restore: () => Effect.succeed({ success: true }) }),
          ),
        ),
      ),
    );

    expect(authorizationCalls).toEqual([
      {
        guildId: "guild-a",
        capabilities: [Permission.OWNER, Permission.ADMIN],
        mode: "any",
      },
    ]);
  });
});
