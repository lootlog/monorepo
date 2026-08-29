import { Test, type TestingModule } from "@nestjs/testing";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { MEILISEARCH_CLIENT } from "#src/meilisearch/meilisearch.constants";
import { PLAYERS_INDEX } from "./constants/meilisearch.js";
import { PlayersService } from "./players.service.js";

describe("PlayersService", () => {
  let service: PlayersService;

  const loggerMock = {
    error: vi.fn(),
    warn: vi.fn(),
  };

  const indexMock = {
    search: vi.fn(),
    addDocuments: vi.fn(),
  };

  const meilisearchMock = {
    index: vi.fn(),
  };

  beforeEach(async () => {
    meilisearchMock.index.mockReturnValue(indexMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayersService,
        {
          provide: MEILISEARCH_CLIENT,
          useValue: meilisearchMock,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: loggerMock,
        },
      ],
    }).compile();

    service = module.get<PlayersService>(PlayersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getPlayers", () => {
    it("should search players by a single term", async () => {
      const hits = [{ id: "1", name: "Hero" }];
      indexMock.search.mockResolvedValue({ hits });

      await expect(
        service.getPlayers({
          limit: 10,
          search: "hero",
          world: "Berufs",
        }),
      ).resolves.toEqual(hits);

      expect(meilisearchMock.index).toHaveBeenCalledWith(PLAYERS_INDEX);
      expect(indexMock.search).toHaveBeenCalledWith("hero", {
        limit: 10,
        attributesToSearchOn: ["name"],
        filter: 'world = "Berufs"',
      });
    });

    it("should search players by multiple names using IN filter", async () => {
      const hits = [{ id: "1", name: "Hero" }];
      indexMock.search.mockResolvedValue({ hits });

      await expect(
        service.getPlayers({
          limit: 10,
          search: ["Hero", "Villain"],
          world: "Berufs",
        }),
      ).resolves.toEqual(hits);

      expect(indexMock.search).toHaveBeenCalledWith("", {
        limit: 10,
        attributesToSearchOn: ["name"],
        filter: 'name IN ["Hero", "Villain"] AND world = "Berufs"',
      });
    });

    it("should return an empty array when meilisearch search fails", async () => {
      const error = new Error("search failed");
      indexMock.search.mockRejectedValue(error);

      await expect(
        service.getPlayers({
          limit: 10,
          search: "hero",
          world: "Berufs",
        }),
      ).resolves.toEqual([]);

      expect(loggerMock.error).toHaveBeenCalledWith("Players search error", {
        error,
      });
    });
  });

  describe("indexPlayers", () => {
    it("should index valid players with sanitized uid", async () => {
      const players = [
        {
          id: "123",
          name: "Bob The_Hero!",
          lvl: 40,
          prof: "w",
          icon: "hero.png",
          characterId: 10,
          accountId: 20,
          world: "Berufs",
        },
      ];

      const task = { taskUid: 123 };
      indexMock.addDocuments.mockResolvedValue(task);

      await expect(service.indexPlayers({ players })).resolves.toEqual(task);

      expect(indexMock.addDocuments).toHaveBeenCalledWith(
        [
          {
            ...players[0],
            uid: "123_BobThe_Hero_Berufs",
          },
        ],
        { primaryKey: "uid" },
      );
    });

    it("should skip invalid players and log a warning", async () => {
      const players = [
        {
          id: "123",
          name: "Hero",
          lvl: 40,
          prof: "w",
          icon: "hero.png",
          characterId: 10,
          accountId: 20,
          world: "Berufs",
        },
        {
          id: "",
          name: "Broken",
          lvl: 1,
          prof: "m",
          icon: "broken.png",
          characterId: 11,
          accountId: 21,
          world: "Berufs",
        },
      ];

      await service.indexPlayers({ players });

      expect(loggerMock.warn).toHaveBeenCalledWith(
        "Skipped 1 players due to missing required fields",
        expect.objectContaining({
          invalidPlayers: [players[1]],
        }),
      );
      expect(indexMock.addDocuments).toHaveBeenCalledWith(
        [
          {
            ...players[0],
            uid: "123_Hero_Berufs",
          },
        ],
        { primaryKey: "uid" },
      );
    });

    it("should log and skip when all players are invalid", async () => {
      const players = [
        {
          id: "",
          name: "Broken",
          lvl: 1,
          prof: "m",
          icon: "broken.png",
          characterId: 11,
          accountId: 21,
          world: "",
        },
      ];

      await expect(service.indexPlayers({ players })).resolves.toBeUndefined();

      expect(loggerMock.warn).toHaveBeenCalledWith(
        "No valid players to index (missing required fields)",
        expect.objectContaining({
          players,
        }),
      );
      expect(indexMock.addDocuments).not.toHaveBeenCalled();
    });

    it("should log and swallow when addDocuments rejects", async () => {
      const players = [
        {
          id: "123",
          name: "Hero",
          lvl: 40,
          prof: "w",
          icon: "hero.png",
          characterId: 10,
          accountId: 20,
          world: "Berufs",
        },
      ];
      const error = new Error("index failed");

      indexMock.addDocuments.mockRejectedValue(error);

      await expect(service.indexPlayers({ players })).resolves.toBeUndefined();

      expect(loggerMock.error).toHaveBeenCalledWith("Error indexing players", {
        error,
      });
    });
  });
});
