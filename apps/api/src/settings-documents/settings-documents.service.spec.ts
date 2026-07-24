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
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(
        async (operation: (client: typeof transactionClient) => unknown) =>
          operation(transactionClient),
      ),
    },
  };
};

describe("SettingsDocumentsService", () => {
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
        fontScalePercent: 90,
      },
    });
    expect(
      response.domains.appearance.sources["chat.fontScalePercent"],
    ).toEqual({
      type: "GAME_ACCOUNT",
      id: "account-1",
    });
    expect(response.domains.appearance.layers).toHaveLength(2);
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
            chat: {
              fontScalePercent: 120,
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
          domain: "appearance",
          scope: { type: "GAME_ACCOUNT", id: "account-1" },
          set: {},
          unset: ["chat.fontScalePercent"],
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
