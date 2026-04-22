import { Test, type TestingModule } from "@nestjs/testing";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ITEMS_INDEX } from "./constants/meilisearch";
import { ItemsService } from "./items.service";
import { MEILISEARCH_CLIENT } from "src/meilisearch/meilisearch.constants";

describe("ItemsService", () => {
  let service: ItemsService;

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
      const hits = [{ id: 1, name: "Sword" }];
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
        attributesToSearchOn: ["name"],
        filter: 'world = "Berufs"',
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
  });

  describe("indexItems", () => {
    it("should index valid items with generated uid and default hid", async () => {
      const items = [
        {
          id: 1,
          name: "Sword",
          icon: "sword.png",
          lvl: 10,
          rarity: "heroic",
          type: "weapon",
          world: "Berufs",
        },
      ];

      const task = { taskUid: 123 };
      indexMock.addDocuments.mockResolvedValue(task);

      await expect(service.indexItems({ items })).resolves.toEqual(task);

      expect(indexMock.addDocuments).toHaveBeenCalledWith(
        [
          {
            ...items[0],
            hid: "",
            uid: "1_Berufs",
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
          lvl: 10,
          rarity: "heroic",
          type: "weapon",
          world: "Berufs",
        },
        {
          id: 2,
          name: "",
          icon: "broken.png",
          lvl: 1,
          rarity: null,
          type: null,
          world: "Berufs",
        },
      ];

      await service.indexItems({ items });

      expect(loggerMock.warn).toHaveBeenCalledWith(
        "Skipped 1 items due to missing required fields",
      );
      expect(indexMock.addDocuments).toHaveBeenCalledWith(
        [
          {
            ...items[0],
            hid: "",
            uid: "1_Berufs",
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
          hid: "hid-1",
          name: "Sword",
          icon: "sword.png",
          lvl: 10,
          rarity: "heroic",
          type: "weapon",
          world: "Berufs",
        },
      ];
      const error = new Error("index failed");

      indexMock.addDocuments.mockRejectedValue(error);

      await expect(service.indexItems({ items })).resolves.toBeUndefined();

      expect(loggerMock.error).toHaveBeenCalledWith("Error indexing items", {
        error,
      });
    });
  });
});
