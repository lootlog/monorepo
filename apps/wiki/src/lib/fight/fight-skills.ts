type ActiveEffect = { readonly value: number; readonly turns: number };

export type ActiveSkill = {
  readonly id: number;
  readonly name: string;
  readonly resource: "energy" | "mana";
  readonly cost: number;
  readonly cooldown: number;
  readonly selfCast: boolean;
  readonly attacks: boolean;
  readonly effects: ReadonlyMap<string, ActiveEffect>;
  readonly logged: readonly (readonly [string, number | null])[];
};

export type ComboGain = {
  readonly crit: number;
  readonly pierce: number;
  readonly wound: number;
  readonly block: number;
};

type Buff = {
  key: string;
  value: number;
  turnsLeft: number;
  source: number;
  age: number;
};

type MasteryStep = ActiveSkill | "attack" | "step" | null;

export type MasteryQueue = {
  readonly steps: readonly MasteryStep[];
  readonly repeat: boolean;
};

export const NO_MASTERY: MasteryQueue = { steps: [], repeat: false };

export type SkillUserState = {
  index: number;
  combatant: {
    readonly hp: number;
    readonly energy: number;
    readonly mana: number;
    readonly mastery: MasteryQueue;
  };
  hp: number;
  masteryCursor: number;
  energy: number;
  mana: number;
  energyRestores: number;
  healUses: Map<string, number>;
  comboPoints: number;
  cooldowns: Map<ActiveSkill, number>;
  previousSkill: ActiveSkill | null;
  castThisTurn: ActiveSkill | null;
  buffs: Buff[];
  skillUses: Map<string, number>;
};

const COMBO_POINT_CAP = 5;

const SUNSHIELD_DECAY_PER_TURN = 0.2;

const ATTACK_EFFECTS = [
  "add_attacks",
  "lowdmg_self",
  "adddmg_physical-perw",
  "adddmg_fire-perw",
  "active_decevade_per",
  "active_decblock_per",
  "red-sa",
  "poisonbon_poison-perw",
  "active_wound_per",
  "combo_dmg_hpp-target",
  "active_acdmg_per",
  "active_acdmg_physical-perw",
  "active_add_light_cumulaction",
  "slowfreeze_per",
  "freeze",
  "stun",
  "lowdmg_enemy",
  "combo_lowdmg_enemy",
  "dmg_evade_hpp-target_light",
  "dmg_evade_hpp-target",
  "dmg-swing_absolute-perw",
];

export const SELF_BUFFS: ReadonlySet<string> = new Set([
  "active_crit",
  "sa_per",
  "sa2_per",
  "perdmg",
  "resfire_per",
  "resfrost_per",
  "reslight_per",
  "ac_per",
  "acshield_per",
  "active_block_per",
  "antidote",
  "achpp_per",
  "active_redstun",
  "immunity_to_dmg",
  "vamp_time_per",
  "en-regen",
  "lightshield_per",
  "sunshield_per",
  "energyout",
]);

export const TEAM_BUFF_CASTER_SHARE: ReadonlyMap<string, number> = new Map([
  ["critval-allies", 1],
  ["critmval-allies", 1],
  ["perdmg-allies", 0.5],
  ["aura-sa_per", 0.5],
  ["aura-ac_per", 1],
  ["aura-resall", 1],
  ["aura-adddmg2_per-meele_physical", 1],
  ["active_crit-allies", 0.5],
]);

export const TARGET_DEBUFFS: ReadonlySet<string> = new Set([
  "disturb_crit",
  "disturb_pierce",
  "stinkbomb_crit",
  "stinkbomb_pierce",
  "taken_dmg_per",
]);

export const ENEMY_TEAM_DEBUFFS: ReadonlySet<string> = new Set([
  "taken_dmg_per-all",
  "critval-enemies",
  "critmval-enemies",
  "allslow_per",
  "active_decblock_per-enemies",
  "alllowdmg",
  "lowheal_per-enemies",
  "shout",
]);

const CAST_EFFECTS = [
  "energyrestore_per",
  "combo_energyrestore_per",
  "manarestore_per",
  "bandage_per",
  "heal_per",
  "healall_per",
  "combo_heal_per",
  "removestun-allies",
  "removedot-allies",
  "dmg-target_absolute",
  "manaendest",
  "stealmana_per",
  "active_absorbdest_per",
  "dmg-target_fire-perw",
];

const COMBO_EFFECTS = ["combo-skill", "combo-max"];

const TIMING_ONLY_EFFECTS = new Set([
  "red-sa",
  "lowdmg_self",
  "doublecastcost_per",
  ...COMBO_EFFECTS,
]);

export const SIMULATED_ACTIVE_EFFECTS: ReadonlySet<string> = new Set([
  ...ATTACK_EFFECTS,
  ...SELF_BUFFS,
  ...TEAM_BUFF_CASTER_SHARE.keys(),
  ...TARGET_DEBUFFS,
  ...ENEMY_TEAM_DEBUFFS,
  ...CAST_EFFECTS,
  ...TIMING_ONLY_EFFECTS,
]);

export const isSimulatedActive = (skill: ActiveSkill) =>
  [...skill.effects.keys()].some(
    (key) => SIMULATED_ACTIVE_EFFECTS.has(key) && !TIMING_ONLY_EFFECTS.has(key),
  );

