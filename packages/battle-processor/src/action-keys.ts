/**
 * The action keys of a battle row and what each means. The catalog follows
 * the keys Margonem renders in `core/battle/BattleMessages.js`; the Polish
 * dictionary (`dictionary_pl.js`, `msg_<key>`) names their effect.
 */
import type { NumericWarriorStat } from "./warrior.js";

export type BattleActionCategory =
  | "damage"
  | "healing"
  | "mitigation"
  | "counter"
  | "absorb"
  | "resource"
  | "control"
  | "buff"
  | "debuff"
  | "spell"
  | "combo"
  | "outcome"
  | "movement"
  | "legendary"
  | "system"
  | "unknown";

const keysOf = <Category extends BattleActionCategory>(
  category: Category,
  keys: readonly string[],
) => keys.map((key) => [key, category] as const);

const ACTION_CATEGORIES = new Map<string, BattleActionCategory>([
  ...keysOf("damage", [
    "+thirdatt",
    "-thirdatt",
    "+of_dmg",
    "+oth_dmg",
    "wound",
    "critwound",
    "anguish",
    "poison",
    "injure",
    "fire",
    "light",
    "frost",
    "absolute",
    "physical",
  ]),
  ...keysOf("healing", [
    "heal",
    "afterheal",
    "npc_heal",
    "bandage",
    "heal_target",
    "healall",
    "healall_per",
    "heal_per",
    "heal_per-allies",
    "hp_per-allies",
    "vamp",
    "antidote",
    "legbon_lastheal",
    "legbon_holytouch_heal",
  ]),
  ...keysOf("mitigation", [
    "-evade",
    "-blok",
    "-parry",
    "-arrowblock",
    "-pierceb",
    "+oth_cover",
    "cover",
    "-immunity_to_dmg",
    "-spell-immunity_to_dmg",
  ]),
  ...keysOf("counter", ["-contra"]),
  ...keysOf("absorb", ["+absorb", "+absorbm", "-absorb", "-absorbm"]),
  ...keysOf("resource", [
    "energy",
    "en-regen",
    "en-regen-cast",
    "+energy",
    "+engback",
    "energyout",
    "+endest",
    "-endest",
    "mana",
    "managain",
    "manatransfer",
    "stealmana",
    "+manadest",
    "-manadest",
    "reusearrows",
    "-redendest",
    "-redendest_per",
    "-redmanadest",
    "-redmanadest_per",
    "-reddest_per",
    "-reddest_per0",
    "-resmanaendest",
  ]),
  ...keysOf("control", [
    "+stun",
    "stun",
    "+stun2",
    "+stun2-f",
    "+stun2-l",
    "+stun2-c",
    "+stun2-d",
    "+freeze",
    "freeze",
    "+immobilize",
    "+slow",
    "+critslow",
    "+critslow_per",
    "+distract",
    "blackout",
    "allslow",
    "allslow_per",
    "rime_per",
    "critstagnation",
    "distractshoot",
    "disturbshoot",
    "insult",
    "shout",
    "+superspell-dispel",
    "+superspell-prevented",
  ]),
  ...keysOf("buff", [
    "+pierce",
    "+crit",
    "+verycrit",
    "+of_crit",
    "+fastarrow",
    "+injure",
    "+wound",
    "+of_wound",
    "+woundpoison",
    "+of_woundpoison",
    "+woundmagic",
    "+of_woundmagic",
    "+woundfrost",
    "+critwound",
    "+critsa",
    "+critsa_per",
    "+critpoison_per",
    "+crush",
    "+crush_physical",
    "+crush_distance",
    "+crush_fire",
    "+crush_frost",
    "+crush_light",
    "+rage",
    "-rage",
    "+taken_dmg",
    "+vulture",
    "+firearrow",
    "+rotatingblade",
    "+spell-taken_dmg",
    "+spell-taken_dmg-all",
    "spell-taken_dmg",
    "+spell-vamp_time",
    "vamp_time",
    "aura-ac",
    "aura-ac_per",
    "aura-resall",
    "aura-sa",
    "aura-sa_per",
    "aura-adddmg2_per-meele",
    "critval-allies",
    "critmval-allies",
    "achpp_per",
    "active_block_per",
    "active_resall_per",
    "resfire_per",
    "reslight_per",
    "resfrost_per",
    "fireshield",
    "frostshield",
    "lightshield",
    "lightshield2",
    "mlightshiled",
    "sunshield",
    "sunshield_per",
    "sunreduction",
    "soullink",
    "doubleshoot",
    "removedot",
    "removedot-allies",
    "removestun",
    "removestun-allies",
    "removeslow-allies",
    "surpass_bonus_total",
  ]),
  ...keysOf("debuff", [
    "+acdmg",
    "+acdmg_destroyed",
    "+critpierce",
    "+actdmg",
    "+resdmg",
    "+resdmgf",
    "+resdmgc",
    "+resdmgl",
    "+abdest",
    "+abdest_per",
    "+abmdest_per",
    "active_absorbdest_per",
    "active_decblock_per",
    "active_decblock_per-enemies",
    "alllowdmg",
    "lowheal_per-enemies",
    "+lowheal2turns",
    "poison_lowdmg_per-enemies",
    "-poison_lowdmg_per",
    "-redacdmg",
    "-redacdmg_per",
    "-redabdest_per",
    "-lowcritallval",
    "-tenacity",
    "+mcurse",
    "critval-enemies",
    "critmval-enemies",
    "heal_per-enemies",
    "hp_per-enemies",
    "disturb",
    "distortion",
    "-spell-distortion",
    "stinkbomb",
    "stinkbomb_crit",
    "stinkbomb_pierce",
    "footshoot",
  ]),
  ...keysOf("spell", [
    "tspell",
    "skillId",
    "prepare",
    "tcustom",
    "dmg-target_physical",
    "thunder",
    "storm",
    "firewall",
    "chainlightning",
    "chainlightning_perw",
    "arrowrain",
    "blizzard",
    "balloflight",
    "daggerthrow",
    "trickyknife",
    "woundextend",
    "poisonspread",
    "poisonspread_failkey",
    "of-woundstart",
    "ansgame",
  ]),
  ...keysOf("combo", ["combo", "combo-max"]),
  ...keysOf("outcome", [
    "winner",
    "loser",
    "flee",
    "+ph",
    "+exp",
    "loot",
    "dloot",
  ]),
  ...keysOf("movement", ["step", "+swing"]),
  ...keysOf("legendary", [
    "+legbon_curse",
    "-legbon_cleanse",
    "-legbon_glare",
    "+legbon_holytouch",
    "-legbon_critred",
    "-legbon_facade",
    "-legbon_dmgred",
    "-legbon_resgain",
    "-legbon_retaliation",
    "+legbon_verycrit",
    "+legbon_anguish",
    "+legbon_puncture",
    "+legbon_pushback",
    "+legbon_frenzy_main",
    "+legbon_frenzy_off",
  ]),
  ...keysOf("system", ["txt", "dmg_hpp"]),
]);

