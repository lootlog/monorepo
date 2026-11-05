/**
 * Accumulates each warrior's persisted combat totals from the battle rows.
 */
import {
  ACTOR_DAMAGE_TAKEN,
  readDamageKey,
  type DamageKey,
} from "./action-keys.js";
import {
  parseActionValue,
  parseNamedWarrior,
  parseSignedActionValue,
  type ParsedMove,
} from "./battle-log.js";
import type { NumericWarriorStat, Warrior, WarriorRoster } from "./warrior.js";

type ActionContext = {
  attacker: Warrior;
  defender: Warrior | null;
  /** The first parameter value without its sign. */
  value: number;
  signedValue: number;
  param: string;
};

type ActionHandler = (context: ActionContext) => void;

const countAttacker =
  (stat: NumericWarriorStat): ActionHandler =>
  ({ attacker }) => {
    attacker[stat]++;
  };

const addToAttacker =
  (stat: NumericWarriorStat): ActionHandler =>
  ({ attacker, value }) => {
    attacker[stat] += value;
  };

const addToDefender =
  (stat: NumericWarriorStat): ActionHandler =>
  ({ defender, value }) => {
    if (defender) defender[stat] += value;
  };

const countDefender =
  (stat: NumericWarriorStat): ActionHandler =>
  ({ defender }) => {
    if (defender) defender[stat]++;
  };

const setOnDefender =
  (stat: NumericWarriorStat): ActionHandler =>
  ({ defender, value }) => {
    if (defender) defender[stat] = value;
  };

/** Evade, parry and arrow block all make the attack miss. */
const missAttack: ActionHandler = ({ attacker, defender }) => {
  if (!defender) return;

  defender.evasions++;
  attacker.attacksEvaded++;
};

/** A block reduces the main-weapon damage by the value it reports. */
const blockAttack: ActionHandler = ({ attacker, defender, value }) => {
  if (!defender) return;

  defender.blocks++;
  defender.blockedDamage += value;
  attacker.attacksBlocked++;
};

const actorDamageTakenHandlers = Array.from(
  ACTOR_DAMAGE_TAKEN,
  ([actionType, stat]): [string, ActionHandler] => [
    actionType,
    ({ attacker, value }) => {
      if (stat) attacker[stat] += value;
      attacker.damageTaken += value;
    },
  ],
);

const ACTION_HANDLERS = new Map<string, ActionHandler>([
  ...actorDamageTakenHandlers,
  ["+rage", addToAttacker("rageDamageDealt")],
  [
    "+taken_dmg",
    ({ attacker, defender, value }) => {
      attacker.stigmaDamageDealt += value;

      if (defender) defender.stigmaDamageTaken += value;
    },
  ],
  ["+pierce", countAttacker("armorPierces")],
  ["+crit", countAttacker("criticalHits")],
  ["+fastarrow", countAttacker("fastArrows")],
  ["+injure", countDefender("injures")],
  ["+acdmg", addToAttacker("reducedArmor")],
  ["+critpierce", addToAttacker("reducedArmor")],
  ["+actdmg", addToAttacker("reducedPoisonResistance")],
  ["+resdmg", addToAttacker("magicResistanceDestroyed")],
  ["+resdmgf", addToAttacker("magicResistanceDestroyed")],
  ["+resdmgc", addToAttacker("magicResistanceDestroyed")],
  ["+resdmgl", addToAttacker("magicResistanceDestroyed")],
  // `heal` reports lost life as a negative value.
  [
    "heal",
    ({ attacker, signedValue }) => {
      if (signedValue > 0) attacker.passiveHealing += signedValue;
    },
  ],
  ["afterheal", addToAttacker("passiveHealing")],
  ["bandage", addToAttacker("activeHealing")],
  ["npc_heal", addToAttacker("activeHealing")],
  ["vamp", addToAttacker("activeHealing")],
  ["heal_target", addToDefender("activeHealing")],
  // Positive `energy` is spent energy, negative is gained energy.
  [
    "energy",
    ({ attacker, signedValue }) => {
      attacker.regeneratedEnergy -= signedValue;
    },
  ],
  [
    "en-regen",
    ({ attacker, signedValue }) => {
      attacker.regeneratedEnergy += signedValue;
    },
  ],
  [
    "+engback",
    ({ attacker, signedValue }) => {
      attacker.regeneratedEnergy += signedValue;
    },
  ],
  ["+energy", addToDefender("destroyedEnergy")],
  ["+endest", addToDefender("destroyedEnergy")],
  ["-endest", addToDefender("destroyedEnergy")],
  ["+manadest", addToDefender("destroyedMana")],
  ["-manadest", addToDefender("destroyedMana")],
  // Margonem reports received mana as a negative `mana` value.
  [
    "mana",
    ({ attacker, signedValue }) => {
      attacker.regeneratedMana -= signedValue;
    },
  ],
  [
    "managain",
    ({ attacker, signedValue }) => {
      attacker.regeneratedMana += signedValue;
    },
  ],
  ["manatransfer", addToDefender("regeneratedMana")],
  [
    "stealmana",
    ({ attacker, defender, value }) => {
      if (!defender) return;

      defender.destroyedMana += value;
      attacker.regeneratedMana += value;
    },
  ],
  ["-evade", missAttack],
  ["-parry", missAttack],
  ["-arrowblock", missAttack],
  ["-blok", blockAttack],
  ["-contra", countDefender("counters")],
  ["+legbon_curse", countAttacker("legbonCurse")],
  ["+legbon_holytouch", countAttacker("legbonHolytouch")],
  ["legbon_holytouch_heal", addToAttacker("legbonHolytouchValue")],
  ["+legbon_verycrit", countAttacker("legbonVerycrit")],
  ["+legbon_anguish", countAttacker("legbonAnguish")],
  ["-legbon_cleanse", countDefender("legbonCleanse")],
  ["-legbon_glare", countDefender("legbonGlare")],
  ["-legbon_critred", setOnDefender("legbonCritredValue")],
  ["-legbon_facade", setOnDefender("legbonFacadeValue")],
  [
    "+legbon_puncture",
    ({ attacker, value }) => {
      attacker.legbonPunctureValue = value;
    },
  ],
]);