const isComboFinisher = (skill: ActiveSkill) => skill.effects.has("combo-max");

const DECAY_PER_TURN: ReadonlyMap<string, number> = new Map([
  ["sunshield_per", SUNSHIELD_DECAY_PER_TURN],
]);

const buffValue = (buff: Buff) =>
  buff.value * Math.max(0, 1 - (DECAY_PER_TURN.get(buff.key) ?? 0) * buff.age);

const MAX_SOURCES = 2;

const strongestSources = (state: Pick<SkillUserState, "buffs">, key: string) =>
  state.buffs
    .filter((buff) => buff.key === key)
    .map(buffValue)
    .sort((left, right) => Math.abs(right) - Math.abs(left))
    .slice(0, MAX_SOURCES)
    .reduce((total, value) => total + value, 0);

export const buffTotal = (
  state: Pick<SkillUserState, "buffs">,
  ...keys: readonly string[]
) => keys.reduce((total, key) => total + strongestSources(state, key), 0);

export const hasBuff = (state: Pick<SkillUserState, "buffs">, key: string) =>
  state.buffs.some((buff) => buff.key === key);

export const addBuff = (
  state: Pick<SkillUserState, "buffs">,
  key: string,
  value: number,
  turns: number,
  source: number,
) => {
  state.buffs = state.buffs.filter(
    (buff) => buff.key !== key || buff.source !== source,
  );
  state.buffs.push({
    key,
    value,
    turnsLeft: Math.max(1, turns),
    source,
    age: 0,
  });
};

export type ActionPlan = {
  skill: ActiveSkill | null;
  comboSpent: number;
  effect: (key: string) => number;
  turns: (key: string) => number;
};

export const NO_SKILL: ActionPlan = {
  skill: null,
  comboSpent: 0,
  effect: () => 0,
  turns: () => 1,
};

const skillCost = (state: SkillUserState, skill: ActiveSkill) =>
  skill.cost *
  (1 +
    (state.previousSkill === skill
      ? (skill.effects.get("doublecastcost_per")?.value ?? 0)
      : 0) /
      100);

const canUse = (state: SkillUserState, skill: ActiveSkill) =>
  (state.cooldowns.get(skill) ?? 0) <= 0 &&
  (skill.resource === "energy" ? state.energy : state.mana) >=
    skillCost(state, skill);

const planFor = (state: SkillUserState, skill: ActiveSkill): ActionPlan => ({
  skill,
  comboSpent: isComboFinisher(skill)
    ? Math.min(state.comboPoints, skill.effects.get("combo-max")?.value ?? 0)
    : 0,
  effect: (key) => skill.effects.get(key)?.value ?? 0,
  turns: (key) => skill.effects.get(key)?.turns ?? 1,
});

export type Reach = {
  readonly reachesEnemy: boolean;
  readonly canStep: boolean;
};

const canTake = (
  state: SkillUserState,
  step: MasteryStep,
  { reachesEnemy, canStep }: Reach,
) => {
  if (step === null) return false;

  if (step === "attack") return reachesEnemy;

  if (step === "step") return canStep;

  return canUse(state, step) && (step.selfCast || reachesEnemy);
};

export const takeAction = (
  state: SkillUserState,
  reach: Reach,
): ActionPlan | "step" => {
  const { steps, repeat } = state.combatant.mastery;
  const span = repeat ? steps.length : steps.length - state.masteryCursor;

  for (let offset = 0; offset < span; offset += 1) {
    const index = (state.masteryCursor + offset) % steps.length;
    const step = steps[index] ?? null;

    if (step === null || !canTake(state, step, reach)) continue;

    state.masteryCursor = repeat ? (index + 1) % steps.length : index + 1;

    if (step === "attack") return NO_SKILL;

    return step === "step" ? step : planFor(state, step);
  }

  return reach.reachesEnemy || !reach.canStep ? NO_SKILL : "step";
};

export const gainCombo = (state: SkillUserState, points: number) => {
  state.comboPoints = Math.min(COMBO_POINT_CAP, state.comboPoints + points);
};

export const paySkill = (
  state: SkillUserState,
  skill: ActiveSkill,
  plan: ActionPlan,
) => {
  const cost = skillCost(state, skill);

  if (skill.resource === "energy") state.energy -= cost;
  else state.mana -= cost;

  state.comboPoints -= plan.comboSpent;
  gainCombo(state, plan.effect("combo-skill"));

  state.cooldowns.set(skill, skill.cooldown + 1);
  state.castThisTurn = skill;
  state.skillUses.set(skill.name, (state.skillUses.get(skill.name) ?? 0) + 1);
};

export const endSkillTurn = (state: SkillUserState) => {
  for (const [skill, turns] of state.cooldowns) {
    state.cooldowns.set(skill, turns - 1);
  }

  state.previousSkill = state.castThisTurn;
  state.castThisTurn = null;

  tickBuffs(state);
};

export const tickBuffs = (state: SkillUserState) => {
  for (const buff of state.buffs) {
    buff.turnsLeft -= 1;
    buff.age += 1;
  }

  state.buffs = state.buffs.filter((buff) => buff.turnsLeft > 0);
};
