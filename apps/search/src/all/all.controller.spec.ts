import { Test, type TestingModule } from "@nestjs/testing";
import { AllController } from "./all.controller.js";
import { AllService } from "./all.service.js";

describe("AllController", () => {
  let controller: AllController;

  const allServiceMock = {
    searchAll: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AllController],
      providers: [
        {
          provide: AllService,
          useValue: allServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AllController>(AllController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("searchAll", () => {
    it("should delegate query to all service", async () => {
      const query = {
        limit: 10,
        search: "mushita",
        world: "Berufs",
      };

      const response = {
        items: [],
        players: [],
        npcs: [],
      };

      allServiceMock.searchAll.mockResolvedValue(response);

      await expect(controller.searchAll(query)).resolves.toEqual(response);
      expect(allServiceMock.searchAll).toHaveBeenCalledWith(query);
    });
  });
});
