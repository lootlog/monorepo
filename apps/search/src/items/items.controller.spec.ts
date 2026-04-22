import { Test, type TestingModule } from "@nestjs/testing";
import { ItemsController } from "./items.controller";
import { ItemsService } from "./items.service";

describe("ItemsController", () => {
  let controller: ItemsController;

  const itemsServiceMock = {
    searchItems: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItemsController],
      providers: [
        {
          provide: ItemsService,
          useValue: itemsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ItemsController>(ItemsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getItems", () => {
    it("should delegate query to items service", async () => {
      const query = {
        limit: 20,
        offset: 0,
        search: "miecz",
        world: "Berufs",
      };

      const response = {
        hits: [{ id: 1, name: "Miecz" }],
        estimatedTotalHits: 1,
        facetDistribution: {},
        facetStats: {},
      };
      itemsServiceMock.searchItems.mockResolvedValue(response);

      await expect(controller.getItems(query)).resolves.toEqual(response);
      expect(itemsServiceMock.searchItems).toHaveBeenCalledWith(query);
    });
  });
});
