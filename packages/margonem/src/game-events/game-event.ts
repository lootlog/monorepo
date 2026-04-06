import type { AskEvent } from "./ask.js";
import type { BusinessCard } from "./business-card.js";
import type { ChatEvent } from "./chat.js";
import type { D } from "./d.js";
import type { EmoEvent } from "./emo.js";
import type { F } from "./f.js";
import type { HeroEvent } from "./hero-event.js";
import type { Icon } from "./icons.js";
import type { ItemEvent } from "./item.js";
import type { LootEvent } from "./loot.js";
import type { MatchSummary } from "./match-summary.js";
import type { NpcTpl } from "./npc_tpls.js";
import type { Npcs } from "./npcs.js";
import type { NpcsDel } from "./npcs_del.js";
import type { Other } from "./other.js";
import type { PartyEvent } from "./party.js";
import type { TownEvent } from "./town.js";

export type GameEvent = {
  e?: "ok" | "error";
  ev?: number;

  d?: D;
  f?: F;
  h?: HeroEvent;
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
  town?: TownEvent;

  emo?: EmoEvent[];
  businessCards?: BusinessCard[];
  ask?: AskEvent;

  js?: string;
  js_script?: unknown;

  credits?: number;
  runes?: number;

  friends?: string[];
  friends_max?: number;
  enemies?: string[];
  enemies_max?: number;

  matchmaking_state?: number;
  matchmaking_search?: {
    since: number;
    avg_duration: number;
    avg_timeframe: number;
  };
  match_main?: unknown;

  townname?: string;
  sraj_tpl?: unknown;
  builds?: unknown;
  config?: unknown;
  activities?: unknown;
  cl?: unknown;
  worldConfig?: unknown;
  rewards_calendar_active?: unknown;
  game_hour?: number;
  game_hour_mod?: unknown;
  tutorial?: unknown;
  browser_token?: string;
  settings?: unknown;
  tracking?: unknown;
  world_time?: unknown;
  barters?: unknown;
  gw2?: unknown;
  t?: unknown;
  notices?: unknown;
  handheld_minimap?: unknown;
  questsData?: unknown;
  rip?: unknown;
  msg?: unknown;
  login?: unknown;
  walking?: unknown;
  captcha?: unknown;
  pet?: unknown;
  selectedskills?: unknown;
  skills_total?: unknown;
  item_tpl?: unknown;
  skill_list?: unknown;
  skill_set?: unknown;
  skill_data?: unknown;
  skills_learnt?: unknown;
  freeskills_ts?: unknown;
  myclan?: unknown;
  shop?: unknown;
  depo?: unknown;
  depo_opentabs?: unknown;
  promotions?: unknown;
  logoff_time_left?: unknown;
  members?: unknown;
  message?: unknown;
};
