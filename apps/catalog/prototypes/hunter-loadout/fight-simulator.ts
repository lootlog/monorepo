import {
  buffTotal,
  chooseAction,
  endSkillTurn,
  gainCombo,
  isAttackSkill,
  payAndActivate,
  type ActionPlan,
  type ActiveSkill,
  type ComboGain,
  type SkillUserState,
} from "./fight-skills.js";

export type Profession = "h" | "w" | "p" | "b" | "m" | "t";

export type DamageRange = { readonly min: number; readonly max: number };

export type Combatant = {
  readonly name: string;
  readonly profession: Profession;
  readonly level: number;
  readonly hp: number;
  readonly physical: DamageRange;
  readonly offhand: DamageRange;
  readonly fire: DamageRange;
  readonly frost: DamageRange;
  readonly light: DamageRange;
  readonly poison: { readonly damage: number; readonly slow: number };
  readonly wound: { readonly chance: number; readonly damage: number };
  readonly attackSpeed: number;
  readonly critChance: number;
  readonly critValue: number;
  readonly critMagicValue: number;
  readonly critReduction: number;
  readonly pierce: number;
  readonly pierceBlock: number;
  readonly armor: number;
  readonly armorDestruction: number;
  readonly evadePoints: number;
  readonly evadeReduction: number;
  readonly blockPoints: number;
  readonly absorb: number;
  readonly absorbMagic: number;
  readonly resistFire: number;
  readonly resistFrost: number;
  readonly resistLight: number;
  readonly resistPoison: number;
  readonly resistWound: number;
  readonly healing: number;
  readonly healingReduction: number;
  readonly energy: number;
  readonly energyGain: number;
  readonly mana: number;
  readonly physicalBonus: number;
  readonly damageBonus: number;
  readonly damageTakenBonus: number;
  readonly enemySlow: number;
  readonly slowReduction: number;
  readonly fastArrowChance: number;
  readonly critSlow: number;
  readonly comboGain: ComboGain;
  readonly actives: readonly ActiveSkill[];
};

export type Targeting = "weakest" | "random";

export type FightSetup = {
  readonly teams: readonly (readonly Combatant[])[];
  readonly targeting?: Targeting;
};

export type FighterOutcome = {
  readonly name: string;
  readonly team: number;
  readonly alive: boolean;
  readonly hpLeft: number;
  readonly moves: number;
  readonly damageDealt: number;
  readonly hits: number;
  readonly crits: number;
  readonly evaded: number;
  readonly pierced: number;
  readonly healed: number;
  readonly skillUses: ReadonlyMap<string, number>;
};

export type FightResult = {
  readonly winner: number | null;
  readonly time: number;
  readonly moves: number;
  readonly fighters: readonly FighterOutcome[];
};

const MOVES_PER_PLAYER = 75;

const LEVEL_CAP_FOR_CHANCES = 300;

const MAX_EVADE_OR_BLOCK = 50;

const EVADE_OR_BLOCK_PER_POINT = 20;

const BLOCK_REDUCTION = 0.3;

const MAX_RESISTANCE = 90;

const MIN_CRIT = 1;

const SLOW_FLOOR_FACTOR = 3;

const FAST_ARROW_TIME_FACTOR = 0.25;

const ARMOR_FLOOR = 0.5;

const MAGIC_ARMOR_FACTOR = 0.5;

const ARMOR_FORMULA_VERTEX = 1.13 / 0.62;

const PHYSICAL_ABSORB_SHARE = 0.75;

const MAGIC_ABSORB_SHARE = 0.9;

const LIGHT_RAMP_PER_ATTACK = 0.025;

const LIGHT_RAMP_MAX = 0.5;

const DOT_TURNS = 5;

const WOUND_EXTENSION_TURNS = 2;

const WOUND_GROWTH = 0.5;

const WOUND_CAP_FACTOR = 2;

const HEAL_DECAY = 0.05;

const MELEE_ABSORBED: ReadonlySet<Profession> = new Set(["w", "p", "b"]);

const SHIELD_BEARERS: ReadonlySet<Profession> = new Set(["w", "p"]);

