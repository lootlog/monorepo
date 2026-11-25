import {
  clearDamageOverTime,
  skillDamageFactor,
  weakeningFactor,
} from "./fight-hit-effects";
import { destroyResource, NO_DRAIN, type Drained } from "./fight-defence";
import {
  addBuff,
  buffTotal,
  ENEMY_TEAM_DEBUFFS,
  SELF_BUFFS,
  TARGET_DEBUFFS,
  TEAM_BUFF_CASTER_SHARE,
  type ActionPlan,
  type ActiveSkill,
} from "./fight-skills";
import {
  healBy,
  isImmune,
  MELEE,
  randomPick,
  reaches,
  takeDamage,
  type FighterState,
} from "./fight-state";

export type CastOutcome = {
  readonly armorBonus: number;
  readonly healed: number;
  readonly bandaged: number;
  readonly energyRestored: number;
  readonly manaRestored: number;
  readonly flatDamage: number;
  readonly manaStolen: number;
  readonly manaDestroyed: Drained;
  readonly energyDestroyed: Drained;
  readonly swings: readonly {
    readonly target: number;
    readonly damage: number;
  }[];
};

const RESTORE_DECAY = 0.1;

const HEAL_DECAY = 0.25;

const SOLO_HEAL_ALL_SHARE = 0.5;

const ENERGY_PER_DESTROYED_MANA = 0.44;

type Cast = {
  caster: FighterState;
  target: FighterState | null;
  allies: readonly FighterState[];
  enemies: readonly FighterState[];
  skill: ActiveSkill;
  plan: ActionPlan;
  random: () => number;
};

const SWING_TARGETS = 3;

const restoredShare = (share: number, uses: number, decay: number) =>
  (share / 100) * Math.max(0, 1 - decay * uses);

const restore = (pool: number, current: number, share: number) =>
  Math.min(pool, current + share * pool) - current;

const restoreResources = ({ caster, plan }: Cast) => {
  const { energy, mana } = caster.combatant;
  const decay = Math.max(0, 1 - RESTORE_DECAY * caster.energyRestores);
  const energyShare = plan.effect("energyrestore_per") / 100;
  const manaShare = plan.effect("manarestore_per") / 100;

  const energyShares =
    (plan.effect("combo_energyrestore_per") * plan.comboSpent) / 100 +
    energyShare * decay;

  const energyRestored = restore(energy, caster.energy, energyShares);
  const manaRestored = restore(mana, caster.mana, manaShare * decay);

  caster.energy += energyRestored;
  caster.mana += manaRestored;

  if (energyShare > 0 || manaShare > 0) caster.energyRestores += 1;

  return {
    energyRestored: Math.round(energyRestored),
    manaRestored: Math.round(manaRestored),
  };
};

const lostHealthArmorBonus = (caster: FighterState, lostPerPercent: number) =>
  lostPerPercent > 0
    ? Math.floor(
        (100 - Math.floor((100 * caster.hp) / caster.combatant.hp)) /
          lostPerPercent,
      )
    : 0;

const healShare = (cast: Cast, key: string) => {
  const share = cast.plan.effect(key);

  if (share <= 0) return 0;

  const uses = cast.caster.healUses.get(key) ?? 0;

  cast.caster.healUses.set(key, uses + 1);

  return (
    restoredShare(share, uses, HEAL_DECAY) *
    (1 - buffTotal(cast.caster, "lowheal_per-enemies") / 100)
  );
};

const heal = (cast: Cast) => {
  const { caster, allies, plan } = cast;
  const lowheal = 1 - buffTotal(caster, "lowheal_per-enemies") / 100;

  const own =
    healShare(cast, "heal_per") +
    (plan.effect("combo_heal_per") * plan.comboSpent * lowheal) / 100;

  const healAll =
    healShare(cast, "healall_per") *
    (allies.length > 1 ? 1 : SOLO_HEAL_ALL_SHARE);

  let healed = healBy(caster, (own + healAll) * caster.combatant.hp);

  for (const ally of allies) {
    if (ally !== caster && ally.alive)
      healed += healBy(ally, healAll * ally.combatant.hp);
  }

  const bandaged = healBy(
    caster,
    healShare(cast, "bandage_per") * caster.combatant.hp,
  );

  return { healed, bandaged };
};

const cleanseAllies = ({ allies, plan }: Cast) => {
  for (const ally of allies) {
    if (plan.effect("removestun-allies") > 0 && ally.stunned) {
      ally.stunned = false;
    }

    if (plan.effect("removedot-allies") > 0) clearDamageOverTime(ally);
  }
};

const ARMOR_BONUS = "achpp_per";

