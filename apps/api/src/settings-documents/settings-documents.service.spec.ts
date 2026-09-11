import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { describe, expect, it, vi } from "bun:test";
import { Effect } from "effect";
import type { SettingsDocumentsRepositoryService } from "./settings-documents.repository.js";
import { makeSettingsDocuments } from "./settings-documents.service.js";
import type { JsonRecord } from "./settings-resolver.js";

const createRepository = () => ({
  findDocuments: vi
    .fn<SettingsDocumentsRepositoryService["findDocuments"]>()
    .mockReturnValue(Effect.succeed([])),
  hasActiveGuildMembership: vi
    .fn<SettingsDocumentsRepositoryService["hasActiveGuildMembership"]>()
    .mockReturnValue(Effect.succeed(true)),
  findActiveGuildMemberships: vi
    .fn<SettingsDocumentsRepositoryService["findActiveGuildMemberships"]>()
    .mockImplementation((_userId, guildIds) => Effect.succeed([...guildIds])),
  applyOperations: vi
    .fn<SettingsDocumentsRepositoryService["applyOperations"]>()
    .mockReturnValue(Effect.void),
});

const createStoredDocument = (
  id: number,
  domain: "timers" | "appearance",
  scopeType: "USER" | "GAME_ACCOUNT" | "CHARACTER" | "GUILD",
  scopeId: string,
  overrides: JsonRecord,
) => ({
  id,
  userId: "user-1",
  createdAt: new Date("2026-07-24T00:00:00.000Z"),
  domain,
  scopeType,
  scopeId,
  overrides,
  schemaVersion: 1,
  updatedAt: new Date("2026-07-24T01:00:00.000Z"),
});

