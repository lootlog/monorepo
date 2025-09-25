import { CreateBattleDto } from 'src/battles/dto/create-battle.dto';

export type Warrior = {
  turns: number;
  originalId: string;
  name: string;
  lvl: number;
  prof: string;
  icon: string;
  team: number;
  damageDealt: number;
  damageDealtAfterDefensive: number;
  damageTaken: number;
  rageDamageDealt: number;
  trueDamageDealt: number;
  trueDamageTaken: number;
  passiveHealing: number;
  activeHealing: number;
  armorPierces: number;
  criticalHits: number;
  reducedArmor: number;
  reducedPoisonResistance: number;
  woundDamageTaken: number;
  poisonDamageTaken: number;
  injureDamageTaken: number;
  critWoundDamageTaken: number;
  evasions: number;
  fastArrows: number;
  firePassiveDamageTaken: number;
  lightningPassiveDamageTaken: number;
  destroyedEnergy: number;
  destroyedMana: number;
  blockedDamage: number;
  blocks: number;
  regeneratedEnergy: number;
  reflectedDamage: number;
  reflectedDamageTaken: number;
  legbons: {
    curse: number;
    cleanse: number;
    lastheal: number;
    lasthealValue: number;
    glare: number;
    holytouch: number;
    critred: number;
    facade: number;
    verycrit: number;
  };
};

type ParsedMove = {
  attackerId: string | null;
  defenderId: string | null;
  attackerHpPercentage: number | null;
  defenderHpPercentage: number | null;
  actions: { actionType: string; param: string }[];
};

export type BattleAnalysis = {
  duration: number;
  warriors: Warrior[];
  outcome: {
    winner: string;
    loser: string;
  };
  type: string;
};

export class BattleProcessor {
  private readonly warriors = new Map<string, Warrior>();
  private readonly battleOutcome = {
    winner: '',
    loser: '',
  };
  private battleType = '';

  processBattle(battleData: CreateBattleDto): BattleAnalysis {
    const duration = this.calculateBattleDuration(battleData.events);
    this.initializeBattleWarriors(battleData.events);
    this.determineBattleType();

    const moves = this.extractAndParseMoves(battleData.events);
    this.calculateBattleStats(moves);

    return {
      duration,
      warriors: Array.from(this.warriors.values()),
      outcome: this.battleOutcome,
      type: this.battleType,
    };
  }

  private extractAndParseMoves(
    events: CreateBattleDto['events'],
  ): ParsedMove[] {
    const allMoves: string[] = [];

    for (const event of events) {
      if (event.f?.m?.length) {
        allMoves.push(...event.f.m);
      }
    }

    return allMoves.map((move) => {
      const [attackerPart, defenderPart, ...actions] = move.split(';');
      const [attackerId, attackerHp] = attackerPart.split('=');
      const [defenderId, defenderHp] = defenderPart.split('=');

      return {
        attackerId: attackerId !== '0' ? attackerId : null,
        defenderId: defenderId !== '0' ? defenderId : null,
        attackerHpPercentage: attackerHp ? parseInt(attackerHp, 10) : null,
        defenderHpPercentage: defenderHp ? parseInt(defenderHp, 10) : null,
        actions: actions.map((action) => {
          const [actionType, param = ''] = action.split('=');
          return { actionType, param };
        }),
      };
    });
  }

  private calculateBattleStats(moves: ParsedMove[]) {
    for (const move of moves) {
      this.processOutcome(move);

      if (!move.actions.length) continue;

      const hasSpell = move.actions.some(
        (action) => action.actionType === 'tspell',
      );

      if (move.attackerId && move.defenderId && !hasSpell) {
        const attacker = this.warriors.get(move.attackerId);
        if (attacker) attacker.turns++;
      }

      this.processActions(move, hasSpell);
    }
  }

