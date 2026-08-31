import type { PrismaDb } from "#src/db/prisma.provider";
import { MapTemplatesService } from "./map-templates.service.js";

describe("MapTemplatesService", () => {
  const templatesAllMock = vi.fn();
  const templatesOrderByMock = vi.fn(() => ({ all: templatesAllMock }));
  const templatesSelectMock = vi.fn(() => ({
    orderBy: templatesOrderByMock,
  }));
  const templatesWhereMock = vi.fn(() => ({ select: templatesSelectMock }));
  const templateCreateMock = vi.fn();
  const prismaMock = {
    orm: {
      public: {
        MapTemplate: {
          create: templateCreateMock,
          where: templatesWhereMock,
        },
      },
    },
  } as unknown as PrismaDb;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads templates through Prisma and preserves the response contract", async () => {
    templatesAllMock.mockResolvedValue([
      {
        id: "template-1",
        guildId: "guild-1",
        name: "A template",
        maps: [{ id: 1, name: "Map" }],
        createdAt: {
          toString: () => "2026-08-31T10:00:00.000",
        },
      },
    ]);
    const service = new MapTemplatesService(prismaMock);

    await expect(service.getTemplates("guild-1")).resolves.toEqual([
      {
        id: "template-1",
        guildId: "guild-1",
        name: "A template",
        maps: [{ id: 1, name: "Map" }],
        createdAt: new Date("2026-08-31T08:00:00.000Z"),
      },
    ]);

    expect(templatesWhereMock).toHaveBeenCalledWith(expect.any(Function));
    expect(templatesSelectMock).toHaveBeenCalledWith(
      "id",
      "guildId",
      "name",
      "maps",
      "createdAt",
    );
    expect(templatesOrderByMock).toHaveBeenCalledOnce();
    expect(templatesAllMock).toHaveBeenCalledOnce();
  });

  it("creates templates through Prisma", async () => {
    templateCreateMock.mockResolvedValue({
      id: "template-1",
      guildId: "guild-1",
      name: "A template",
      maps: [{ id: 1, name: "Map" }],
      createdAt: { toString: () => "2026-08-31T10:00:00.000" },
    });
    const service = new MapTemplatesService(prismaMock);

    await expect(
      service.createTemplate("guild-1", {
        name: "A template",
        maps: [{ id: 1, name: "Map" }],
      }),
    ).resolves.toMatchObject({
      guildId: "guild-1",
      name: "A template",
    });

    expect(templateCreateMock).toHaveBeenCalledWith({
      id: expect.any(String),
      guildId: "guild-1",
      name: "A template",
      maps: [{ id: 1, name: "Map" }],
    });
  });
});
