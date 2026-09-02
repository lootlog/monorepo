import type { CombatProfileDto } from "#src/battles/dto/battle-statistics-response.dto";
import { BattleAnalyticsDomainService } from "#src/battles/services/battle-analytics-domain.service";
import type { InflatedBattleWithWarriors } from "#src/battles/services/battle-analytics.types";

type CombatProfileHighlight = CombatProfileDto["highlights"][number];

export class CombatProfileCalculatorService {
  constructor(private readonly domainService: BattleAnalyticsDomainService) {}

  calculate(
    battles: InflatedBattleWithWarriors[],
    characterIds: Set<string>,
  ): CombatProfileDto {
    const damageMix = new Map<string, number>();
    const mitigationMix = new Map<string, number>();
    const spellUsage = new Map<
      string,
      { spell: string; skillId: number | null; casts: number }
    >();
    const matchupByProfession = new Map<
      string,
      { wins: number; losses: number }
    >();
    const highlights = new Map<string, CombatProfileHighlight>();

    let totalBattles = 0;
    let wins = 0;
    let losses = 0;
    let totalPH = 0;
    let totalRatingDelta = 0;
    let totalTurns = 0;
    let totalDuration = 0;
    let totalDamage = 0;
    let totalDamageTaken = 0;
    let totalBlockedDamage = 0;
    let totalControlTaken = 0;
    let cumulativePh = 0;
    let cumulativeRatingDelta = 0;

    const phTrend: CombatProfileDto["phTrend"] = [];
    const ratingTrend: CombatProfileDto["ratingTrend"] = [];

    for (const battle of battles) {
      const userWarrior = this.domainService.findUserWarrior(
        battle,
        characterIds,
      );

      if (!userWarrior || battle.hasFlee) {
        continue;
      }

      const isWin = userWarrior.team === battle.winningTeam;
      const isLoss = userWarrior.team === battle.losingTeam;
      if (!isWin && !isLoss) {
        continue;
      }

      totalBattles++;
      if (isWin) {
        wins++;
      } else {
        losses++;
      }

      const damage = userWarrior.damageDealtAfterDefensive;
      const damageTaken = userWarrior.damageTaken;
      const blockedDamage = userWarrior.blockedDamage;

      totalPH += userWarrior.ph;
      totalRatingDelta += battle.ratingDelta ?? 0;
      totalTurns += userWarrior.turns;
      totalDuration += battle.duration;
      totalDamage += damage;
      totalDamageTaken += damageTaken;
      totalBlockedDamage += blockedDamage;
      totalControlTaken += userWarrior.turnsLost;

      this.addDamageBreakdown(damageMix, userWarrior);
      this.addBreakdownValue(mitigationMix, "blockedDamage", blockedDamage);
      this.addBreakdownValue(mitigationMix, "blocks", userWarrior.blocks);
      this.addBreakdownValue(mitigationMix, "evasions", userWarrior.evasions);
      this.addSpellUsage(spellUsage, userWarrior.spellsUsedMap);
      this.addProfessionMatchups(
        matchupByProfession,
        battle,
        userWarrior.team,
        isWin,
      );

      cumulativePh += userWarrior.ph;
      phTrend.push({
        date: battle.createdAt.toISOString(),
        value: userWarrior.ph,
        cumulativeValue: cumulativePh,
        battleId: battle.id,
      });

      const ratingDelta = battle.ratingDelta ?? 0;
      cumulativeRatingDelta += ratingDelta;
      ratingTrend.push({
        date: battle.createdAt.toISOString(),
        value: ratingDelta,
        cumulativeValue: cumulativeRatingDelta,
        battleId: battle.id,
      });

      this.setHighlight(highlights, "biggestDamage", {
        battleId: battle.id,
        createdAt: battle.createdAt.toISOString(),
        type: "biggestDamage",
        label: "biggestDamage",
        value: damage,
      });
      this.setHighlight(highlights, "biggestMitigation", {
        battleId: battle.id,
        createdAt: battle.createdAt.toISOString(),
        type: "biggestMitigation",
        label: "biggestMitigation",
        value: blockedDamage,
      });

      if (isWin) {
        this.setHighlight(highlights, "biggestComeback", {
          battleId: battle.id,
          createdAt: battle.createdAt.toISOString(),
          type: "biggestComeback",
          label: "biggestComeback",
          value: damageTaken,
        });
      }
    }

    const winRate = totalBattles > 0 ? (wins / totalBattles) * 100 : 0;
    const avgTurns = totalBattles > 0 ? totalTurns / totalBattles : 0;
    const avgDuration = totalBattles > 0 ? totalDuration / totalBattles : 0;
    const damagePerTurn = totalTurns > 0 ? totalDamage / totalTurns : 0;
    const mitigationBase = totalDamageTaken + totalBlockedDamage;
    const mitigationRate =
      mitigationBase > 0 ? (totalBlockedDamage / mitigationBase) * 100 : 0;
    const controlRate =
      totalTurns > 0 ? (totalControlTaken / totalTurns) * 100 : 0;
    const totalSpellCasts = Array.from(spellUsage.values()).reduce(
      (sum, spell) => sum + spell.casts,
      0,
    );

    return {
      summary: {
        totalBattles,
        wins,
        losses,
        winRate: this.domainService.roundMetric(winRate),
        totalPH,
        totalRatingDelta,
        avgTurns: this.domainService.roundMetric(avgTurns),
        avgDuration: Math.round(avgDuration),
        damagePerTurn: this.domainService.roundMetric(damagePerTurn),
        mitigationRate: this.domainService.roundMetric(mitigationRate),
        controlRate: this.domainService.roundMetric(controlRate),
      },
      damageMix: this.getBreakdownEntries(damageMix),
      mitigationMix: this.getBreakdownEntries(mitigationMix),
      spellUsage: Array.from(spellUsage.values())
        .map((spell) => ({
          ...spell,
          share:
            totalSpellCasts > 0
              ? this.domainService.roundMetric(
                  (spell.casts / totalSpellCasts) * 100,
                )
              : 0,
        }))
        .sort((left, right) => right.casts - left.casts)
        .slice(0, 12),
      matchupByProfession: Array.from(matchupByProfession.entries())
        .map(([prof, stats]) => {
          const professionTotalBattles = stats.wins + stats.losses;

          return {
            prof,
            wins: stats.wins,
            losses: stats.losses,
            totalBattles: professionTotalBattles,
            winRate:
              professionTotalBattles > 0
                ? this.domainService.roundMetric(
                    (stats.wins / professionTotalBattles) * 100,
                  )
                : 0,
          };
        })
        .sort((left, right) => right.totalBattles - left.totalBattles),
      phTrend,
      ratingTrend,
      highlights: Array.from(highlights.values())
        .filter((highlight) => highlight.value > 0)
        .sort((left, right) => right.value - left.value),
    };
  }

