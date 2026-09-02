import { Schema } from "effect";
import { ItemHit } from "../../items/dto/item-hit.schema.js";
import { NpcHit } from "../../npcs/dto/npc-hit.schema.js";
import { PlayerHit } from "../../players/dto/player-hit.schema.js";
export const SearchAllResponse = Schema.Struct({
  items: Schema.Array(ItemHit),
  players: Schema.Array(PlayerHit),
  npcs: Schema.Array(NpcHit),
});
