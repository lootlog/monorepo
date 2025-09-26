/**
 * Battle Action Type Constants
 *
 * Centralizes all action type definitions for battle log parsing
 */

// Attack actions sort order for proper display sequence
export const ATTACK_ACTIONS_SORT_ORDER = [
  "+dmgd",
  "+crit",
  "+legbon_verycrit",
  "+critslow_per",
  "+actdmg",
  "+legbon_curse",
  "+engback",
  "+pierce",
  "+wound",
  "+fastarrow",
  "+acdmg",
  "+stun",
  "-legbon_holytouch",
  "-legbon_facade",
  "-redacdmg_per",
  "+resdmg",
  "-manadest",
  "-endest",
  "+injure",
  "+critpoison_per",
  "+taken_dmg",
  "+crush",
  "+vulture",
  "+rage",
  "+acdmg_destroyed",
  "legbon_lastheal",
  "-absorb",
  "-absorbm",
  "-blok",
  "-evade",
  "-parry",
  "-pierceb",
  "-arrowblock",
  "-contra",
  "-legbon_glare",
  "-legbon_critred",
  "-legbon_cleanse",
  "-dmgd",
] as const;

// System action types
export const SYSTEM_ACTION_TYPES = [
  "txt",
  "step",
] as const;

// Spell action types
export const SPELL_ACTION_TYPES = [
  "tspell",
  "aura-resall",
  "aura-ac_per",
  "critval-enemies",
  "critmval-enemies",
  "active_block_per",
  "shout",
  "active_decblock_per",
  "energy",
  "mana",
  "combo-max",
  "bandage",
  "antidote",
  "lightshield",
  "sunshield_per",
  "heal_target",
  "en-regen-cast",
  "allslow_per",
  "active_absorbdest_per",
  "stinkbomb_crit",
  "stinkbomb_pierce",
  "spell-taken_dmg",
  "+oth_dmg",
] as const;

// Buff action types
export const BUFF_ACTION_TYPES = [
  "hp_per-allies",
  "poison_lowdmg_per-enemies",
  "heal_per-enemies",
  "heal_per-allies",
] as const;

// Passive action types
export const PASSIVE_ACTION_TYPES = [
  "heal",
  "injure",
  "wound",
  "en-regen",
  "afterheal",
  "legbon_holytouch_heal",
  "poison",
  "fire",
] as const;

// Attack action types (damage and combat effects)
export const ATTACK_ACTION_TYPES = [
  "+dmgd",
  "+dmgf",
  "+dmgl",
  "+dmgo",
  "+dmg",
  "+dmgc",
  "-dmg",
  "-dmgo",
  "-dmgd",
  "-dmgf",
  "-dmgl",
  "-dmgc",
  "+injure",
  "+pierce",
  "+crit",
  "+critslow_per",
  "+acdmg",
  "-legbon_critred",
  "-legbon_cleanse",
  "+legbon_verycrit",
  "+legbon_curse",
  "+legbon_holytouch",
  "-legbon_facade",
  "-legbon_glare",
  "-pierceb",
  "-blok",
  "+engback",
  "-manadest",
  "-endest",
  "+crush",
  "+vulture",
  "+taken_dmg",
  "+resdmg",
  "-arrowblock",
  "-redacdmg_per",
  "-absorb",
  "-absorbm",
  "+of_wound",
  "+critsa_per",
  "+thirdatt",
  "-thirdatt",
  "+fastarrow",
  "-contra",
  "-evade",
  "-parry",
  "+absorb",
  "+absorbm",
  "+rage",
  "+wound",
  "+acdmg_destroyed",
  "+stun",
  "-poison_lowdmg_per",
  "+actdmg",
  "+critpoison_per",
  "legbon_lastheal",
] as const;

// Outcome action types
export const OUTCOME_ACTION_TYPES = [
  "winner",
  "loser",
] as const;

// Special action types (ignored)
export const IGNORED_ACTION_TYPES = [
  "skillId",
] as const;

// Type definitions for each category
export type SystemActionType = typeof SYSTEM_ACTION_TYPES[number];
export type SpellActionType = typeof SPELL_ACTION_TYPES[number];
export type BuffActionType = typeof BUFF_ACTION_TYPES[number];
export type PassiveActionType = typeof PASSIVE_ACTION_TYPES[number];
export type AttackActionType = typeof ATTACK_ACTION_TYPES[number];
export type OutcomeActionType = typeof OUTCOME_ACTION_TYPES[number];
export type IgnoredActionType = typeof IGNORED_ACTION_TYPES[number];

// Union type for all known action types
export type KnownActionType =
  | SystemActionType
  | SpellActionType
  | BuffActionType
  | PassiveActionType
  | AttackActionType
  | OutcomeActionType
  | IgnoredActionType;

// Helper functions to check action types
export const isSystemAction = (actionType: string): actionType is SystemActionType =>
  SYSTEM_ACTION_TYPES.includes(actionType as SystemActionType);

export const isSpellAction = (actionType: string): actionType is SpellActionType =>
  SPELL_ACTION_TYPES.includes(actionType as SpellActionType);

export const isBuffAction = (actionType: string): actionType is BuffActionType =>
  BUFF_ACTION_TYPES.includes(actionType as BuffActionType);

export const isPassiveAction = (actionType: string): actionType is PassiveActionType =>
  PASSIVE_ACTION_TYPES.includes(actionType as PassiveActionType);

export const isAttackAction = (actionType: string): actionType is AttackActionType =>
  ATTACK_ACTION_TYPES.includes(actionType as AttackActionType);

export const isOutcomeAction = (actionType: string): actionType is OutcomeActionType =>
  OUTCOME_ACTION_TYPES.includes(actionType as OutcomeActionType);

export const isIgnoredAction = (actionType: string): actionType is IgnoredActionType =>
  IGNORED_ACTION_TYPES.includes(actionType as IgnoredActionType);

export const isKnownAction = (actionType: string): actionType is KnownActionType =>
  isSystemAction(actionType) ||
  isSpellAction(actionType) ||
  isBuffAction(actionType) ||
  isPassiveAction(actionType) ||
  isAttackAction(actionType) ||
  isOutcomeAction(actionType) ||
  isIgnoredAction(actionType);