const UNAVOIDABLE: ReadonlySet<Profession> = new Set(["m"]);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const armorReduced = (damage: number, armor: number) => {
  if (damage <= 0 || armor <= 0) return Math.max(0, damage);

  const effectiveArmor = Math.min(armor, ARMOR_FORMULA_VERTEX * damage);

  return Math.max(
    0,
    damage - effectiveArmor * (1.13 - (0.31 * effectiveArmor) / damage),
  );
};

type DamageOverTime = { damage: number; turnsLeft: number };

type Wound = DamageOverTime & { cap: number };

type Poison = DamageOverTime & { slow: number };

type FighterState = SkillUserState & {
  index: number;
  team: number;
  combatant: Combatant;
  hp: number;
  alive: boolean;
  clock: number;
  armorLost: number;
  absorbLeft: number;
  absorbMagicLeft: number;
  healTriggers: number;
  poison: Poison | null;
  wound: Wound | null;
  slowBySource: Map<number, number>;
  critSlowTurns: number;
  critSlowValue: number;
  lightAttacks: Map<number, number>;
  moves: number;
  damageDealt: number;
  hits: number;
  crits: number;
  evaded: number;
  pierced: number;
  healed: number;
};

const strongestEnemySlow = (state: FighterState) => {
  let strongest = 0;

  for (const value of state.slowBySource.values())
    strongest = Math.max(strongest, value);

  return strongest;
};

const attackTime = (state: FighterState) => {
  const { attackSpeed, slowReduction } = state.combatant;

  const additive =
    buffTotal(state, "sa_per") / 100 -
    (state.critSlowTurns > 0 ? state.critSlowValue / 100 : 0);

  const reduction = clamp(slowReduction, 0, 100) / 100;
  const weaponSlow = state.poison ? state.poison.slow : 0;

  const constantSlow =
    (weaponSlow + strongestEnemySlow(state)) * (1 - reduction);

  const modified = attackSpeed * (1 + additive) - constantSlow;

  return Math.min(
    1 / Math.max(modified, 1e-9),
    SLOW_FLOOR_FACTOR / attackSpeed,
  );
};

const roll = (random: () => number, range: DamageRange) =>
  range.max <= range.min
    ? range.min
    : range.min + Math.floor(random() * (range.max - range.min + 1));

const evadeChance = (
  defender: FighterState,
  attacker: FighterState,
  activeReduction: number,
) => {
  if (UNAVOIDABLE.has(attacker.combatant.profession)) return 0;

  const points = Math.max(
    0,
    defender.combatant.evadePoints - attacker.combatant.evadeReduction,
  );

  const chance = Math.min(
    MAX_EVADE_OR_BLOCK,
    (points * EVADE_OR_BLOCK_PER_POINT) /
      Math.min(attacker.combatant.level, LEVEL_CAP_FOR_CHANCES),
  );

  return Math.max(0, chance - activeReduction) / 100;
};

const blockChance = (
  defender: FighterState,
  attacker: FighterState,
  activeReduction: number,
) => {
  if (!SHIELD_BEARERS.has(defender.combatant.profession)) return 0;

  const chance = Math.min(
    MAX_EVADE_OR_BLOCK,
    (defender.combatant.blockPoints * EVADE_OR_BLOCK_PER_POINT) /
      Math.min(attacker.combatant.level, LEVEL_CAP_FOR_CHANCES),
  );

  return Math.max(0, chance - activeReduction) / 100;
};

const currentArmor = (defender: FighterState) =>
  Math.max(
    ARMOR_FLOOR * defender.combatant.armor,
    defender.combatant.armor - defender.armorLost,
  );

const resistance = (defender: FighterState, base: number, buffKey: string) =>
  clamp(base + buffTotal(defender, buffKey), 0, MAX_RESISTANCE) / 100;

const absorbFrom = (damage: number, share: number, pool: number) => {
  const absorbed = Math.min(pool, damage * share);

  return { damage: damage - absorbed, absorbed };
};

