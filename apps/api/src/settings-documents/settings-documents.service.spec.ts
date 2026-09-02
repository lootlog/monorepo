import { describe, expect, it, vi } from "#test/bun-test";
import type { SettingsDocumentsRepository } from "./settings-documents.repository.js";
import { SettingsDocumentsService } from "./settings-documents.service.js";

const createRepository = () => ({
  findDocuments: vi
    .fn<SettingsDocumentsRepository["findDocuments"]>()
    .mockResolvedValue([]),
  hasActiveGuildMembership: vi
    .fn<SettingsDocumentsRepository["hasActiveGuildMembership"]>()
    .mockResolvedValue(true),
  applyOperations: vi
    .fn<SettingsDocumentsRepository["applyOperations"]>()
    .mockResolvedValue(undefined),
});

describe("SettingsDocumentsService", () => {
  it("allows guild settings for an active member linked to the user", async () => {
    const repository = createRepository();
    const service = new SettingsDocumentsService(
      repository as unknown as SettingsDocumentsRepository,
    );

    await expect(
      service.getPreferences("user-1", {
        domains: ["timers"],
        guildId: "guild-1",
      }),
    ).resolves.toEqual({ domains: { timers: expect.any(Object) } });
    expect(repository.hasActiveGuildMembership).toHaveBeenCalledWith(
      "user-1",
      "guild-1",
    );
  });

  it("rejects guild settings without an active member linked to the user", async () => {
    const repository = createRepository();
    repository.hasActiveGuildMembership.mockResolvedValue(false);
    const service = new SettingsDocumentsService(
      repository as unknown as SettingsDocumentsRepository,
    );

    await expect(
      service.getPreferences("user-1", {
        domains: ["timers"],
        guildId: "guild-1",
      }),
    ).rejects.toThrow("Guild settings are not accessible");
  });

  it("returns effective values, layers and field sources for a context", async () => {
    const repository = createRepository();
    repository.findDocuments.mockResolvedValue([
      {
        domain: "appearance",
        scopeType: "USER",
        scopeId: "user-1",
        overrides: { chat: { fontScalePercent: 110 } },
        schemaVersion: 1,
        updatedAt: new Date("2026-07-24T01:00:00.000Z"),
      },
      {
        domain: "appearance",
        scopeType: "GAME_ACCOUNT",
        scopeId: "account-1",
        overrides: { chat: { fontScalePercent: 90 } },
        schemaVersion: 1,
        updatedAt: new Date("2026-07-24T02:00:00.000Z"),
      },
    ] as never);
    const service = new SettingsDocumentsService(
      repository as unknown as SettingsDocumentsRepository,
    );

    const response = await service.getPreferences("user-1", {
      domains: ["appearance"],
      gameAccountId: "account-1",
    });

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

    await new SettingsDocumentsService(
      firstRepository as unknown as SettingsDocumentsRepository,
    ).getPreferences("user-1", {
      domains: ["gameData"],
      gameAccountId: "account-1",
      characterId: "character-1",
    });
    await new SettingsDocumentsService(
      secondRepository as unknown as SettingsDocumentsRepository,
    ).getPreferences("user-1", {
      domains: ["gameData"],
      gameAccountId: "account-2",
      characterId: "character-1",
    });

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

  it("sorts a patch batch before delegating the serializable transaction", async () => {
    const repository = createRepository();
    const service = new SettingsDocumentsService(
      repository as unknown as SettingsDocumentsRepository,
    );
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

    await service.patchPreferences("user-1", { operations });

    expect(repository.applyOperations).toHaveBeenCalledWith("user-1", [
      operations[1],
      operations[0],
    ]);
  });
});
