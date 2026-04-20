import { Test, type TestingModule } from "@nestjs/testing";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { MEILISEARCH_CLIENT } from "src/meilisearch/meilisearch.constants";
import { NPCS_INDEX } from "./constants/meilisearch";
import { NpcsService } from "./npcs.service";

describe("NpcsService", () => {
  let service: NpcsService;

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
        NpcsService,
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

    service = module.get<NpcsService>(NpcsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getNpcs", () => {
    it("should search npcs by multiple names using IN filter", async () => {
      const hits = [
        {
          id: 1,
          prof: "w",
          icon: "npc.png",
          name: "Tanroth",
          lvl: 300,
          wt: 300,
          type: "titan",
          margonemType: 10,
          world: "Berufs",
        },
      ];
      indexMock.search.mockResolvedValue({ hits });

      await expect(
        service.getNpcs({
          limit: 10,
          search: ["Tanroth", "Mushita"],
          world: "Berufs",
        }),
      ).resolves.toEqual(hits);

      expect(meilisearchMock.index).toHaveBeenCalledWith(NPCS_INDEX);
      expect(indexMock.search).toHaveBeenCalledWith("", {
        limit: 10,
        attributesToSearchOn: ["name"],
        filter: 'name IN ["Tanroth", "Mushita"] AND world = "Berufs"',
      });
    });

    it("should deduplicate hits by name and type keeping the first hit", async () => {
      const duplicatedNpc = {
        id: 1,
        prof: "w",
        icon: "npc.png",
        name: "Tanroth",
        lvl: 300,
        wt: 300,
        type: "titan",
        margonemType: 10,
        world: "Berufs",
      };
      const uniqueNpc = {
        id: 2,
        prof: "m",
        icon: "npc2.png",
        name: "Mushita",
        lvl: 250,
        wt: 250,
        type: "hero",
        margonemType: 11,
        world: "Berufs",
      };

      indexMock.search.mockResolvedValue({
        hits: [duplicatedNpc, { ...duplicatedNpc, id: 99 }, uniqueNpc],
      });

      await expect(
        service.getNpcs({
          limit: 10,
          search: "boss",
          world: "Berufs",
        }),
      ).resolves.toEqual([duplicatedNpc, uniqueNpc]);
    });

    it("should return an empty array when meilisearch search fails", async () => {
      const error = new Error("search failed");
      indexMock.search.mockRejectedValue(error);

      await expect(
        service.getNpcs({
          limit: 10,
          search: "tanroth",
          world: "Berufs",
        }),
      ).resolves.toEqual([]);

      expect(loggerMock.error).toHaveBeenCalledWith("NPC search error", {
        error,
      });
    });
  });

  describe("indexNpcs", () => {
    it("should index valid npcs with generated uid", async () => {
      const npcs = [
        {
          id: 1,
          prof: "w",
          icon: "npc.png",
          name: "Tanroth",
          lvl: 300,
          wt: 300,
          type: "titan",
          margonemType: 10,
          world: "Berufs",
        },
      ];

      const task = { taskUid: 123 };
      indexMock.addDocuments.mockResolvedValue(task);

      await expect(service.indexNpcs({ npcs })).resolves.toEqual(task);

      expect(indexMock.addDocuments).toHaveBeenCalledWith(
        [
          {
            ...npcs[0],
            uid: "1_titan_Berufs",
          },
        ],
        { primaryKey: "uid" },
      );
    });

    it("should skip invalid npcs and log a warning", async () => {
      const npcs = [
        {
          id: 1,
          prof: "w",
          icon: "npc.png",
          name: "Tanroth",
          lvl: 300,
          wt: 300,
          type: "titan",
          margonemType: 10,
          world: "Berufs",
        },
        {
          id: 2,
          prof: "m",
          icon: "npc2.png",
          name: "",
          lvl: 1,
          wt: 1,
          type: "mob",
          margonemType: 1,
          world: "Berufs",
        },
      ];

      await service.indexNpcs({ npcs });

      expect(loggerMock.warn).toHaveBeenCalledWith(
        "Skipped 1 npcs due to missing required fields",
        expect.objectContaining({
          invalidNpcs: [npcs[1]],
        }),
      );
      expect(indexMock.addDocuments).toHaveBeenCalledWith(
        [
          {
            ...npcs[0],
            uid: "1_titan_Berufs",
          },
        ],
        { primaryKey: "uid" },
      );
    });

    it("should log and skip when all npcs are invalid", async () => {
      const npcs = [
        {
          id: 0,
          prof: "m",
          icon: "npc2.png",
          name: "",
          lvl: 1,
          wt: 1,
          type: "mob",
          margonemType: 1,
          world: "",
        },
      ];

      await expect(service.indexNpcs({ npcs })).resolves.toBeUndefined();

      expect(loggerMock.warn).toHaveBeenCalledWith(
        "No valid npcs to index (missing required fields)",
        expect.objectContaining({
          npcs,
        }),
      );
      expect(indexMock.addDocuments).not.toHaveBeenCalled();
    });

    it("should log and swallow when addDocuments rejects", async () => {
      const npcs = [
        {
          id: 1,
          prof: "w",
          icon: "npc.png",
          name: "Tanroth",
          lvl: 300,
          wt: 300,
          type: "titan",
          margonemType: 10,
          world: "Berufs",
        },
      ];
      const error = new Error("index failed");

      indexMock.addDocuments.mockRejectedValue(error);

      await expect(service.indexNpcs({ npcs })).resolves.toBeUndefined();

      expect(loggerMock.error).toHaveBeenCalledWith("Error indexing npcs", {
        error,
      });
    });
  });
});