const tickDamageOverTime = (state: FighterState) => {
  let damage = 0;

  if (state.poison) {
    damage +=
      state.poison.damage *
      (1 - clamp(state.combatant.resistPoison, 0, MAX_RESISTANCE) / 100);
    state.poison.turnsLeft -= 1;

    if (state.poison.turnsLeft <= 0) state.poison = null;
  }

  if (state.wound) {
    damage +=
      state.wound.damage *
      (1 - clamp(state.combatant.resistWound, 0, MAX_RESISTANCE) / 100);
    state.wound.turnsLeft -= 1;

    if (state.wound.turnsLeft <= 0) state.wound = null;
  }

  return Math.round(damage);
};

const applyHealing = (
  state: FighterState,
  enemies: readonly FighterState[],
) => {
  const base = state.combatant.healing;

  if (base <= 0 || state.hp >= state.combatant.hp) return;

  const decayed = base * (1 - HEAL_DECAY * state.healTriggers);

  if (decayed <= 0) return;

  let reduction = 0;

  for (const enemy of enemies) {
    if (enemy.alive)
      reduction = Math.max(reduction, enemy.combatant.healingReduction);
  }

  state.healTriggers += 1;

  const healed = Math.min(
    state.combatant.hp - state.hp,
    Math.max(0, Math.round(decayed - reduction)),
  );

  state.hp += healed;
  state.healed += healed;
};

const pickTarget = (
  enemies: readonly FighterState[],
  targeting: Targeting,
  random: () => number,
) => {
  const alive = enemies.filter((enemy) => enemy.alive);

  if (alive.length === 0) return null;

  if (targeting === "random")
    return alive[Math.floor(random() * alive.length)] ?? null;

  return alive.reduce((target, enemy) =>
    enemy.hp < target.hp ? enemy : target,
  );
};

type Hit = {
  attacker: FighterState;
  defender: FighterState;
  plan: ActionPlan;
  crit: boolean;
  random: () => number;
};

const physicalDamage = (
  { attacker, defender, plan, crit, random }: Hit,
  pierced: boolean,
  blockFactor: number,
) => {
  const a = attacker.combatant;

  const raw =
    roll(random, a.physical) *
    (1 + plan.effect("adddmg_physical-perw") / 100) *
    (1 + a.physicalBonus / 100) *
    (crit ? a.critValue / 100 : 1) *
    blockFactor;

  const reduced = pierced ? raw : armorReduced(raw, currentArmor(defender));

  if (!MELEE_ABSORBED.has(a.profession) || reduced <= 0) return reduced;

  const absorbed = absorbFrom(
    reduced,
    PHYSICAL_ABSORB_SHARE,
    defender.absorbLeft,
  );

  defender.absorbLeft -= absorbed.absorbed;

  return absorbed.damage;
};

const magicDamage = (
  { attacker, defender, crit, random }: Hit,
  blockFactor: number,
) => {
  const a = attacker.combatant;
  const d = defender.combatant;
  const armor = currentArmor(defender);
  const previousAttacks = attacker.lightAttacks.get(defender.index) ?? 0;

  const lightRamp = Math.min(
    LIGHT_RAMP_MAX,
    LIGHT_RAMP_PER_ATTACK * previousAttacks,
  );

  const magicCrit = crit ? a.critMagicValue / 100 : 1;

  attacker.lightAttacks.set(defender.index, previousAttacks + 1);

  const element = (
    range: DamageRange,
    ramp: number,
    base: number,
    buffKey: string,
  ) => {
    if (range.max <= 0) return 0;

    const raw = roll(random, range) * (1 + ramp) * magicCrit * blockFactor;

    return (
      armorReduced(raw, MAGIC_ARMOR_FACTOR * armor) *
      (1 - resistance(defender, base, buffKey))
    );
  };

  const magic =
    element(a.fire, 0, d.resistFire, "resfire_per") +
    element(a.frost, 0, d.resistFrost, "resfrost_per") +
    element(a.light, lightRamp, d.resistLight, "reslight_per");

  if (magic <= 0) return 0;

  const absorbed = absorbFrom(
    magic,
    MAGIC_ABSORB_SHARE,
    defender.absorbMagicLeft,
  );

  defender.absorbMagicLeft -= absorbed.absorbed;

  return absorbed.damage;
};

