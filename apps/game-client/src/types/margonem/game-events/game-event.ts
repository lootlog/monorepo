import { D } from "@/types/margonem/game-events/d";
import { F } from "@/types/margonem/game-events/f";
import { Item, ItemEvent } from "@/types/margonem/game-events/item";
import { Loot } from "@/types/margonem/game-events/loot";
import { Npcs } from "@/types/margonem/game-events/npcs";
import { NpcsDel } from "@/types/margonem/game-events/npcs_del";
import { Other } from "@/types/margonem/game-events/other";

export type GameEvent = {
  d: D;
  e: "ok" | "error";
  ev: number;
  f?: F;
  npcs?: Npcs;
  npcs_del?: NpcsDel;
  item?: ItemEvent;
  loot?: Loot;
  other?: Other;
};
