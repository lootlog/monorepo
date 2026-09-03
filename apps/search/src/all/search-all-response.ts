import { Schema } from "effect";
import { ItemHit } from "#src/items/item-hit";
import { NpcHit } from "#src/npcs/npc-hit";
import { PlayerHit } from "#src/players/player-hit";
export const SearchAllResponse = Schema.Struct({
  items: Schema.Array(ItemHit),
  players: Schema.Array(PlayerHit),
  npcs: Schema.Array(NpcHit),
});
