import { D } from "@/types/margonem/game-events/d";
import { F } from "@/types/margonem/game-events/f";
import { Icon } from "@/types/margonem/game-events/icons";
import { ItemEvent } from "@/types/margonem/game-events/item";
import { Loot } from "@/types/margonem/game-events/loot";
import { NpcTpl } from "@/types/margonem/game-events/npc_tpls";
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
  npc_tpls?: NpcTpl[];
  icons?: Icon[];
  item?: ItemEvent;
  loot?: Loot;
  other?: Other;
};