export type DamageKey = {
  /** `+` keys are the attack the actor rolled, `-` keys what the target took. */
  side: "dealt" | "taken";
  stat: NumericWarriorStat | null;
};

/** Dealt and taken stats by the suffix after `dmg`. */
const DAMAGE_FAMILIES = new Map<
  string,
  readonly [NumericWarriorStat, NumericWarriorStat]
>([
  ["", ["meleeDamage", "meleeDamageTaken"]],
  ["d", ["distanceDamage", "distanceDamageTaken"]],
  ["o", ["auxiliaryDamage", "auxiliaryDamageTaken"]],
  ["a", ["auxiliaryDamage", "auxiliaryDamageTaken"]],
  ["f", ["fireDamage", "fireDamageTaken"]],
  ["c", ["frostDamage", "frostDamageTaken"]],
  ["l", ["lightningDamage", "lightningDamageTaken"]],
]);

/**
 * The attack keys of a row. Margonem treats every `+dmg…` and `-dmg…` key as
 * one damage instance and colours it by its suffix; `+thirdatt` and `+of_dmg`
 * add the third strike and off-hand damage to the same attack.
 */
export const readDamageKey = (actionType: string): DamageKey | null => {
  if (actionType === "+thirdatt")
    return { side: "dealt", stat: "thirdAttDamage" };

  if (actionType === "-thirdatt") {
    return { side: "taken", stat: "thirdAttDamageTaken" };
  }

  if (actionType === "+of_dmg")
    return { side: "dealt", stat: "auxiliaryDamage" };

  const match = /^([+-])dmg(.*)$/.exec(actionType);

  if (!match) return null;

  const [, sign, suffix = ""] = match;
  const family = DAMAGE_FAMILIES.get(suffix);

  return sign === "+"
    ? { side: "dealt", stat: family?.[0] ?? null }
    : { side: "taken", stat: family?.[1] ?? null };
};

/**
 * Damage over time and unavoidable damage the row's actor takes. These rows
 * name the affected warrior as the actor, often without a target.
 */
export const ACTOR_DAMAGE_TAKEN = new Map<string, NumericWarriorStat | null>([
  ["wound", "woundDamageTaken"],
  ["critwound", "critWoundDamageTaken"],
  ["anguish", "legbonAnguishDamageTaken"],
  ["poison", "poisonDamageTaken"],
  ["injure", "injureDamageTaken"],
  ["fire", "firePassiveDamageTaken"],
  ["light", "lightningPassiveDamageTaken"],
  ["frost", null],
  ["absolute", null],
  ["physical", null],
]);

export const getActionCategory = (actionType: string): BattleActionCategory =>
  ACTION_CATEGORIES.get(actionType) ??
  (readDamageKey(actionType) ? "damage" : "unknown");
