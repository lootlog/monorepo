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

  const npcsIndexMock = {
    updateFilterableAttributes: vi.fn(),
  };

  const playersIndexMock = {
    updateFilterableAttributes: vi.fn(),
  };

  const itemsIndexMock = {
    updateFilterableAttributes: vi.fn(),
    updateSearchableAttributes: vi.fn(),
  };

  const meilisearchMock = {
    index: vi.fn(),
  };

  beforeEach(async () => {
    npcsFilterTask.waitTask.mockResolvedValue(undefined);
    playersFilterTask.waitTask.mockResolvedValue(undefined);
    itemsFilterTask.waitTask.mockResolvedValue(undefined);
    itemsSearchTask.waitTask.mockResolvedValue(undefined);

    npcsIndexMock.updateFilterableAttributes.mockReturnValue(npcsFilterTask);
    playersIndexMock.updateFilterableAttributes.mockReturnValue(
      playersFilterTask,
    );
    itemsIndexMock.updateFilterableAttributes.mockReturnValue(itemsFilterTask);
    itemsIndexMock.updateSearchableAttributes.mockReturnValue(itemsSearchTask);

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
        "name",
        "world",
      ]);
      expect(itemsIndexMock.updateSearchableAttributes).toHaveBeenCalledWith([
        "name",
      ]);
      expect(loggerMock.error).not.toHaveBeenCalled();
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
