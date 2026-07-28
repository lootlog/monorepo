import { SettingsDocumentsService } from "./settings-documents.service";
import type { PrismaService } from "src/db/prisma.service";
import { describe, expect, it, vi } from "vitest";

const createPrismaMock = () => {
  const transactionClient = {
    $queryRaw: vi.fn(),
    userSettingDocument: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  return {
    transactionClient,
    prisma: {
      userSettingDocument: {
        findMany: vi.fn(),
      },
      member: {
        findFirst: vi.fn(),
      },
      $transaction: vi.fn(
        async (operation: (client: typeof transactionClient) => unknown) =>
          operation(transactionClient),
      ),
    },
  };
};

describe("SettingsDocumentsService", () => {
  it("allows guild settings for an active member linked to the user", async () => {
    const { prisma } = createPrismaMock();
    prisma.member.findFirst.mockImplementation(({ where }) => {
      if (
        where.globalUserId === "user-1" &&
        where.guildId === "guild-1" &&
        where.active === true
      ) {
        return { id: 1 };
      }

      return null;
    });
    prisma.userSettingDocument.findMany.mockResolvedValue([]);
    const service = new SettingsDocumentsService(
      prisma as unknown as PrismaService,
    );

    await expect(
      service.getPreferences("user-1", {
        domains: ["events"],
        guildId: "guild-1",
      }),
    ).resolves.toEqual({
      domains: {
        events: expect.any(Object),
      },
    });
  });

  it("rejects guild settings without an active member linked to the user", async () => {
    const { prisma } = createPrismaMock();
    prisma.member.findFirst.mockResolvedValue(null);
    const service = new SettingsDocumentsService(
      prisma as unknown as PrismaService,
    );

    await expect(
      service.getPreferences("user-1", {
        domains: ["events"],
        guildId: "guild-1",
      }),
    ).rejects.toThrow("Guild settings are not accessible");
  });

  it("returns effective values, layers and field sources for a context", async () => {
    const { prisma } = createPrismaMock();
    prisma.userSettingDocument.findMany.mockResolvedValue([
      {
        domain: "appearance",
        scopeType: "USER",
        scopeId: "user-1",
        overrides: {
          chat: {
            fontScalePercent: 110,
          },
        },
        schemaVersion: 1,
        updatedAt: new Date("2026-07-24T01:00:00.000Z"),
      },
      {
        domain: "appearance",
        scopeType: "GAME_ACCOUNT",
        scopeId: "account-1",
        overrides: {
          chat: {
            fontScalePercent: 90,
          },
        },
        schemaVersion: 1,
        updatedAt: new Date("2026-07-24T02:00:00.000Z"),
      },
    ]);
    const service = new SettingsDocumentsService(
      prisma as unknown as PrismaService,
    );

    const response = await service.getPreferences("user-1", {
      domains: ["appearance"],
      gameAccountId: "account-1",
    });

    expect(response.domains.appearance.effective).toMatchObject({
      chat: {
        fontScalePercent: 110,
      },
    });
    expect(
      response.domains.appearance.sources["chat.fontScalePercent"],
    ).toEqual({
      type: "USER",
      id: "user-1",
    });
    expect(response.domains.appearance.layers).toHaveLength(2);
  });

  it("qualifies character scopes with the game account", async () => {
    const firstPrismaMock = createPrismaMock().prisma;
    const secondPrismaMock = createPrismaMock().prisma;
    firstPrismaMock.userSettingDocument.findMany.mockResolvedValue([]);
    secondPrismaMock.userSettingDocument.findMany.mockResolvedValue([]);

    await new SettingsDocumentsService(
      firstPrismaMock as unknown as PrismaService,
    ).getPreferences("user-1", {
      domains: ["gameData"],
      gameAccountId: "account-1",
      characterId: "character-1",
    });
    await new SettingsDocumentsService(
      secondPrismaMock as unknown as PrismaService,
    ).getPreferences("user-1", {
      domains: ["gameData"],
      gameAccountId: "account-2",
      characterId: "character-1",
    });

    expect(firstPrismaMock.userSettingDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            {
              scopeType: "CHARACTER",
              scopeId: "account-1:character-1",
            },
          ]),
        }),
      }),
    );
    expect(secondPrismaMock.userSettingDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            {
              scopeType: "CHARACTER",
              scopeId: "account-2:character-1",
            },
          ]),
        }),
      }),
    );
  });

  it("atomically merges patches and deletes empty documents", async () => {
    const { prisma, transactionClient } = createPrismaMock();
    transactionClient.userSettingDocument.findUnique.mockImplementation(
      ({ where }) => {
        const scopeType = where.userId_domain_scopeType_scopeId.scopeType;

        if (scopeType === "USER") {
          return {
            overrides: {
              chat: {
                showTimestamp: false,
              },
            },
          };
        }

        return {
          overrides: {
            pings: {
              enabled: true,
            },
          },
        };
      },
    );
    prisma.userSettingDocument.findMany.mockResolvedValue([]);
    const service = new SettingsDocumentsService(
      prisma as unknown as PrismaService,
    );

    await service.patchPreferences("user-1", {
      operations: [
        {
          domain: "appearance",
          scope: { type: "USER", id: "user-1" },
          set: {
            chat: {
              fontScalePercent: 120,
            },
          },
          unset: [],
        },
        {
          domain: "gameData",
          scope: { type: "GAME_ACCOUNT", id: "account-1" },
          set: {},
          unset: ["pings"],
        },
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(transactionClient.userSettingDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          overrides: {
            chat: {
              showTimestamp: false,
              fontScalePercent: 120,
            },
          },
        }),
      }),
    );
    expect(transactionClient.userSettingDocument.delete).toHaveBeenCalledOnce();
  });
});
