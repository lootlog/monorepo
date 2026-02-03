import type { ChatEvent } from "@/types/margonem/game-events/chat";
import type { D } from "@/types/margonem/game-events/d";
import type { F } from "@/types/margonem/game-events/f";
import type { Icon } from "@/types/margonem/game-events/icons";
import type { ItemEvent } from "@/types/margonem/game-events/item";
import type { LootEvent } from "@/types/margonem/game-events/loot";
import type { MatchSummary } from "@/types/margonem/game-events/match-summary";
import type { NpcTpl } from "@/types/margonem/game-events/npc_tpls";
import type { Npcs } from "@/types/margonem/game-events/npcs";
import type { NpcsDel } from "@/types/margonem/game-events/npcs_del";
import type { Other } from "@/types/margonem/game-events/other";
import type { PartyEvent } from "@/types/margonem/game-events/party";
import type { TownEvent } from "@/types/margonem/game-events/town";

export type GameEvent = {
  d?: D;
  e?: "ok" | "error";
  ev?: number;
  f?: F;
  npcs?: Npcs;
  npcs_del?: NpcsDel;
  npc_tpls?: NpcTpl[];
  icons?: Icon[];
  item?: ItemEvent;
  loot?: LootEvent;
  other?: Other;
  chat?: ChatEvent;
  party?: PartyEvent;
  match_summary?: MatchSummary;
  matchmaking_state?: number;
  matchmaking_search?: {
    since: number;
    avg_duration: number;
    avg_timeframe: number;
  };
  h?: {
    stasis?: number; // 1 = AFK, 0 = active
  };
  town?: TownEvent;
  friends?: string[];
  friends_max?: number;
};
