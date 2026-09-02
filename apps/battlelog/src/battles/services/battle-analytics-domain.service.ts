import {
  inflateBattleWarriorsInBattles,
  type InflatedBattleWarrior,
} from "#src/battles/battle-warrior-stats";
import type {
  BattleResult,
  InflatedBattleWithWarriors,
  StoredBattleWithWarriors,
} from "#src/battles/services/battle-analytics.types";

const EMPTY_PLAYER_VS_PLAYER_WARRIOR = {
  name: "",
  lvl: 0,
  prof: "",
  icon: "",
  fireDamage: 0,
  frostDamage: 0,
  lightningDamage: 0,
  poisonDamageTaken: 0,
  woundDamageTaken: 0,
  critWoundDamageTaken: 0,
};

export class BattleAnalyticsDomainService {
  inflateBattleRows(
    fetchedBattles: StoredBattleWithWarriors[],
  ): InflatedBattleWithWarriors[] {
    return inflateBattleWarriorsInBattles(fetchedBattles);
  }

  toCharacterIdSet(characterIds: string[]): Set<string> {
    return new Set(characterIds);
  }

  findUserWarrior(
    battle: InflatedBattleWithWarriors,
    characterIds: Set<string>,
  ): InflatedBattleWarrior | undefined {
    return battle.warriors.find((warrior) =>
      characterIds.has(warrior.originalId),
    );
  }

  findOpponentWarrior(
    battle: InflatedBattleWithWarriors,
    characterIds: Set<string>,
  ): InflatedBattleWarrior | undefined {
    return battle.warriors.find(
      (warrior) => !characterIds.has(warrior.originalId),
    );
  }

  findWarrior(
    battle: InflatedBattleWithWarriors,
    originalId: string,
  ): InflatedBattleWarrior | undefined {
    return battle.warriors.find((warrior) => warrior.originalId === originalId);
  }

  getBattleResultForUserWarrior(
    battle: InflatedBattleWithWarriors,
    userWarrior: InflatedBattleWarrior,
  ): BattleResult {
    if (battle.hasFlee) {
      return "flee";
    }

    return userWarrior.team === battle.winningTeam ? "won" : "lost";
  }

  mapPlayerVsPlayerWarrior(warrior: InflatedBattleWarrior | undefined) {
    const resolvedWarrior = warrior ?? EMPTY_PLAYER_VS_PLAYER_WARRIOR;

    return {
      name: resolvedWarrior.name,
      lvl: resolvedWarrior.lvl,
      prof: resolvedWarrior.prof,
      icon: resolvedWarrior.icon,
      fireDamage: resolvedWarrior.fireDamage,
      frostDamage: resolvedWarrior.frostDamage,
      lightningDamage: resolvedWarrior.lightningDamage,
      poisonDamageTaken: resolvedWarrior.poisonDamageTaken,
      woundDamageTaken: resolvedWarrior.woundDamageTaken,
      critWoundDamageTaken: resolvedWarrior.critWoundDamageTaken,
    };
  }

  filterByOpponentLevel(
    battles: InflatedBattleWithWarriors[],
    characterIds: Set<string>,
    minLevel?: number,
    maxLevel?: number,
  ): InflatedBattleWithWarriors[] {
    if (minLevel === undefined && maxLevel === undefined) {
      return battles;
    }

    return battles.filter((battle) =>
      this.isOpponentLevelInRange(battle, characterIds, minLevel, maxLevel),
    );
  }

  filterByAnyOpponentLevel(
    battles: InflatedBattleWithWarriors[],
    characterIds: Set<string>,
    minLevel?: number,
    maxLevel?: number,
  ): InflatedBattleWithWarriors[] {
    if (minLevel === undefined && maxLevel === undefined) {
      return battles;
    }

    return battles.filter((battle) =>
      this.isAnyOpponentLevelInRange(battle, characterIds, minLevel, maxLevel),
    );
  }

  isOpponentLevelInRange(
    battle: InflatedBattleWithWarriors,
    characterIds: Set<string>,
    minLevel?: number,
    maxLevel?: number,
  ): boolean {
    if (battle.type !== "1v1") {
      return false;
    }

    const opponentWarrior = this.findOpponentWarrior(battle, characterIds);
    if (!opponentWarrior) {
      return false;
    }

    return this.isLevelInRange(opponentWarrior.lvl, minLevel, maxLevel);
  }

  isAnyOpponentLevelInRange(
    battle: InflatedBattleWithWarriors,
    characterIds: Set<string>,
    minLevel?: number,
    maxLevel?: number,
  ): boolean {
    return battle.warriors.some(
      (warrior) =>
        !characterIds.has(warrior.originalId) &&
        this.isLevelInRange(warrior.lvl, minLevel, maxLevel),
    );
  }

  roundMetric(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private isLevelInRange(
    level: number,
    minLevel?: number,
    maxLevel?: number,
  ): boolean {
    if (minLevel !== undefined && level < minLevel) {
      return false;
    }

    return maxLevel === undefined || level <= maxLevel;
  }
}
