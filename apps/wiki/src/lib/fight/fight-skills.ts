type ActiveEffect = { readonly value: number; readonly turns: number };

export type ActiveSkill = {
  readonly id: number;
  readonly name: string;
  readonly resource: "energy" | "mana";
  readonly cost: number;
  readonly cooldown: number;
  readonly effects: ReadonlyMap<string, ActiveEffect>;
};

export type ComboGain = {
  readonly crit: number;
  readonly pierce: number;
  readonly wound: number;
  readonly block: number;
};

type Buff = { key: string; value: number; turnsLeft: number };

type MasteryStep = ActiveSkill | "attack" | null;

export type MasteryQueue = {
  readonly steps: readonly MasteryStep[];
  readonly repeat: boolean;
};

export const NO_MASTERY: MasteryQueue = { steps: [], repeat: false };

export type SkillUserState = {
  combatant: {
    readonly energy: number;
    readonly actives: readonly ActiveSkill[];
    readonly mastery: MasteryQueue;
  };
  masteryCursor: number;
  energy: number;
  mana: number;
  energyRestores: number;
  comboPoints: number;
  cooldowns: Map<ActiveSkill, number>;
  buffs: Buff[];
  skillUses: Map<string, number>;
};

const ENERGY_RESTORE_DECAY = 0.1;

const ENERGY_RESTORE_THRESHOLD = 0.5;

const COMBO_POINT_CAP = 5;

const ATTACK_EFFECTS = new Set([
  "add_attacks",
  "lowdmg_self",
  "adddmg_physical-perw",
  "active_decevade_per",
  "active_decblock_per",
  "red-sa",
  "poisonbon_poison-perw",
  "active_wound_per",
  "combo_dmg_hpp-target",
]);

const BUFF_EFFECTS = new Set([
  "active_crit",
  "sa_per",
  "perdmg",
  "resfire_per",
  "resfrost_per",
  "reslight_per",
]);

const RESOURCE_EFFECTS = new Set([
  "energyrestore_per",
  "combo_energyrestore_per",
]);

const COMBO_EFFECTS = new Set(["combo-skill", "combo-max"]);

const TIMING_ONLY_EFFECTS = new Set([
  "red-sa",
  "lowdmg_self",
  ...COMBO_EFFECTS,
]);

export const SIMULATED_ACTIVE_EFFECTS: ReadonlySet<string> = new Set([
  ...ATTACK_EFFECTS,
  ...BUFF_EFFECTS,
  ...RESOURCE_EFFECTS,
  ...COMBO_EFFECTS,
]);

export const isSimulatedActive = (skill: ActiveSkill) =>
  [...skill.effects.keys()].some(
    (key) => SIMULATED_ACTIVE_EFFECTS.has(key) && !TIMING_ONLY_EFFECTS.has(key),
  );

const isComboFinisher = (skill: ActiveSkill) => skill.effects.has("combo-max");

export const isAttackSkill = (skill: ActiveSkill) =>
  !skill.effects.has("energyrestore_per");

export const buffTotal = (state: SkillUserState, key: string) => {
  let total = 0;

  for (const buff of state.buffs) if (buff.key === key) total += buff.value;

  return total;
};

export type ActionPlan = {
  skill: ActiveSkill | null;
  comboSpent: number;
  effect: (key: string) => number;
};

const NO_SKILL: ActionPlan = { skill: null, comboSpent: 0, effect: () => 0 };

const canUse = (state: SkillUserState, skill: ActiveSkill) =>
  (state.cooldowns.get(skill) ?? 0) <= 0 &&
  (skill.resource === "energy" ? state.energy : state.mana) >= skill.cost &&
  (!isComboFinisher(skill) || state.comboPoints >= 1);

const wantsToUse = (state: SkillUserState, skill: ActiveSkill) => {
  if (isComboFinisher(skill)) {
    return (
      state.comboPoints >=
      Math.min(COMBO_POINT_CAP, skill.effects.get("combo-max")?.value ?? 1)
    );
  }

  if (skill.effects.has("energyrestore_per")) {
    return state.energy < ENERGY_RESTORE_THRESHOLD * state.combatant.energy;
  }

  if (![...skill.effects.keys()].some((key) => ATTACK_EFFECTS.has(key))) {
    return ![...skill.effects.keys()].some(
      (key) =>
        BUFF_EFFECTS.has(key) && state.buffs.some((buff) => buff.key === key),
    );
  }

  return true;
};

const planFor = (state: SkillUserState, skill: ActiveSkill): ActionPlan => ({
  skill,
  comboSpent: isComboFinisher(skill)
    ? Math.min(state.comboPoints, skill.effects.get("combo-max")?.value ?? 0)
    : 0,
  effect: (key) => skill.effects.get(key)?.value ?? 0,
});

const takeQueuedAction = (
  state: SkillUserState,
  { steps, repeat }: MasteryQueue,
): ActionPlan => {
  const span = repeat ? steps.length : steps.length - state.masteryCursor;

  for (let offset = 0; offset < span; offset += 1) {
    const index = (state.masteryCursor + offset) % steps.length;
    const step = steps[index] ?? null;

    if (step === null || (step !== "attack" && !canUse(state, step))) continue;

    state.masteryCursor = repeat ? (index + 1) % steps.length : index + 1;

    return step === "attack" ? NO_SKILL : planFor(state, step);
  }

  return NO_SKILL;
};

export const takeAction = (state: SkillUserState): ActionPlan => {
  const { mastery, actives } = state.combatant;

  if (mastery.steps.length > 0) return takeQueuedAction(state, mastery);

  const skill = actives.find(
    (active) => canUse(state, active) && wantsToUse(state, active),
  );

  return skill ? planFor(state, skill) : NO_SKILL;
};

export const gainCombo = (state: SkillUserState, points: number) => {
  state.comboPoints = Math.min(COMBO_POINT_CAP, state.comboPoints + points);
};

export const payAndActivate = (
  state: SkillUserState,
  skill: ActiveSkill,
  plan: ActionPlan,
) => {
  if (skill.resource === "energy") state.energy -= skill.cost;
  else state.mana -= skill.cost;

  if (plan.comboSpent > 0) {
    state.comboPoints -= plan.comboSpent;
    const restore = plan.effect("combo_energyrestore_per") * plan.comboSpent;
    state.energy = Math.min(
      state.combatant.energy,
      state.energy + (restore / 100) * state.combatant.energy,
    );
  }

  gainCombo(state, plan.effect("combo-skill"));

  state.cooldowns.set(skill, skill.cooldown + 1);
  state.skillUses.set(skill.name, (state.skillUses.get(skill.name) ?? 0) + 1);

  for (const [key, effect] of skill.effects) {
    if (BUFF_EFFECTS.has(key)) {
      state.buffs = state.buffs.filter((buff) => buff.key !== key);
      state.buffs.push({
        key,
        value: effect.value,
        turnsLeft: Math.max(1, effect.turns),
      });
    }
  }

  const restore = skill.effects.get("energyrestore_per");

  if (restore) {
    const share =
      (restore.value / 100) *
      Math.max(0, 1 - ENERGY_RESTORE_DECAY * state.energyRestores);

    state.energyRestores += 1;
    state.energy = Math.min(
      state.combatant.energy,
      state.energy + share * state.combatant.energy,
    );
  }
};

export const endSkillTurn = (state: SkillUserState) => {
  for (const [skill, turns] of state.cooldowns) {
    state.cooldowns.set(skill, turns - 1);
  }

  for (const buff of state.buffs) buff.turnsLeft -= 1;

  state.buffs = state.buffs.filter((buff) => buff.turnsLeft > 0);
};
