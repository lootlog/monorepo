import { Test, type TestingModule } from "@nestjs/testing";
import { NpcsController } from "./npcs.controller";
import { NpcsService } from "./npcs.service";

describe("NpcsController", () => {
  let controller: NpcsController;

  const npcsServiceMock = {
    getNpcs: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NpcsController],
      providers: [
        {
          provide: NpcsService,
          useValue: npcsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<NpcsController>(NpcsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getNpcs", () => {
    it("should delegate query to npcs service", async () => {
      const query = {
        limit: 10,
        search: "tanroth",
        world: "Berufs",
      };

      const response = [{ id: 1, name: "Tanroth" }];
      npcsServiceMock.getNpcs.mockResolvedValue(response);

      await expect(controller.getNpcs(query)).resolves.toEqual(response);
      expect(npcsServiceMock.getNpcs).toHaveBeenCalledWith(query);
    });
  });
});