const TAUNT = "shout";

const tauntedBy = ({ target, enemies, plan, random }: Cast) => {
  if (target === null) return [];

  const others = enemies.filter((enemy) => enemy.alive && enemy !== target);

  return [target, ...randomPick(others, plan.effect(TAUNT), random)];
};

const applyBuffs = (cast: Cast) => {
  const { caster, target, allies, enemies, skill } = cast;
  let armorBonus = 0;

  for (const [key, effect] of skill.effects) {
    const { turns } = effect;
    let { value } = effect;

    if (key === ARMOR_BONUS) {
      value = lostHealthArmorBonus(caster, value);
      armorBonus = value;
    }

    if (SELF_BUFFS.has(key)) addBuff(caster, key, value, turns, caster.index);

    const casterShare = TEAM_BUFF_CASTER_SHARE.get(key);

    if (casterShare !== undefined) {
      for (const ally of allies) {
        if (!ally.alive) continue;

        if (
          key === "aura-adddmg2_per-meele_physical" &&
          !MELEE.has(ally.combatant.profession)
        ) {
          continue;
        }

        addBuff(
          ally,
          key,
          ally === caster ? value * casterShare : value,
          turns,
          caster.index,
        );
      }
    }

    if (target && TARGET_DEBUFFS.has(key))
      addBuff(target, key, value, turns, caster.index);

    if (key === TAUNT) {
      for (const enemy of tauntedBy(cast)) {
        addBuff(enemy, key, value, turns, caster.index);
      }
    } else if (ENEMY_TEAM_DEBUFFS.has(key)) {
      for (const enemy of enemies) {
        if (enemy.alive) addBuff(enemy, key, value, turns, caster.index);
      }
    }
  }

  return armorBonus;
};

const averageFire = (caster: FighterState) =>
  (caster.combatant.fire.min + caster.combatant.fire.max) / 2;

const strikeTarget = ({ caster, target, plan, skill }: Cast) => {
  if (!target?.alive) {
    return {
      flatDamage: 0,
      manaStolen: 0,
      manaDestroyed: NO_DRAIN,
      energyDestroyed: NO_DRAIN,
    };
  }

  const fireShare = plan.effect("dmg-target_fire-perw");

  if (fireShare > 0 && averageFire(caster) > 0) {
    target.skillDots.set("fire", {
      damage: (fireShare / 100) * averageFire(caster),
      turnsLeft: skill.effects.get("dmg-target_fire-perw")?.turns ?? 1,
      source: caster.index,
    });
  }

  const manaDestroyed = destroyResource(
    target,
    "mana",
    plan.effect("manaendest"),
  );

  const energyDestroyed = destroyResource(
    target,
    "energy",
    Math.floor(plan.effect("manaendest") * ENERGY_PER_DESTROYED_MANA),
  );

  const manaStolen = Math.floor(
    (target.mana * plan.effect("stealmana_per")) / 100,
  );

  target.mana -= manaStolen;
  caster.mana = Math.min(caster.combatant.mana, caster.mana + manaStolen);

  const flatDamage = isImmune(target)
    ? 0
    : Math.floor(
        plan.effect("dmg-target_absolute") *
          skillDamageFactor(caster) *
          weakeningFactor(caster, target),
      );

  if (flatDamage > 0) {
    takeDamage(target, flatDamage);
    caster.damageDealt += flatDamage;
  }

  return { flatDamage, manaStolen, manaDestroyed, energyDestroyed };
};

const swingAround = ({ caster, target, enemies, plan, random }: Cast) => {
  const share = plan.effect("dmg-swing_absolute-perw") / 100;

  if (share <= 0) return [];

  const { physical, physicalBonus } = caster.combatant;

  const rolled =
    physical.min + Math.floor(random() * (physical.max - physical.min + 1));

  const damage = rolled * share * (1 + physicalBonus / 100);

  const candidates = enemies.filter(
    (enemy) => enemy.alive && enemy !== target && reaches(caster, enemy),
  );

  return randomPick(candidates, SWING_TARGETS, random).map((enemy) => {
    const dealt = isImmune(enemy)
      ? 0
      : Math.round(damage * weakeningFactor(caster, enemy));

    takeDamage(enemy, dealt);
    caster.damageDealt += dealt;

    return { target: enemy.index, damage: dealt };
  });
};

export const applyCast = (cast: Cast): CastOutcome => {
  const armorBonus = applyBuffs(cast);

  cleanseAllies(cast);

  return {
    armorBonus,
    ...heal(cast),
    ...restoreResources(cast),
    ...strikeTarget(cast),
    swings: swingAround(cast),
  };
};