describe("settings documents Effect module", () => {
  it("rejects out-of-key guild scopes before reading or writing any settings", async () => {
    const repository = createRepository();
    const service = makeSettingsDocuments(repository);

    const identity = {
      userId: "user-1",
      discordId: "discord-1",
      apiKey: {
        keyId: "key-1",
        organizationIds: ["1"],
        mode: "read-write" as const,
        personalData: true,
        expiresAt: null,
      },
    };

    await expect(
      Effect.runPromise(
        service
          .getPreferences("user-1", {
            domains: ["timers"],
            guildId: "2",
          })
          .pipe(Effect.provideService(ForwardAuthIdentity, identity)),
      ),
    ).rejects.toThrow("outside the API key scope");
    await expect(
      Effect.runPromise(
        service
          .patchPreferences("user-1", {
            operations: [
              {
                domain: "timers",
                scope: { type: "USER", id: "user-1" },
                set: { showTimers: false },
                unset: [],
              },
              {
                domain: "timers",
                scope: { type: "GUILD", id: "2" },
                set: {},
                unset: [],
              },
            ],
          })
          .pipe(Effect.provideService(ForwardAuthIdentity, identity)),
      ),
    ).rejects.toThrow("outside the API key scope");
    expect(repository.findDocuments).not.toHaveBeenCalled();
    expect(repository.applyOperations).not.toHaveBeenCalled();
  });

  it("allows guild settings for an active member linked to the user", async () => {
    const repository = createRepository();
    const service = makeSettingsDocuments(repository);

    await expect(
      Effect.runPromise(
        service.getPreferences("user-1", {
          domains: ["timers"],
          guildId: "guild-1",
        }),
      ),
    ).resolves.toEqual({ domains: { timers: expect.any(Object) } });
    expect(repository.hasActiveGuildMembership).toHaveBeenCalledWith(
      "user-1",
      "guild-1",
    );
  });

  it("rejects guild settings without an active member linked to the user", async () => {
    const repository = createRepository();
    repository.hasActiveGuildMembership.mockReturnValue(Effect.succeed(false));
    const service = makeSettingsDocuments(repository);

    await expect(
      Effect.runPromise(
        service.getPreferences("user-1", {
          domains: ["timers"],
          guildId: "guild-1",
        }),
      ),
    ).rejects.toThrow("Guild settings are not accessible");
  });

  it("returns effective values, layers and field sources for a context", async () => {
    const repository = createRepository();
    repository.findDocuments.mockReturnValue(
      Effect.succeed([
        {
          id: 1,
          userId: "user-1",
          createdAt: new Date("2026-07-24T00:00:00.000Z"),
          domain: "appearance",
          scopeType: "USER",
          scopeId: "user-1",
          overrides: { chat: { fontScalePercent: 110 } },
          schemaVersion: 1,
          updatedAt: new Date("2026-07-24T01:00:00.000Z"),
        },
        {
          id: 2,
          userId: "user-1",
          createdAt: new Date("2026-07-24T00:00:00.000Z"),
          domain: "appearance",
          scopeType: "GAME_ACCOUNT",
          scopeId: "account-1",
          overrides: { chat: { fontScalePercent: 90 } },
          schemaVersion: 1,
          updatedAt: new Date("2026-07-24T02:00:00.000Z"),
        },
      ]),
    );
    const service = makeSettingsDocuments(repository);

    const response = await Effect.runPromise(
      service.getPreferences("user-1", {
        domains: ["appearance"],
        gameAccountId: "account-1",
      }),
    );

    expect(response.domains.appearance?.effective).toMatchObject({
      chat: { fontScalePercent: 110 },
    });
    expect(
      response.domains.appearance?.sources["chat.fontScalePercent"],
    ).toEqual({ type: "USER", id: "user-1" });
    expect(response.domains.appearance?.layers).toHaveLength(2);
  });

  it("qualifies character scopes with the game account", async () => {
    const firstRepository = createRepository();
    const secondRepository = createRepository();

    await Effect.runPromise(
      makeSettingsDocuments(firstRepository).getPreferences("user-1", {
        domains: ["gameData"],
        gameAccountId: "account-1",
        characterId: "character-1",
      }),
    );
    await Effect.runPromise(
      makeSettingsDocuments(secondRepository).getPreferences("user-1", {
        domains: ["gameData"],
        gameAccountId: "account-2",
        characterId: "character-1",
      }),
    );

    expect(firstRepository.findDocuments).toHaveBeenCalledWith(
      "user-1",
      ["gameData"],
      expect.arrayContaining([
        { type: "CHARACTER", id: "account-1:character-1" },
      ]),
    );
    expect(secondRepository.findDocuments).toHaveBeenCalledWith(
      "user-1",
      ["gameData"],
      expect.arrayContaining([
        { type: "CHARACTER", id: "account-2:character-1" },
      ]),
    );
  });

  it("returns guild documents only for guilds with an active membership", async () => {
    const repository = createRepository();
    repository.findActiveGuildMemberships.mockReturnValue(
      Effect.succeed(["guild-1"]),
    );
    repository.findDocuments.mockReturnValue(
      Effect.succeed([
        createStoredDocument(1, "timers", "GUILD", "guild-1", {
          hiddenTimers: ["hidden-1"],
        }),
        createStoredDocument(2, "timers", "GUILD", "guild-2", {
          hiddenTimers: ["hidden-2"],
        }),
      ]),
    );
    const service = makeSettingsDocuments(repository);

    const response = await Effect.runPromise(
      service.getGuildPreferences("user-1", {
        domains: ["timers"],
        guildIds: ["guild-1", "guild-2", "guild-1"],
      }),
    );

    expect(Object.keys(response.guilds)).toEqual(["guild-1"]);
    expect(response.guilds["guild-1"]?.domains.timers?.effective).toMatchObject(
      { hiddenTimers: ["hidden-1"] },
    );
    expect(repository.findActiveGuildMemberships).toHaveBeenCalledWith(
      "user-1",
      ["guild-1", "guild-2"],
    );
    expect(repository.findDocuments).toHaveBeenCalledWith(
      "user-1",
      ["timers"],
      [{ type: "GUILD", id: "guild-1" }],
    );
  });

  it("resolves a patch response in the caller's read context", async () => {
    const repository = createRepository();
    repository.findDocuments.mockReturnValue(
      Effect.succeed([
        createStoredDocument(1, "appearance", "USER", "user-1", {
          chat: { fontScalePercent: 110 },
        }),
        createStoredDocument(2, "appearance", "CHARACTER", "account-1:char-1", {
          chat: { fontScalePercent: 90 },
        }),
      ]),
    );
    const service = makeSettingsDocuments(repository);

    const response = await Effect.runPromise(
      service.patchPreferences("user-1", {
        operations: [
          {
            domain: "appearance",
            scope: { type: "USER", id: "user-1" },
            set: { chat: { fontScalePercent: 110 } },
            unset: [],
          },
        ],
        context: { gameAccountId: "account-1", characterId: "char-1" },
      }),
    );

    expect(repository.findDocuments).toHaveBeenCalledWith(
      "user-1",
      ["appearance"],
      [
        { type: "USER", id: "user-1" },
        { type: "GAME_ACCOUNT", id: "account-1" },
        { type: "CHARACTER", id: "account-1:char-1" },
      ],
    );
    expect(
      response.domains.appearance?.layers.map((layer) => layer.scope.type),
    ).toEqual(["USER", "CHARACTER"]);
  });

  it("sorts a patch batch before delegating the serializable transaction", async () => {
    const repository = createRepository();
    const service = makeSettingsDocuments(repository);

    const operations = [
      {
        domain: "gameData" as const,
        scope: { type: "GAME_ACCOUNT" as const, id: "account-1" },
        set: {},
        unset: ["pings"],
      },
      {
        domain: "appearance" as const,
        scope: { type: "USER" as const, id: "user-1" },
        set: { chat: { fontScalePercent: 120 } },
        unset: [],
      },
    ];

    await Effect.runPromise(service.patchPreferences("user-1", { operations }));

    expect(repository.applyOperations).toHaveBeenCalledWith("user-1", [
      operations[1],
      operations[0],
    ]);
  });
});
