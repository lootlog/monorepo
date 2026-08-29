import { Test, type TestingModule } from "@nestjs/testing";
import { ItemsService } from "#src/items/items.service";
import { NpcsService } from "#src/npcs/npcs.service";
import { PlayersService } from "#src/players/players.service";
import { AllService } from "./all.service.js";

describe("AllService", () => {
  let service: AllService;

  const itemsServiceMock = {
    getItems: vi.fn(),
  };

  const playersServiceMock = {
    getPlayers: vi.fn(),
  };

  const npcsServiceMock = {
    getNpcs: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllService,
        {
          provide: ItemsService,
          useValue: itemsServiceMock,
        },
        {
          provide: PlayersService,
          useValue: playersServiceMock,
        },
        {
          provide: NpcsService,
          useValue: npcsServiceMock,
        },
      ],
    }).compile();

    service = module.get<AllService>(AllService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("searchAll", () => {
    it("should aggregate results from all services", async () => {
      const query = {
        limit: 10,
        search: "tanroth",
        world: "Berufs",
      };

      const items = [{ id: 1, name: "Sword" }];
      const players = [{ id: "1", name: "Hero" }];
      const npcs = [{ id: 2, name: "Tanroth" }];

      itemsServiceMock.getItems.mockResolvedValue(items);
      playersServiceMock.getPlayers.mockResolvedValue(players);
      npcsServiceMock.getNpcs.mockResolvedValue(npcs);

      await expect(service.searchAll(query)).resolves.toEqual({
        items,
        players,
        npcs,
      });

      expect(itemsServiceMock.getItems).toHaveBeenCalledWith(query);
      expect(playersServiceMock.getPlayers).toHaveBeenCalledWith(query);
      expect(npcsServiceMock.getNpcs).toHaveBeenCalledWith(query);
    });
  });
});