/** Skills whose cast is followed by two attack rows instead of one. */
const TWO_FOLLOW_UP_SKILL_IDS = new Set([97, 239]);

export class CombatTotals {
  /** The last HP percentage each warrior reported. */
  readonly lastHp = new Map<string, number>();
  winner = "";
  loser = "";
  hasFlee = false;
  private lastAttackerId: string | null = null;
  private remainingFollowUpAttacks = 0;

  constructor(
    private readonly roster: WarriorRoster,
    private readonly characterId: string,
  ) {
    for (const id of roster.byId.keys()) this.lastHp.set(id, 100);
  }

  recordMove(move: ParsedMove): void {
    if (move.actions.length > 0) {
      this.recordTurn(move);
      this.recordActions(move);
    }

    this.recordHp(move);
  }

  private recordTurn(move: ParsedMove): void {
    const attacker = this.roster.get(move.attackerId);
    const tspell = move.actions.find((a) => a.actionType === "tspell");

    if (attacker && move.actions.some((a) => a.actionType === "step")) {
      attacker.turns++;
      attacker.steps++;
    }

    if (tspell) {
      if (attacker && move.defenderId) {
        attacker.turns++;
        attacker.spellsUsed++;
        const spellName = tspell.param || "unknown";
        attacker.spellsUsedMap[spellName] =
          (attacker.spellsUsedMap[spellName] ?? 0) + 1;
      }

      const skillIdParam =
        move.actions.find((a) => a.actionType === "skillId")?.param ??
        tspell.param;

      const skillId = skillIdParam ? Number.parseInt(skillIdParam, 10) : 0;

      this.remainingFollowUpAttacks = TWO_FOLLOW_UP_SKILL_IDS.has(skillId)
        ? 2
        : 1;
    } else if (
      this.remainingFollowUpAttacks > 0 &&
      move.attackerId === this.lastAttackerId
    ) {
      this.remainingFollowUpAttacks--;
    } else {
      if (attacker && move.defenderId) {
        attacker.turns++;
        attacker.normalAttacks++;
      }

      this.remainingFollowUpAttacks = 0;
    }

    this.lastAttackerId = move.attackerId;
  }

  private recordActions(move: ParsedMove): void {
    const attacker = this.roster.get(move.attackerId);
    const defender = this.roster.get(move.defenderId);
    const hasSpell = move.actions.some((a) => a.actionType === "tspell");
    let defenderTakenDamage = 0;

    for (const { actionType, param } of move.actions) {
      if (actionType === "winner") {
        this.winner = param;
        continue;
      }

      if (actionType === "loser") {
        this.loser = param;
        continue;
      }

      if (actionType === "+ph") {
        const warrior = this.roster.get(this.characterId);

        if (warrior) warrior.ph = +param;
        continue;
      }

      if (actionType === "txt") {
        this.recordText(param);
        continue;
      }

      if (!attacker) continue;

      const value = parseActionValue(param);
      const damageKey = readDamageKey(actionType);

      if (damageKey) {
        defenderTakenDamage += this.recordAttackDamage(
          attacker,
          defender,
          damageKey,
          value,
        );
        continue;
      }

      if (actionType === "+oth_dmg") {
        this.recordOtherDamage(attacker, defender, param, value, hasSpell);
        continue;
      }

      if (actionType === "flee") {
        attacker.fled = true;
        this.hasFlee = true;
        continue;
      }

      if (actionType === "legbon_lastheal") {
        this.recordLastHeal(attacker, defender, param, value);
        continue;
      }

      ACTION_HANDLERS.get(actionType)?.({
        attacker,
        defender,
        value,
        signedValue: parseSignedActionValue(param),
        param,
      });
    }

    if (move.defenderId && defenderTakenDamage > 0) {
      this.estimateMaxHp(
        move.defenderId,
        defenderTakenDamage,
        move.defenderHpPercentage,
      );
    }
  }

