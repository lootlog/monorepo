export const ATTACK_ACTIONS_SORT_ORDER = [
  "+dmgd",
  "+crit",
  "+legbon_verycrit",
  "+of_crit",
  "+critslow_per",
  "+critsa_per",
  "+actdmg",
  "+legbon_curse",
  "+engback",
  "+pierce",
  "+wound",
  "+of_wound",
  "+of_woundpoison",
  "+fastarrow",
  "+acdmg",
  "+stun",
  "-legbon_holytouch",
  "-legbon_facade",
  "+legbon_puncture",
  "-redacdmg_per",
  "+resdmg",
  "-manadest",
  "-endest",
  "+oth_dmg",
  "+injure",
  "+critpoison_per",
  "+taken_dmg",
  "+crush",
  "+vulture",
  "+rage",
  "+legbon_anguish",
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
  "-immunity_to_dmg",
  "vamp_time",
  "-dmgd",
] as const;

export const SYSTEM_ACTION_TYPES = ["txt", "step", "+ph"] as const;

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
  "resfire_per",
  "reslight_per",
  "resfrost_per",
] as const;

export const BUFF_ACTION_TYPES = [
  "hp_per-allies",
  "poison_lowdmg_per-enemies",
  "heal_per-enemies",
  "heal_per-allies",
] as const;

export const PASSIVE_ACTION_TYPES = [
  "heal",
  "injure",
  "wound",
  "en-regen",
  "afterheal",
  "legbon_holytouch_heal",
  "poison",
  "fire",
  "light",
  "anguish",
] as const;

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
  "+legbon_puncture",
  "-legbon_facade",
  "-legbon_glare",
  "+legbon_anguish",
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
  "-immunity_to_dmg",
  "+of_woundpoison",
  "+of_crit",
  "vamp_time",
  "+oth_dmg",
  "+critsa_per",
] as const;

export const OUTCOME_ACTION_TYPES = ["winner", "loser"] as const;

export const IGNORED_ACTION_TYPES = ["skillId", "+exp"] as const;

export type SystemActionType = (typeof SYSTEM_ACTION_TYPES)[number];
export type SpellActionType = (typeof SPELL_ACTION_TYPES)[number];
export type BuffActionType = (typeof BUFF_ACTION_TYPES)[number];
export type PassiveActionType = (typeof PASSIVE_ACTION_TYPES)[number];
export type AttackActionType = (typeof ATTACK_ACTION_TYPES)[number];
export type OutcomeActionType = (typeof OUTCOME_ACTION_TYPES)[number];
export type IgnoredActionType = (typeof IGNORED_ACTION_TYPES)[number];

export type KnownActionType =
  | SystemActionType
  | SpellActionType
  | BuffActionType
  | PassiveActionType
  | AttackActionType
  | OutcomeActionType
  | IgnoredActionType;

export const isSystemAction = (
  actionType: string
): actionType is SystemActionType =>
  SYSTEM_ACTION_TYPES.includes(actionType as SystemActionType);

export const isSpellAction = (
  actionType: string
): actionType is SpellActionType =>
  SPELL_ACTION_TYPES.includes(actionType as SpellActionType);

export const isBuffAction = (
  actionType: string
): actionType is BuffActionType =>
  BUFF_ACTION_TYPES.includes(actionType as BuffActionType);

export const isPassiveAction = (
  actionType: string
): actionType is PassiveActionType =>
  PASSIVE_ACTION_TYPES.includes(actionType as PassiveActionType);

export const isAttackAction = (
  actionType: string
): actionType is AttackActionType =>
  ATTACK_ACTION_TYPES.includes(actionType as AttackActionType);

export const isOutcomeAction = (
  actionType: string
): actionType is OutcomeActionType =>
  OUTCOME_ACTION_TYPES.includes(actionType as OutcomeActionType);

export const isIgnoredAction = (
  actionType: string
): actionType is IgnoredActionType =>
  IGNORED_ACTION_TYPES.includes(actionType as IgnoredActionType);

export const isKnownAction = (
  actionType: string
): actionType is KnownActionType =>
  isSystemAction(actionType) ||
  isSpellAction(actionType) ||
  isBuffAction(actionType) ||
  isPassiveAction(actionType) ||
  isAttackAction(actionType) ||
  isOutcomeAction(actionType) ||
  isIgnoredAction(actionType);

export const isSpellActionInContext = (
  actionType: string,
  actionsList: string[]
): actionType is SpellActionType => {
  if (actionType === "+oth_dmg") {
    return actionsList.includes("tspell");
  }
  return isSpellAction(actionType);
};

export const isAttackActionInContext = (
  actionType: string,
  actionsList: string[]
): actionType is AttackActionType => {
  if (actionType === "+oth_dmg") {
    return !actionsList.includes("tspell");
  }
  if (actionType === "-poison_lowdmg_per") {
    return !actionsList.some((action) => isPassiveAction(action));
  }
  return isAttackAction(actionType);
};

export const isPassiveActionInContext = (
  actionType: string,
  actionsList: string[]
): actionType is PassiveActionType => {
  if (actionType === "-poison_lowdmg_per") {
    return actionsList.some((action) => isPassiveAction(action));
  }
  return isPassiveAction(actionType);
};
