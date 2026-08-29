import { Test, type TestingModule } from "@nestjs/testing";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ItemsHandlers } from "./items.handlers.js";
import { ItemsService } from "./items.service.js";

describe("ItemsHandlers", () => {
  let handler: ItemsHandlers;

  const itemsServiceMock = {
    indexItems: vi.fn(),
  };

  const loggerMock = {
    error: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsHandlers,
        {
          provide: ItemsService,
          useValue: itemsServiceMock,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: loggerMock,
        },
      ],
    }).compile();

    handler = module.get<ItemsHandlers>(ItemsHandlers);
  });

  it("should be defined", () => {
    expect(handler).toBeDefined();
  });

  describe("handleItemsIndex", () => {
    it("should forward valid payload to items service", async () => {
      const payload = [
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

      await handler.handleItemsIndex(payload);

      expect(itemsServiceMock.indexItems).toHaveBeenCalledWith({
        items: [
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
        ],
      });
    });

    it("should log validation errors and skip invalid payload", async () => {
      await handler.handleItemsIndex({ id: 1 });

      expect(itemsServiceMock.indexItems).not.toHaveBeenCalled();
      expect(loggerMock.error).toHaveBeenCalledWith(
        "Validation error in items index handler",
        expect.objectContaining({
          error: expect.any(Object),
        }),
      );
    });
  });
});