const mainWeaponHit = (hit: Hit, damageScale: number) => {
  const { attacker, defender, plan, random } = hit;
  const a = attacker.combatant;
  const d = defender.combatant;

  const blocked =
    random() <
    blockChance(defender, attacker, plan.effect("active_decblock_per"));

  const pierced =
    !blocked && random() < a.pierce / 100 && !(random() < d.pierceBlock / 100);

  const blockFactor = blocked ? 1 - BLOCK_REDUCTION : 1;

  if (blocked) gainCombo(defender, d.comboGain.block);

  if (pierced) {
    attacker.pierced += 1;
    gainCombo(attacker, a.comboGain.pierce);
  }

  defender.armorLost += a.armorDestruction;

  const damage = Math.round(
    (physicalDamage(hit, pierced, blockFactor) +
      magicDamage(hit, blockFactor)) *
      damageScale,
  );

  if (damage > 0) {
    const poisonApplied = applyPoison(attacker, defender, plan);

    if (applyWound(attacker, defender, plan, poisonApplied, random)) {
      gainCombo(attacker, a.comboGain.wound);
    }

    if (a.enemySlow > 0) defender.slowBySource.set(attacker.index, a.enemySlow);
  }

  return damage;
};

const strike = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
  random: () => number,
) => {
  const a = attacker.combatant;
  const d = defender.combatant;

  const damageScale =
    (1 - plan.effect("lowdmg_self") / 100) *
    (1 + buffTotal(attacker, "perdmg") / 100) *
    (1 + a.damageBonus / 100) *
    (1 + d.damageTakenBonus / 100);

  const critChance =
    Math.max(
      MIN_CRIT,
      a.critChance + buffTotal(attacker, "active_crit") - d.critReduction,
    ) / 100;

  const crit = random() < critChance;

  const evaded =
    random() <
    evadeChance(defender, attacker, plan.effect("active_decevade_per"));

  attacker.hits += 1;

  if (crit) {
    attacker.crits += 1;
    gainCombo(attacker, a.comboGain.crit);
  }

  let total = 0;

  if (evaded) attacker.evaded += 1;
  else
    total += mainWeaponHit(
      { attacker, defender, plan, crit, random },
      damageScale,
    );

  if (a.offhand.max > 0) {
    const offhandRaw = roll(random, a.offhand) * (crit ? a.critValue / 100 : 1);
    total += Math.round(
      armorReduced(offhandRaw, currentArmor(defender)) * damageScale,
    );
  }

  if (plan.comboSpent > 0) {
    total += Math.round(
      ((plan.effect("combo_dmg_hpp-target") * plan.comboSpent) / 100) *
        d.hp *
        (1 + d.damageTakenBonus / 100),
    );
  }

  if (crit && a.critSlow > 0) {
    defender.critSlowValue = a.critSlow;
    defender.critSlowTurns = 1;
  }

  defender.hp -= total;
  attacker.damageDealt += total;

  if (defender.hp < 1) {
    defender.alive = false;
    defender.hp = 0;
  }
};

const applyPoison = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
) => {
  const { poison } = attacker.combatant;

  if (poison.damage <= 0) return false;

  const damage =
    poison.damage * (1 + plan.effect("poisonbon_poison-perw") / 100);

  const slow = poison.slow;

  if (!defender.poison || damage >= defender.poison.damage) {
    defender.poison = {
      damage,
      slow: Math.max(slow, defender.poison?.slow ?? 0),
      turnsLeft: DOT_TURNS,
    };
  } else {
    defender.poison.turnsLeft = DOT_TURNS;
    defender.poison.slow = Math.max(defender.poison.slow, slow);
  }

  return true;
};

const applyWound = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
  poisonApplied: boolean,
  random: () => number,
) => {
  const { wound } = attacker.combatant;

  if (wound.damage <= 0) return false;

  const chance =
    wound.chance +
    (defender.wound === null ? plan.effect("active_wound_per") : 0);

  if (random() >= chance / 100) return false;

  const cap = WOUND_CAP_FACTOR * wound.damage;

  if (defender.wound === null) {
    defender.wound = { damage: wound.damage, cap, turnsLeft: DOT_TURNS };

    return true;
  }

  const growth = (WOUND_GROWTH * wound.damage) / (poisonApplied ? 2 : 1);
  defender.wound.cap = Math.max(defender.wound.cap, cap);
  defender.wound.damage = Math.min(
    defender.wound.cap,
    defender.wound.damage + growth,
  );
  defender.wound.turnsLeft = Math.min(
    DOT_TURNS,
    defender.wound.turnsLeft + WOUND_EXTENSION_TURNS,
  );

  return true;
};

