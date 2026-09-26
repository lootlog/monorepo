import { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
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

/**
 * Every relation that holds, most telling first: the first one paints the
 * row, the rest still show in tooltips. A friend in an allied clan is both.
 */
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

/** Row fills per relation, from the timer palette so every list paints alike. */
export const PLAYER_RELATION_FILLS: Record<PlayerRelation, string> = {
  self: TIMERS_COLORS.yellow.fill,
  party: TIMERS_COLORS.purple.fill,
  clan: TIMERS_COLORS.green.fill,
  enemy: TIMERS_COLORS.red.fill,
  "clan-enemy": TIMERS_COLORS.red.fill,
  friend: TIMERS_COLORS.sky.fill,
  "clan-ally": TIMERS_COLORS.lime.fill,
};