  getEmptyProfile(): CombatProfileDto {
    return {
      summary: {
        totalBattles: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPH: 0,
        totalRatingDelta: 0,
        avgTurns: 0,
        avgDuration: 0,
        damagePerTurn: 0,
        mitigationRate: 0,
        controlRate: 0,
      },
      damageMix: [],
      mitigationMix: [],
      spellUsage: [],
      matchupByProfession: [],
      phTrend: [],
      ratingTrend: [],
      highlights: [],
    };
  }

  private addDamageBreakdown(
    damageMix: Map<string, number>,
    userWarrior: InflatedBattleWithWarriors["warriors"][number],
  ): void {
    this.addBreakdownValue(damageMix, "melee", userWarrior.meleeDamage);
    this.addBreakdownValue(damageMix, "distance", userWarrior.distanceDamage);
    this.addBreakdownValue(damageMix, "auxiliary", userWarrior.auxiliaryDamage);
    this.addBreakdownValue(damageMix, "fire", userWarrior.fireDamage);
    this.addBreakdownValue(damageMix, "frost", userWarrior.frostDamage);
    this.addBreakdownValue(damageMix, "lightning", userWarrior.lightningDamage);
    this.addBreakdownValue(damageMix, "third", userWarrior.thirdAttDamage);
    this.addBreakdownValue(damageMix, "true", userWarrior.trueDamageDealt);
    this.addBreakdownValue(damageMix, "rage", userWarrior.rageDamageDealt);
    this.addBreakdownValue(damageMix, "stigma", userWarrior.stigmaDamageDealt);
  }

  private addSpellUsage(
    spellUsage: Map<
      string,
      { spell: string; skillId: number | null; casts: number }
    >,
    spellsUsedMapInput: unknown,
  ): void {
    const spellsUsedMap = spellsUsedMapInput as Record<string, number>;

    for (const [spell, casts] of Object.entries(spellsUsedMap)) {
      const skillId = Number.parseInt(spell, 10);
      const current = spellUsage.get(spell) ?? {
        spell,
        skillId: Number.isNaN(skillId) ? null : skillId,
        casts: 0,
      };
      current.casts += casts;
      spellUsage.set(spell, current);
    }
  }

  private addProfessionMatchups(
    matchupByProfession: Map<string, { wins: number; losses: number }>,
    battle: InflatedBattleWithWarriors,
    userTeam: number,
    isWin: boolean,
  ): void {
    const opponents = battle.warriors.filter(
      (warrior) => warrior.team !== userTeam,
    );

    for (const opponent of opponents) {
      const stats = matchupByProfession.get(opponent.prof) ?? {
        wins: 0,
        losses: 0,
      };

      if (isWin) {
        stats.wins++;
      } else {
        stats.losses++;
      }

      matchupByProfession.set(opponent.prof, stats);
    }
  }

  private addBreakdownValue(
    accumulator: Map<string, number>,
    key: string,
    value: number,
  ): void {
    if (value <= 0) {
      return;
    }

    accumulator.set(key, (accumulator.get(key) ?? 0) + value);
  }

  private getBreakdownEntries(
    accumulator: Map<string, number>,
  ): CombatProfileDto["damageMix"] {
    const total = Array.from(accumulator.values()).reduce(
      (sum, value) => sum + value,
      0,
    );

    return Array.from(accumulator.entries())
      .map(([key, value]) => ({
        key,
        label: key,
        value,
        share:
          total > 0 ? this.domainService.roundMetric((value / total) * 100) : 0,
      }))
      .sort((left, right) => right.value - left.value);
  }

  private setHighlight(
    highlights: Map<string, CombatProfileHighlight>,
    key: string,
    value: CombatProfileHighlight,
  ): void {
    const current = highlights.get(key);
    if (!current || value.value > current.value) {
      highlights.set(key, value);
    }
  }
}
