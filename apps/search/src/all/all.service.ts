import { Injectable } from "@nestjs/common";
import { ItemsService } from "src/items/items.service";
import { NpcsService } from "src/npcs/npcs.service";
import { PlayersService } from "src/players/players.service";
import type { SearchAllDto } from "./dto/search-all.dto";

@Injectable()
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
