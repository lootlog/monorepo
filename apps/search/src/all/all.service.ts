import type { ItemsService } from "#src/items/items.service";
import type { NpcsService } from "#src/npcs/npcs.service";
import type { PlayersService } from "#src/players/players.service";
import type { SearchAllDto } from "./dto/search-all.dto.js";

export class AllService {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly playersService: PlayersService,
    private readonly npcsService: NpcsService,
  ) {}

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
