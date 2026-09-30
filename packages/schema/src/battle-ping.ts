import { Schema } from "effect";
import { NonNegativeInt } from "./primitives.js";

/** Pings placed on an enemy warrior. `attack` is the team's shared target. */
const BATTLE_ENEMY_PING_TYPES = ["attack", "caution", "spare"] as const;

/** Requests placed on an allied warrior (or on the sender's own warrior). */
const BATTLE_REQUEST_PING_TYPES = [
  "attack-speed-aura",
  "atmo",
  "cleanse",
  "emanating-arrow",
  "fury",
  "heal",
  "healing-wave",
  "need-heal",
  "poison",
  "protection-aura",
  "rime",
  "stigma",
  "taunt",
] as const;

/**
 * Calls to the whole battle team, sent from the sender's own warrior. Only
 * sockets that negotiated `lootlog.battle-ping.team.v1` send or receive them.
 */
const BATTLE_TEAM_PING_TYPES = ["quick-fight"] as const;

const BATTLE_PING_TYPES = [
  ...BATTLE_ENEMY_PING_TYPES,
  ...BATTLE_REQUEST_PING_TYPES,
  ...BATTLE_TEAM_PING_TYPES,
] as const;

export type BattleEnemyPingType = (typeof BATTLE_ENEMY_PING_TYPES)[number];

export type BattleRequestPingType = (typeof BATTLE_REQUEST_PING_TYPES)[number];

export type BattleTeamPingType = (typeof BATTLE_TEAM_PING_TYPES)[number];

export type BattlePingType = (typeof BATTLE_PING_TYPES)[number];

/** A Margonem party holds at most ten characters, so nine other recipients. */
const MAX_BATTLE_PING_RECIPIENTS = 9;

/** Margonem battle warrior ids: positive for characters, negative for NPCs. */
const MAX_BATTLE_WARRIOR_ID = 2_147_483_647;

const BattlePingTypeSchema = Schema.Literals(BATTLE_PING_TYPES);

const BattleWarriorIdSchema = Schema.Int.check(
  Schema.isBetween({
    minimum: -MAX_BATTLE_WARRIOR_ID,
    maximum: MAX_BATTLE_WARRIOR_ID,
  }),
  Schema.makeFilter((id: number) => id !== 0 || "warrior id must not be 0"),
);

const CharacterIdSchema = Schema.String.check(
  Schema.isPattern(/^[1-9]\d{0,9}$/),
);

export const isBattlePingType = Schema.is(BattlePingTypeSchema);

export const isBattleEnemyPingType = Schema.is(
  Schema.Literals(BATTLE_ENEMY_PING_TYPES),
);

export const isBattleTeamPingType = Schema.is(
  Schema.Literals(BATTLE_TEAM_PING_TYPES),
);

export interface BattlePingSendPayload {
  expectedMapId: number;
  type: BattlePingType;
  warriorId: number;
  /** Character ids of the other players on the sender's battle team. */
  recipientCharacterIds: readonly string[];
}

export interface BattlePingEvent {
  pingId: string;
  world: string;
  mapId: number;
  type: BattlePingType;
  warriorId: number;
  sender: {
    characterId: string;
    name: string;
  };
  createdAt: number;
}

export const BattlePingSendPayloadSchema = Schema.Struct({
  expectedMapId: NonNegativeInt,
  type: BattlePingTypeSchema,
  warriorId: BattleWarriorIdSchema,
  recipientCharacterIds: Schema.Array(CharacterIdSchema).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(MAX_BATTLE_PING_RECIPIENTS),
  ),
});

export const BattlePingEventSchema = Schema.Struct({
  pingId: Schema.NonEmptyString,
  world: Schema.NonEmptyString,
  mapId: NonNegativeInt,
  type: BattlePingTypeSchema,
  warriorId: BattleWarriorIdSchema,
  sender: Schema.Struct({
    characterId: Schema.NonEmptyString,
    name: Schema.NonEmptyString,
  }),
  createdAt: NonNegativeInt,
});
