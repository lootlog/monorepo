import { Test, type TestingModule } from "@nestjs/testing";
import { ItemsController } from "./items.controller";
import { ItemsService } from "./items.service";

describe("ItemsController", () => {
  let controller: ItemsController;

  const itemsServiceMock = {
    getItems: vi.fn(),
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
        limit: 3,
        search: "miecz",
        world: "Berufs",
      };

      const response = [{ id: 1, name: "Miecz" }];
      itemsServiceMock.getItems.mockResolvedValue(response);

      await expect(controller.getItems(query)).resolves.toEqual(response);
      expect(itemsServiceMock.getItems).toHaveBeenCalledWith(query);
    });
  });
});
