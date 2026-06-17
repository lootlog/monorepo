import { Test, type TestingModule } from "@nestjs/testing";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ITEMS_INDEX } from "src/items/constants/meilisearch";
import { NPCS_INDEX } from "src/npcs/constants/meilisearch";
import { PLAYERS_INDEX } from "src/players/constants/meilisearch";
import { MeilisearchIndexesService } from "./meilisearch-indexes.service";
import { MEILISEARCH_CLIENT } from "./meilisearch.constants";

describe("MeilisearchIndexesService", () => {
  let service: MeilisearchIndexesService;

  const loggerMock = {
    error: vi.fn(),
  };

  const npcsFilterTask = {
    waitTask: vi.fn(),
  };

  const playersFilterTask = {
    waitTask: vi.fn(),
  };

  const itemsFilterTask = {
    waitTask: vi.fn(),
  };

  const itemsSearchTask = {
    waitTask: vi.fn(),
  };

  const itemsSortTask = {
    waitTask: vi.fn(),
  };

  const itemsDistinctTask = {
    waitTask: vi.fn(),
  };

  const createIndexTask = {
    waitTask: vi.fn(),
  };

  const npcsIndexMock = {
    updateFilterableAttributes: vi.fn(),
  };

  const playersIndexMock = {
    updateFilterableAttributes: vi.fn(),
  };

  const itemsIndexMock = {
    updateDistinctAttribute: vi.fn(),
    updateFilterableAttributes: vi.fn(),
    updateSearchableAttributes: vi.fn(),
    updateSortableAttributes: vi.fn(),
  };

  const meilisearchMock = {
    createIndex: vi.fn(),
    getIndex: vi.fn(),
    index: vi.fn(),
  };

  beforeEach(async () => {
    npcsFilterTask.waitTask.mockResolvedValue(undefined);
    playersFilterTask.waitTask.mockResolvedValue(undefined);
    itemsFilterTask.waitTask.mockResolvedValue(undefined);
    itemsSearchTask.waitTask.mockResolvedValue(undefined);
    itemsSortTask.waitTask.mockResolvedValue(undefined);
    itemsDistinctTask.waitTask.mockResolvedValue(undefined);
    createIndexTask.waitTask.mockResolvedValue(undefined);

    npcsIndexMock.updateFilterableAttributes.mockReturnValue(npcsFilterTask);
    playersIndexMock.updateFilterableAttributes.mockReturnValue(
      playersFilterTask,
    );
    itemsIndexMock.updateFilterableAttributes.mockReturnValue(itemsFilterTask);
    itemsIndexMock.updateSearchableAttributes.mockReturnValue(itemsSearchTask);
    itemsIndexMock.updateSortableAttributes.mockReturnValue(itemsSortTask);
    itemsIndexMock.updateDistinctAttribute.mockReturnValue(itemsDistinctTask);
    meilisearchMock.getIndex.mockResolvedValue(undefined);
    meilisearchMock.createIndex.mockReturnValue(createIndexTask);

    meilisearchMock.index.mockImplementation((indexName: string) => {
      if (indexName === NPCS_INDEX) {
        return npcsIndexMock;
      }

      if (indexName === PLAYERS_INDEX) {
        return playersIndexMock;
      }

      if (indexName === ITEMS_INDEX) {
        return itemsIndexMock;
      }

      throw new Error(`Unexpected index ${indexName}`);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeilisearchIndexesService,
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

    service = module.get<MeilisearchIndexesService>(MeilisearchIndexesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("onApplicationBootstrap", () => {
    it("should configure filterable and searchable attributes", async () => {
      await service.onApplicationBootstrap();

      expect(meilisearchMock.getIndex).toHaveBeenCalledWith(NPCS_INDEX);
      expect(meilisearchMock.getIndex).toHaveBeenCalledWith(PLAYERS_INDEX);
      expect(meilisearchMock.getIndex).toHaveBeenCalledWith(ITEMS_INDEX);
      expect(npcsIndexMock.updateFilterableAttributes).toHaveBeenCalledWith([
        "name",
        "type",
        "world",
      ]);
      expect(playersIndexMock.updateFilterableAttributes).toHaveBeenCalledWith([
        "name",
        "world",
      ]);
      expect(itemsIndexMock.updateFilterableAttributes).toHaveBeenCalledWith([
        "world",
        "worlds",
        "type",
        "rarity",
        "lvl",
        "stats",
        "numericStats",
        "requiredProfessions",
        "statsKeys",
      ]);
      expect(itemsIndexMock.updateSearchableAttributes).toHaveBeenCalledWith([
        "name",
        "stat",
      ]);
      expect(itemsIndexMock.updateSortableAttributes).toHaveBeenCalledWith([
        "name",
        "lvl",
        "rarity",
        "type",
      ]);
      expect(itemsIndexMock.updateDistinctAttribute).toHaveBeenCalledWith("id");
      expect(loggerMock.error).not.toHaveBeenCalled();
    });

    it("should create missing indexes before applying settings", async () => {
      meilisearchMock.getIndex
        .mockRejectedValueOnce({
          cause: { code: "index_not_found" },
        })
        .mockRejectedValueOnce({
          cause: { code: "index_not_found" },
        })
        .mockRejectedValueOnce({
          cause: { code: "index_not_found" },
        });

      await service.onApplicationBootstrap();

      expect(meilisearchMock.createIndex).toHaveBeenCalledWith(NPCS_INDEX, {
        primaryKey: "uid",
      });
      expect(meilisearchMock.createIndex).toHaveBeenCalledWith(PLAYERS_INDEX, {
        primaryKey: "uid",
      });
      expect(meilisearchMock.createIndex).toHaveBeenCalledWith(ITEMS_INDEX, {
        primaryKey: "uid",
      });
    });

    it("should log an error when configuration fails", async () => {
      const error = new Error("bootstrap failed");
      itemsSearchTask.waitTask.mockRejectedValue(error);

      await service.onApplicationBootstrap();

      expect(loggerMock.error).toHaveBeenCalledWith(
        "Failed to configure Meilisearch indexes",
        { error },
      );
    });
  });
});