const endTurn = (state: FighterState) => {
  endSkillTurn(state);

  if (state.critSlowTurns > 0) state.critSlowTurns -= 1;
};

const createState = (
  combatant: Combatant,
  team: number,
  index: number,
): FighterState => ({
  index,
  team,
  combatant,
  hp: combatant.hp,
  alive: true,
  clock: 0,
  energy: combatant.energy,
  mana: combatant.mana,
  armorLost: 0,
  absorbLeft: combatant.absorb,
  absorbMagicLeft: combatant.absorbMagic,
  healTriggers: 0,
  energyRestores: 0,
  comboPoints: 0,
  cooldowns: new Map(),
  buffs: [],
  poison: null,
  wound: null,
  slowBySource: new Map(),
  critSlowTurns: 0,
  critSlowValue: 0,
  lightAttacks: new Map(),
  moves: 0,
  damageDealt: 0,
  hits: 0,
  crits: 0,
  evaded: 0,
  pierced: 0,
  healed: 0,
  skillUses: new Map(),
});

const livingTeams = (states: readonly FighterState[]) =>
  new Set(states.flatMap((state) => (state.alive ? [state.team] : [])));

export const simulateFight = (
  setup: FightSetup,
  random: () => number,
): FightResult => {
  const targeting = setup.targeting ?? "weakest";

  const states = setup.teams.flatMap((team, teamIndex) =>
    team.map((combatant) => createState(combatant, teamIndex, 0)),
  );

  states.forEach((state, index) => {
    state.index = index;
    state.clock = attackTime(state);
  });

  const enemiesOf = states.map((state) =>
    states.filter((other) => other.team !== state.team),
  );

  const maxMoves = MOVES_PER_PLAYER * states.length;
  let moves = 0;
  let time = 0;

  while (moves < maxMoves && livingTeams(states).size > 1) {
    let actor: FighterState | null = null;
    let actorPredicted = Infinity;

    for (const state of states) {
      if (!state.alive) continue;

      const predicted = state.clock + attackTime(state);

      if (predicted < actorPredicted) {
        actor = state;
        actorPredicted = predicted;
      }
    }

    if (actor === null) break;

    const enemies = enemiesOf[actor.index] ?? [];

    actor.hp -= tickDamageOverTime(actor);

    if (actor.hp < 1) {
      actor.alive = false;
      actor.hp = 0;
      continue;
    }

    applyHealing(actor, enemies);
    actor.energy = Math.min(
      actor.combatant.energy,
      actor.energy + actor.combatant.energyGain,
    );

    const plan = chooseAction(actor);
    let timeFactor = 1;

    if (plan.skill) {
      payAndActivate(actor, plan.skill, plan);
      timeFactor *= 1 - plan.effect("red-sa") / 100;
    }

    if (plan.skill === null || isAttackSkill(plan.skill)) {
      const attacks = 1 + plan.effect("add_attacks");

      for (let attack = 0; attack < attacks; attack += 1) {
        const target = pickTarget(enemies, targeting, random);

        if (target === null) break;
        strike(actor, target, plan, random);
      }

      if (random() < actor.combatant.fastArrowChance / 100)
        timeFactor *= FAST_ARROW_TIME_FACTOR;
    }

    actor.clock += attackTime(actor) * timeFactor;
    time = actor.clock;
    actor.moves += 1;
    moves += 1;
    endTurn(actor);
  }

  const alive = livingTeams(states);

  return {
    winner: alive.size === 1 ? ([...alive][0] ?? null) : null,
    time,
    moves,
    fighters: states.map((state) => ({
      name: state.combatant.name,
      team: state.team,
      alive: state.alive,
      hpLeft: state.hp,
      moves: state.moves,
      damageDealt: state.damageDealt,
      hits: state.hits,
      crits: state.crits,
      evaded: state.evaded,
      pierced: state.pierced,
      healed: state.healed,
      skillUses: state.skillUses,
    })),
  };
};
