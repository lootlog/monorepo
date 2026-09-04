import type { CombatProfile } from "#src/battles/analytics/battle-statistics-response";
import { battleAnalyticsDomain as domain } from "#src/battles/analytics/battle-analytics-domain.service";
import type { InflatedBattleWithWarriors } from "#src/battles/analytics/battle-analytics.types";

type CombatProfileHighlight = CombatProfile["highlights"][number];

export const combatProfileCalculator = (() => {
  function calculate(
    battles: InflatedBattleWithWarriors[],
    characterIds: Set<string>,
  ): CombatProfile {
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

    const phTrend: CombatProfile["phTrend"] = [];
    const ratingTrend: CombatProfile["ratingTrend"] = [];

    for (const battle of battles) {
      const userWarrior = domain.findUserWarrior(battle, characterIds);

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

      addDamageBreakdown(damageMix, userWarrior);
      addBreakdownValue(mitigationMix, "blockedDamage", blockedDamage);
      addBreakdownValue(mitigationMix, "blocks", userWarrior.blocks);
      addBreakdownValue(mitigationMix, "evasions", userWarrior.evasions);
      addSpellUsage(spellUsage, userWarrior.spellsUsedMap);
      addProfessionMatchups(
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

      setHighlight(highlights, "biggestDamage", {
        battleId: battle.id,
        createdAt: battle.createdAt.toISOString(),
        type: "biggestDamage",
        label: "biggestDamage",
        value: damage,
      });
      setHighlight(highlights, "biggestMitigation", {
        battleId: battle.id,
        createdAt: battle.createdAt.toISOString(),
        type: "biggestMitigation",
        label: "biggestMitigation",
        value: blockedDamage,
      });

      if (isWin) {
        setHighlight(highlights, "biggestComeback", {
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
        winRate: domain.roundMetric(winRate),
        totalPH,
        totalRatingDelta,
        avgTurns: domain.roundMetric(avgTurns),
        avgDuration: Math.round(avgDuration),
        damagePerTurn: domain.roundMetric(damagePerTurn),
        mitigationRate: domain.roundMetric(mitigationRate),
        controlRate: domain.roundMetric(controlRate),
      },
      damageMix: getBreakdownEntries(damageMix),
      mitigationMix: getBreakdownEntries(mitigationMix),
      spellUsage: Array.from(spellUsage.values())
        .map((spell) => ({
          ...spell,
          share:
            totalSpellCasts > 0
              ? domain.roundMetric((spell.casts / totalSpellCasts) * 100)
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
                ? domain.roundMetric(
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

  function getEmptyProfile(): CombatProfile {
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

  function addDamageBreakdown(
    damageMix: Map<string, number>,
    userWarrior: InflatedBattleWithWarriors["warriors"][number],
  ): void {
    addBreakdownValue(damageMix, "melee", userWarrior.meleeDamage);
    addBreakdownValue(damageMix, "distance", userWarrior.distanceDamage);
    addBreakdownValue(damageMix, "auxiliary", userWarrior.auxiliaryDamage);
    addBreakdownValue(damageMix, "fire", userWarrior.fireDamage);
    addBreakdownValue(damageMix, "frost", userWarrior.frostDamage);
    addBreakdownValue(damageMix, "lightning", userWarrior.lightningDamage);
    addBreakdownValue(damageMix, "third", userWarrior.thirdAttDamage);
    addBreakdownValue(damageMix, "true", userWarrior.trueDamageDealt);
    addBreakdownValue(damageMix, "rage", userWarrior.rageDamageDealt);
    addBreakdownValue(damageMix, "stigma", userWarrior.stigmaDamageDealt);
  }

  function addSpellUsage(
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

  function addProfessionMatchups(
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

  function addBreakdownValue(
    accumulator: Map<string, number>,
    key: string,
    value: number,
  ): void {
    if (value <= 0) {
      return;
    }

    accumulator.set(key, (accumulator.get(key) ?? 0) + value);
  }

  function getBreakdownEntries(
    accumulator: Map<string, number>,
  ): CombatProfile["damageMix"] {
    const total = Array.from(accumulator.values()).reduce(
      (sum, value) => sum + value,
      0,
    );

    return Array.from(accumulator.entries())
      .map(([key, value]) => ({
        key,
        label: key,
        value,
        share: total > 0 ? domain.roundMetric((value / total) * 100) : 0,
      }))
      .sort((left, right) => right.value - left.value);
  }

  function setHighlight(
    highlights: Map<string, CombatProfileHighlight>,
    key: string,
    value: CombatProfileHighlight,
  ): void {
    const current = highlights.get(key);
    if (!current || value.value > current.value) {
      highlights.set(key, value);
    }
  }

  return { calculate, getEmptyProfile };
})();
