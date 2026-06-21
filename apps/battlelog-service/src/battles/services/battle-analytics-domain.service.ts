import { Injectable } from "@nestjs/common";
import {
  inflateBattleWarriorsInBattles,
  type InflatedBattleWarrior,
} from "src/battles/battle-warrior-stats";
import type {
  BattleResult,
  InflatedBattleWithWarriors,
  StoredBattleWithWarriors,
} from "src/battles/services/battle-analytics.types";

@Injectable()
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
    return {
      name: warrior?.name ?? "",
      lvl: warrior?.lvl ?? 0,
      prof: warrior?.prof ?? "",
      icon: warrior?.icon ?? "",
      fireDamage: warrior?.fireDamage ?? 0,
      frostDamage: warrior?.frostDamage ?? 0,
      lightningDamage: warrior?.lightningDamage ?? 0,
      poisonDamageTaken: warrior?.poisonDamageTaken ?? 0,
      woundDamageTaken: warrior?.woundDamageTaken ?? 0,
      critWoundDamageTaken: warrior?.critWoundDamageTaken ?? 0,
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
