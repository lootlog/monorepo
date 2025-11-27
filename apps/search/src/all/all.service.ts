import { ItemsService } from "../items/items.service.js";
import { PlayersService } from "../players/players.service.js";
import { NpcsService } from "../npcs/npcs.service.js";
import type { SearchAllDto } from "./dto/search-all.dto.js";

export class AllService {
  private itemsService: ItemsService;
  private playersService: PlayersService;
  private npcsService: NpcsService;

  constructor() {
    this.itemsService = new ItemsService();
    this.playersService = new PlayersService();
    this.npcsService = new NpcsService();
  }

  async searchAll({ limit, search, world }: SearchAllDto) {
    const [items, players, npcs] = await Promise.all([
      this.itemsService.getItems({ limit, search, world }),
      this.playersService.getPlayers({ limit, search, world }),
      this.npcsService.getNpcs({ limit, search, world }),
    ]);

    return {
      items,
      players,
      npcs,
    };
  }
}
