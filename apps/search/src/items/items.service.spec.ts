import { Test, type TestingModule } from "@nestjs/testing";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ITEMS_INDEX } from "./constants/meilisearch.js";
import { ItemsService } from "./items.service.js";
import { MEILISEARCH_CLIENT } from "#src/meilisearch/meilisearch.constants";

describe("ItemsService", () => {
  let service: ItemsService;

  const loggerMock = {
    error: vi.fn<(message: string, context?: unknown) => void>(),
    warn: vi.fn<(message: string, context?: unknown) => void>(),
  };

  const indexMock = {
    search: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
    addDocuments: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
    getDocument: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const meilisearchMock = {
    index: vi.fn<() => typeof indexMock>(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    meilisearchMock.index.mockReturnValue(indexMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
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

    service = module.get<ItemsService>(ItemsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getItems", () => {
    it("should search items with world filter", async () => {
      const hits = [{ id: 1, name: "Sword", stat: "lvl=10" }];
      indexMock.search.mockResolvedValue({ hits });

      await expect(
        service.getItems({
          limit: 3,
          search: "sword",
          world: "Berufs",
        }),
      ).resolves.toEqual(hits);

      expect(meilisearchMock.index).toHaveBeenCalledWith(ITEMS_INDEX);
      expect(indexMock.search).toHaveBeenCalledWith("sword", {
        limit: 3,
        offset: 0,
        attributesToSearchOn: ["name", "stat"],
        attributesToRetrieve: [
          "id",
          "name",
          "icon",
          "stat",
          "lvl",
          "rarity",
          "type",
          "world",
          "worlds",
        ],
        filter: '(worlds = "Berufs" OR world = "Berufs")',
      });
    });

    it("should expose facets, sort and estimated total hits for item search", async () => {
      indexMock.search.mockResolvedValue({
        hits: [{ id: 1, name: "Sword", stat: "dmg=50" }],
        estimatedTotalHits: 25,
        facetDistribution: {
          rarity: {
            UNIQUE: 10,
          },
        },
        facetStats: {
          "numericStats.dmg": {
            min: 10,
            max: 50,
          },
        },
      });

      await expect(
        service.searchItems({
          limit: 10,
          offset: 20,
          search: "sword",
          world: "Berufs",
          filter: ["numericStats.dmg >= 40", 'requiredProfessions = "w"'],
          facets: ["rarity", "requiredProfessions"],
          sort: ["lvl:desc"],
        }),
      ).resolves.toEqual({
        hits: [{ id: 1, name: "Sword", stat: "dmg=50" }],
        estimatedTotalHits: 25,
        facetDistribution: {
          rarity: {
            UNIQUE: 10,
          },
        },
        facetStats: {
          "numericStats.dmg": {
            min: 10,
            max: 50,
          },
        },
      });

      expect(indexMock.search).toHaveBeenCalledWith("sword", {
        limit: 10,
        offset: 20,
        attributesToSearchOn: ["name", "stat"],
        attributesToRetrieve: [
          "id",
          "name",
          "icon",
          "stat",
          "lvl",
          "rarity",
          "type",
          "world",
          "worlds",
        ],
        filter:
          'numericStats.dmg >= 40 AND requiredProfessions = "w" AND (worlds = "Berufs" OR world = "Berufs")',
        facets: ["rarity", "requiredProfessions"],
        sort: ["lvl:desc"],
      });
    });

    it("should use total hits when estimated total hits are missing", async () => {
      indexMock.search.mockResolvedValue({
        hits: [{ id: 1, name: "Sword", stat: "dmg=50" }],
        totalHits: 42,
      });

      await expect(
        service.searchItems({
          limit: 10,
          offset: 0,
          search: "sword",
        }),
      ).resolves.toEqual({
        hits: [{ id: 1, name: "Sword", stat: "dmg=50" }],
        estimatedTotalHits: 42,
        facetDistribution: {},
        facetStats: {},
      });
    });

    it("should return an empty array when meilisearch search fails", async () => {
      const error = new Error("search failed");
      indexMock.search.mockRejectedValue(error);

      await expect(
        service.getItems({
          limit: 3,
          search: "sword",
          world: "Berufs",
        }),
      ).resolves.toEqual([]);

      expect(loggerMock.error).toHaveBeenCalledWith("Items search error", {
        error,
      });
    });

    it("should return an empty search response when meilisearch search fails", async () => {
      const error = new Error("search failed");
      indexMock.search.mockRejectedValue(error);

      await expect(
        service.searchItems({
          limit: 10,
          offset: 0,
          search: "sword",
        }),
      ).resolves.toEqual({
        hits: [],
        estimatedTotalHits: 0,
        facetDistribution: {},
        facetStats: {},
      });
    });

    it("should retry search without stat attribute when index settings are stale", async () => {
      indexMock.search
        .mockRejectedValueOnce({
          cause: { code: "invalid_search_attributes_to_search_on" },
        })
        .mockResolvedValueOnce({
          hits: [{ id: 1, name: "Sword", stat: "lvl=10" }],
        });

      await expect(
        service.searchItems({
          limit: 10,
          offset: 0,
          search: "sword",
        }),
      ).resolves.toEqual({
        hits: [{ id: 1, name: "Sword", stat: "lvl=10" }],
        estimatedTotalHits: 1,
        facetDistribution: {},
        facetStats: {},
      });

      expect(indexMock.search).toHaveBeenNthCalledWith(1, "sword", {
        limit: 10,
        offset: 0,
        attributesToSearchOn: ["name", "stat"],
        attributesToRetrieve: [
          "id",
          "name",
          "icon",
          "stat",
          "lvl",
          "rarity",
          "type",
          "world",
          "worlds",
        ],
      });
      expect(indexMock.search).toHaveBeenNthCalledWith(2, "sword", {
        limit: 10,
        offset: 0,
        attributesToSearchOn: ["name"],
        attributesToRetrieve: [
          "id",
          "name",
          "icon",
          "stat",
          "lvl",
          "rarity",
          "type",
          "world",
          "worlds",
        ],
      });
      expect(loggerMock.warn).toHaveBeenCalledWith(
        "Items index settings are stale, retrying search without stat attribute",
        {
          error: {
            cause: { code: "invalid_search_attributes_to_search_on" },
          },
        },
      );
    });
  });

  describe("indexItems", () => {
    it("should index valid items with generated uid and worlds", async () => {
      const items = [
        {
          id: 1,
          name: "Sword",
          icon: "sword.png",
          stat: "lvl=10",
          lvl: 10,
          rarity: "heroic",
          type: "weapon",
          world: "Berufs",
        },
      ];

      const task = { taskUid: 123 };
      indexMock.getDocument.mockRejectedValue({
        cause: { code: "document_not_found" },
      });
      indexMock.addDocuments.mockResolvedValue(task);

      await expect(service.indexItems({ items })).resolves.toEqual(task);

      expect(indexMock.addDocuments).toHaveBeenCalledWith(
        [
          {
            id: 1,
            name: "Sword",
            icon: "sword.png",
            stat: "lvl=10",
            lvl: 10,
            rarity: "heroic",
            type: "weapon",
            worlds: ["Berufs"],
            uid: "1",
            stats: {
              lvl: 10,
            },
            numericStats: {
              lvl: 10,
            },
            statsKeys: ["lvl"],
            requiredProfessions: ["w", "p", "h", "m", "b", "t"],
          },
        ],
        { primaryKey: "uid" },
      );
    });

    it("should merge duplicate items and existing worlds", async () => {
      const items = [
        {
          id: 1,
          name: "Old Sword",
          icon: "old-sword.png",
          stat: "lvl=9",
          lvl: 9,
          rarity: "unique",
          type: "weapon",
          world: "Berufs",
        },
        {
          id: 1,
          name: "Sword",
          icon: "sword.png",
          stat: "lvl=10",
          lvl: 10,
          rarity: "heroic",
          type: "weapon",
          world: "Aether",
        },
      ];
      const task = { taskUid: 123 };

      indexMock.getDocument.mockResolvedValue({
        worlds: ["Cronus"],
      });
      indexMock.addDocuments.mockResolvedValue(task);

      await expect(service.indexItems({ items })).resolves.toEqual(task);

      expect(indexMock.addDocuments).toHaveBeenCalledWith(
        [
          {
            id: 1,
            name: "Sword",
            icon: "sword.png",
            stat: "lvl=10",
            lvl: 10,
            rarity: "heroic",
            type: "weapon",
            worlds: ["Aether", "Berufs", "Cronus"],
            uid: "1",
            stats: {
              lvl: 10,
            },
            numericStats: {
              lvl: 10,
            },
            statsKeys: ["lvl"],
            requiredProfessions: ["w", "p", "h", "m", "b", "t"],
          },
        ],
        { primaryKey: "uid" },
      );
    });

    it("should skip invalid items and log a warning", async () => {
      const items = [
        {
          id: 1,
          name: "Sword",
          icon: "sword.png",
          stat: "lvl=10",
          lvl: 10,
          rarity: "heroic",
          type: "weapon",
          world: "Berufs",
        },
        {
          id: 2,
          name: "",
          icon: "broken.png",
          stat: "lvl=1",
          lvl: 1,
          rarity: null,
          type: null,
          world: "Berufs",
        },
      ];

      indexMock.getDocument.mockRejectedValue({
        cause: { code: "document_not_found" },
      });

      await service.indexItems({ items });

      expect(indexMock.getDocument).toHaveBeenCalledWith("1");
      expect(loggerMock.warn).toHaveBeenCalledWith(
        "Skipped 1 items due to missing required fields",
      );
      expect(indexMock.addDocuments).toHaveBeenCalledWith(
        [
          {
            id: 1,
            name: "Sword",
            icon: "sword.png",
            stat: "lvl=10",
            lvl: 10,
            rarity: "heroic",
            type: "weapon",
            worlds: ["Berufs"],
            uid: "1",
            stats: {
              lvl: 10,
            },
            numericStats: {
              lvl: 10,
            },
            statsKeys: ["lvl"],
            requiredProfessions: ["w", "p", "h", "m", "b", "t"],
          },
        ],
        { primaryKey: "uid" },
      );
    });

    it("should log and skip when all items are invalid", async () => {
      const items = [
        {
          id: 1,
          name: "",
          icon: "broken.png",
          stat: "lvl=1",
          lvl: 1,
          rarity: null,
          type: null,
          world: "Berufs",
        },
      ];

      await expect(service.indexItems({ items })).resolves.toBeUndefined();

      expect(loggerMock.warn).toHaveBeenCalledWith(
        "No valid items to index (missing required fields)",
      );
      expect(indexMock.addDocuments).not.toHaveBeenCalled();
    });

    it("should log and swallow when addDocuments rejects", async () => {
      const items = [
        {
          id: 1,
          name: "Sword",
          icon: "sword.png",
          stat: "lvl=10",
          lvl: 10,
          rarity: "heroic",
          type: "weapon",
          world: "Berufs",
        },
      ];
      const error = new Error("index failed");

      indexMock.getDocument.mockRejectedValue({
        cause: { code: "document_not_found" },
      });
      indexMock.addDocuments.mockRejectedValue(error);

      await expect(service.indexItems({ items })).resolves.toBeUndefined();

      expect(loggerMock.error).toHaveBeenCalledWith("Error indexing items", {
        error,
      });
    });
  });
});
