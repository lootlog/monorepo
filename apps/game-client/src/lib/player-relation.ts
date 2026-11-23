import { TIMERS_COLORS } from "@lootlog/domain/timer-colors";
import type { ClanRelation } from "@/store/social-relations.store";

export type PlayerRelation =
  | "self"
  | "party"
  | "clan"
  | "enemy"
  | "clan-enemy"
  | "friend"
  | "clan-ally";

export type PlayerRelationFacts = {
  clanRelation?: ClanRelation;
  isEnemy: boolean;
  isFriend: boolean;
  isPartyMember: boolean;
  isSameClan: boolean;
  isSelf: boolean;
};

export const resolvePlayerRelations = ({
  clanRelation,
  isEnemy,
  isFriend,
  isPartyMember,
  isSameClan,
  isSelf,
}: PlayerRelationFacts): PlayerRelation[] => {
  if (isSelf) return ["self"];

  const relations: PlayerRelation[] = [];

  if (isPartyMember) relations.push("party");

  if (isSameClan) relations.push("clan");

  if (isEnemy) relations.push("enemy");

  if (!isSameClan && clanRelation === "enemy") relations.push("clan-enemy");

  if (isFriend) relations.push("friend");

  if (!isSameClan && clanRelation === "ally") relations.push("clan-ally");

  return relations;
};

const PLAYER_ROW_FILL_ALPHA_HEX = "40";

const playerRowFill = (color: keyof typeof TIMERS_COLORS) =>
  `${TIMERS_COLORS[color].accent}${PLAYER_ROW_FILL_ALPHA_HEX}`;

export const PLAYER_RELATION_FILLS: Record<PlayerRelation, string> = {
  self: playerRowFill("teal"),
  party: playerRowFill("purple"),
  clan: playerRowFill("green"),
  enemy: playerRowFill("red"),
  "clan-enemy": playerRowFill("red"),
  friend: playerRowFill("sky"),
  "clan-ally": playerRowFill("yellow"),
};

export const PLAYER_AFK_FILL = playerRowFill("orange");

export const PLAYER_RELATION_TEXT_CLASS_NAMES: Record<PlayerRelation, string> =
  {
    self: "ll:text-teal-300",
    party: "ll:text-purple-300",
    clan: "ll:text-green-300",
    enemy: "ll:text-red-300",
    "clan-enemy": "ll:text-red-300",
    friend: "ll:text-sky-300",
    "clan-ally": "ll:text-yellow-300",
  };

export const PLAYER_AFK_TEXT_CLASS_NAME = "ll:text-orange-300";
