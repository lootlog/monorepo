import type {
  ReplayDamageKind,
  ReplayLegendaryKind,
} from "./replay-timeline.js";

export const RANGED_PROFESSIONS = new Set(["h", "t", "m"]);

export const LEGENDARY_ACTION_MAP = new Map<string, ReplayLegendaryKind>([
  ["legbon_lastheal", "lastHeal"],
  ["+legbon_curse", "curse"],
  ["-legbon_cleanse", "cleanse"],
  ["-legbon_glare", "glare"],
  ["+legbon_holytouch", "holyTouch"],
  ["+legbon_verycrit", "veryCrit"],
  ["+legbon_anguish", "anguish"],
  ["-legbon_critred", "critShield"],
  ["-legbon_facade", "facade"],
  ["+legbon_puncture", "puncture"],
  ["-legbon_retaliation", "retaliation"],
  ["+legbon_frenzy_main", "frenzy"],
  ["+legbon_frenzy_off", "frenzy"],
]);

export const HIGHLIGHT_LEGENDARIES = new Set<ReplayLegendaryKind>([
  "lastHeal",
  "curse",
  "cleanse",
  "glare",
  "holyTouch",
  "veryCrit",
  "anguish",
]);

export const DEFENDER_LEGENDARY_ACTIONS = new Set([
  "-legbon_cleanse",
  "-legbon_glare",
  "-legbon_critred",
  "-legbon_facade",
  "-legbon_retaliation",
]);

export const PASSIVE_HEAL_KEYS = new Set([
  "heal",
  "afterheal",
  "legbon_holytouch_heal",
]);

export const ACTIVE_HEAL_KEYS = new Set([
  "bandage",
  "npc_heal",
  "heal_target",
  "healall",
  "vamp",
  "legbon_lastheal",
]);

export const CRIT_KEYS = new Set([
  "+crit",
  "+of_crit",
  "+verycrit",
  "+legbon_verycrit",
]);

export const DEEP_WOUND_KEYS = new Set([
  "+wound",
  "+of_wound",
  "+critwound",
  "+injure",
]);

export const STUN_KEYS = new Set([
  "+stun",
  "stun",
  "+stun2",
  "+stun2-f",
  "+stun2-l",
  "+stun2-c",
  "+stun2-d",
]);

export const FREEZE_KEYS = new Set(["+freeze", "freeze"]);

export const resolveDamageKindFromAction = (
  actionType: string,
): ReplayDamageKind => {
  if (actionType.endsWith("f") || actionType === "fire") return "fire";

  if (actionType.endsWith("c") || actionType === "frost") return "frost";

  if (actionType.endsWith("l") || actionType === "light") return "lightning";

  if (actionType.endsWith("d")) return "distance";

  if (
    actionType.endsWith("o") ||
    actionType.endsWith("a") ||
    actionType === "+of_dmg"
  ) {
    return "auxiliary";
  }

  if (actionType === "poison") return "poison";

  if (
    actionType === "wound" ||
    actionType === "critwound" ||
    actionType === "injure" ||
    actionType === "anguish"
  ) {
    return "wound";
  }

  if (actionType === "absolute" || actionType === "+oth_dmg") return "true";

  return "physical";
};

export const pickDominantDamageKind = (
  totals: Map<ReplayDamageKind, number>,
  fallback: ReplayDamageKind,
): ReplayDamageKind => {
  let bestKind = fallback;
  let bestAmount = -1;

  for (const [kind, amount] of totals) {
    if (amount > bestAmount) {
      bestAmount = amount;
      bestKind = kind;
    }
  }

  return bestKind;
};

export const getInitialMargonemRow = (
  prof: string,
  isBottomTeam: boolean,
): number => {
  const normalized = prof.toLowerCase();

  const depthFromCenter =
    normalized === "h" || normalized === "t" ? 2 : normalized === "m" ? 1 : 0;

  return isBottomTeam ? 3 + depthFromCenter : 2 - depthFromCenter;
};
