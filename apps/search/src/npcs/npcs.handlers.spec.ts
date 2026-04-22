import { Test, type TestingModule } from "@nestjs/testing";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { NpcsHandlers } from "./npcs.handlers";
import { NpcsService } from "./npcs.service";

describe("NpcsHandlers", () => {
  let handler: NpcsHandlers;

  const npcsServiceMock = {
    indexNpcs: vi.fn(),
  };

  const loggerMock = {
    error: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NpcsHandlers,
        {
          provide: NpcsService,
          useValue: npcsServiceMock,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: loggerMock,
        },
      ],
    }).compile();

    handler = module.get<NpcsHandlers>(NpcsHandlers);
  });

  it("should be defined", () => {
    expect(handler).toBeDefined();
  });

  describe("handleNpcsIndex", () => {
    it("should forward valid payload to npcs service", async () => {
      const payload = [
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

      await handler.handleNpcsIndex(payload);

      expect(npcsServiceMock.indexNpcs).toHaveBeenCalledWith({
        npcs: payload,
      });
    });

    it("should log validation errors and skip invalid payload", async () => {
      await handler.handleNpcsIndex([{ id: 1 }]);

      expect(npcsServiceMock.indexNpcs).not.toHaveBeenCalled();
      expect(loggerMock.error).toHaveBeenCalledWith(
        "Validation error in npcs index handler",
        expect.objectContaining({
          error: expect.any(Object),
        }),
      );
    });
  });
});