  /** Returns the damage the defender took after its defence. */
  private recordAttackDamage(
    attacker: Warrior,
    defender: Warrior | null,
    damageKey: DamageKey,
    value: number,
  ): number {
    if (damageKey.side === "dealt") {
      attacker.damageDealt += value;

      if (damageKey.stat) attacker[damageKey.stat] += value;

      return 0;
    }

    attacker.damageDealtAfterDefensive += value;

    if (!defender) return 0;

    defender.damageTaken += value;
    defender.flatDamageTaken += value;

    if (damageKey.stat) defender[damageKey.stat] += value;

    return value;
  }

  /** Margonem sends lost turns and surrender as server text. */
  private recordText(param: string): void {
    if (param.includes("utrata tury")) {
      const warriorName = param.split(" - ")[0]?.trim();
      const warrior = warriorName ? this.roster.findByName(warriorName) : null;

      if (warrior) {
        warrior.turns++;
        warrior.turnsLost++;
      }

      return;
    }

    if (param.includes("poddał walkę")) {
      const warriorName = param.split(" poddał walkę")[0]?.trim();
      const warrior = warriorName ? this.roster.findByName(warriorName) : null;

      if (warrior) warrior.surrendered = true;
    }
  }

  /**
   * `+oth_dmg=value,class,Name(hp%)` is damage a warrior other than the row's
   * target took. Damage to the actor or its team is reflected by the target;
   * damage to an opponent is a spell's or a wide swing's extra hit.
   */
  private recordOtherDamage(
    attacker: Warrior,
    defender: Warrior | null,
    param: string,
    damage: number,
    hasSpell: boolean,
  ): void {
    const named = parseNamedWarrior(param, 2);
    const targetId = named ? this.roster.findIdByName(named.name) : null;
    const target = this.roster.get(targetId);

    if (!named || !targetId || !target) {
      this.recordUnnamedOtherDamage(attacker, defender, damage, hasSpell);

      return;
    }

    target.damageTaken += damage;

    if (target.team === attacker.team) {
      target.trueDamageTaken += damage;
      target.reflectedDamageTaken += damage;

      if (defender) defender.reflectedDamage += damage;
    } else if (hasSpell) {
      attacker.damageDealt += damage;
      attacker.trueDamageDealt += damage;
      target.trueDamageTaken += damage;
    } else {
      attacker.damageDealt += damage;
      attacker.damageDealtAfterDefensive += damage;
      target.flatDamageTaken += damage;
    }

    if (named.hpPercentage !== null) {
      this.estimateMaxHp(targetId, damage, named.hpPercentage);
      this.lastHp.set(targetId, named.hpPercentage);
    }
  }

  private recordUnnamedOtherDamage(
    attacker: Warrior,
    defender: Warrior | null,
    damage: number,
    hasSpell: boolean,
  ): void {
    if (hasSpell) {
      attacker.damageDealt += damage;
      attacker.trueDamageDealt += damage;

      if (defender) {
        defender.damageTaken += damage;
        defender.trueDamageTaken += damage;
      }

      return;
    }

    attacker.damageTaken += damage;
    attacker.trueDamageTaken += damage;
    attacker.reflectedDamageTaken += damage;

    if (defender) defender.reflectedDamage += damage;
  }

  /** `legbon_lastheal=value,Name` heals the warrior it names. */
  private recordLastHeal(
    attacker: Warrior,
    defender: Warrior | null,
    param: string,
    value: number,
  ): void {
    const named = parseNamedWarrior(param, 1);

    const healed =
      (named ? this.roster.findByName(named.name) : null) ??
      defender ??
      attacker;

    healed.legbonLastheal++;
    healed.legbonLasthealValue += value;
  }

  private recordHp(move: ParsedMove): void {
    for (const [id, hp] of [
      [move.attackerId, move.attackerHpPercentage],
      [move.defenderId, move.defenderHpPercentage],
    ] as const) {
      if (!id || hp === null) continue;

      const warrior = this.roster.get(id);

      if (warrior && hp <= 0) warrior.isDead = true;

      this.lastHp.set(id, hp);
    }
  }

  /** Derives max HP from damage and the HP percentage it removed. */
  private estimateMaxHp(
    warriorId: string,
    damageReceived: number,
    hpAfter: number | null,
  ): void {
    const warrior = this.roster.get(warriorId);

    if (!warrior || damageReceived <= 0 || hpAfter === null) return;

    const hpBefore = this.lastHp.get(warriorId);

    if (hpBefore === undefined) return;

    const hpDrop = hpBefore - hpAfter;

    if (hpDrop <= 0) return;

    const calculatedMaxHp = Math.round(damageReceived / (hpDrop / 100));

    if (
      calculatedMaxHp > 0 &&
      calculatedMaxHp < 1_000_000 &&
      calculatedMaxHp > warrior.maxHp
    ) {
      warrior.maxHp = calculatedMaxHp;
    }
  }
}