  private processActions(move: ParsedMove, hasSpell: boolean) {
    const attacker = move.attackerId
      ? this.warriors.get(move.attackerId)
      : null;
    const defender = move.defenderId
      ? this.warriors.get(move.defenderId)
      : null;

    for (const { actionType, param } of move.actions) {
      if (actionType === 'winner') {
        this.battleOutcome.winner = param;
        continue;
      }
      if (actionType === 'loser') {
        this.battleOutcome.loser = param;
        continue;
      }

      if (!attacker) continue;

      const value = parseInt(param, 10);
      const [firstParam] = param.split(',');
      const firstValue = firstParam ? parseInt(firstParam, 10) : 0;

      switch (actionType) {
        case '+dmgd':
        case '+dmg':
        case '+dmgo':
        case '+dmgf':
        case '+dmgc':
        case '+dmgl':
        case '+thirdatt':
          attacker.damageDealt += value;
          break;

        case '-dmg':
        case '-dmgd':
        case '-dmgo':
        case '-dmgf':
        case '-dmgc':
        case '-dmgl':
        case '-thirdatt':
          attacker.damageDealtAfterDefensive += value;
          if (defender) defender.damageTaken += value;
          break;

        case '+oth_dmg':
          if (hasSpell) {
            attacker.damageDealt += firstValue;
            attacker.trueDamageDealt += firstValue;
            if (defender) {
              defender.damageTaken += firstValue;
              defender.trueDamageTaken += firstValue;
            }
          } else {
            attacker.damageTaken += firstValue;
            attacker.trueDamageTaken += firstValue;
          }
          break;

        case '+rage':
          attacker.rageDamageDealt += value;
          break;

        case '+pierce':
          attacker.armorPierces++;
          break;

        case '+crit':
          attacker.criticalHits++;
          break;

        case 'heal':
          attacker.passiveHealing += value;
          break;

        case 'bandage':
          attacker.activeHealing += value;
          break;

        case '+acdmg':
          attacker.reducedArmor += value;
          break;

        case 'wound':
          attacker.woundDamageTaken += value;
          break;

        case 'critwound':
          attacker.critWoundDamageTaken += value;
          break;

        case 'poison':
          attacker.poisonDamageTaken += value;
          break;

        case '+actdmg':
          attacker.reducedPoisonResistance += value;
          break;

        case 'injure':
          attacker.injureDamageTaken += value;
          break;

        case '+injure':
          if (defender) defender.injureDamageTaken += value;
          break;

        case '+fastarrow':
          attacker.fastArrows++;
          break;

        case 'fire':
          attacker.firePassiveDamageTaken += value;
          break;

        case 'light':
          attacker.lightningPassiveDamageTaken += value;
          break;

        case 'energy':
          attacker.regeneratedEnergy -= value;
          break;

        case 'en-regen':
          attacker.regeneratedEnergy += value;
          break;

        case '+legbon_curse':
          attacker.legbons.curse++;
          break;

        case '+legbon_holytouch':
          attacker.legbons.holytouch++;
          break;

        case '+legbon_verycrit':
          attacker.legbons.verycrit++;
          break;

        case 'legbon_lastheal':
          if (defender) {
            defender.legbons.lastheal++;
            defender.legbons.lasthealValue += value;
          } else {
            attacker.legbons.lastheal++;
            attacker.legbons.lasthealValue += value;
          }
          break;
      }

      if (!defender) continue;

      switch (actionType) {
        case '-evade':
          defender.evasions++;
          break;

        case '-blok':
          defender.blocks++;
          defender.blockedDamage += value;
          break;

        case '-endest':
          defender.destroyedEnergy += value;
          break;

        case '-manadest':
          defender.destroyedMana += value;
          break;

        case 'en-regen':
          defender.regeneratedEnergy += value;
          break;

        case '-legbon_cleanse':
          defender.legbons.cleanse++;
          break;

        case '-legbon_glare':
          defender.legbons.glare++;
          break;

        case '-legbon_critred':
          defender.legbons.critred++;
          break;

        case '-legbon_facade':
          defender.legbons.facade++;
          break;
      }
    }
  }

  private initializeBattleWarriors(events: CreateBattleDto['events']): void {
    for (const event of events) {
      if (!event.f?.w) continue;

      for (const [id, warriorData] of Object.entries(event.f.w)) {
        if (this.warriors.has(id)) continue;

        this.warriors.set(id, {
          turns: 0,
          originalId: warriorData.originalId.toString(),
          name: warriorData.name,
          lvl: warriorData.lvl,
          prof: warriorData.prof,
          icon: warriorData.icon,
          team: warriorData.team,
          damageDealt: 0,
          damageDealtAfterDefensive: 0,
          damageTaken: 0,
          rageDamageDealt: 0,
          trueDamageDealt: 0,
          trueDamageTaken: 0,
          passiveHealing: 0,
          activeHealing: 0,
          armorPierces: 0,
          criticalHits: 0,
          reducedArmor: 0,
          reducedPoisonResistance: 0,
          woundDamageTaken: 0,
          poisonDamageTaken: 0,
          injureDamageTaken: 0,
          critWoundDamageTaken: 0,
          evasions: 0,
          fastArrows: 0,
          firePassiveDamageTaken: 0,
          lightningPassiveDamageTaken: 0,
          destroyedEnergy: 0,
          destroyedMana: 0,
          blockedDamage: 0,
          blocks: 0,
          regeneratedEnergy: 0,
          reflectedDamage: 0,
          reflectedDamageTaken: 0,
          legbons: {
            curse: 0,
            cleanse: 0,
            lastheal: 0,
            lasthealValue: 0,
            glare: 0,
            holytouch: 0,
            critred: 0,
            facade: 0,
            verycrit: 0,
          },
        });
      }
    }
  }

  private calculateBattleDuration(events: CreateBattleDto['events']): number {
    if (!events.length) {
      throw new Error('No events found in battle data');
    }

    const firstTimestamp = events[0]?.ev || 0;
    const lastTimestamp = events[events.length - 1]?.ev || 0;

    return lastTimestamp - firstTimestamp;
  }

  private processOutcome(move: ParsedMove) {
    for (const { actionType, param } of move.actions) {
      if (actionType === 'winner') {
        this.battleOutcome.winner = param;
      } else if (actionType === 'loser') {
        this.battleOutcome.loser = param;
      }
    }
  }

  private determineBattleType() {
    const warriors = Array.from(this.warriors.values());
    const team1Count = warriors.filter((w) => w.team === 1).length;
    const team2Count = warriors.filter((w) => w.team === 2).length;

    this.battleType = `${team1Count}v${team2Count}`;
  }
}
