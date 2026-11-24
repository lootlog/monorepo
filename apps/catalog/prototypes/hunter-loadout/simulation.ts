import { sortBy } from "es-toolkit";
import type { Profession } from "../../../wiki/src/lib/equipment-set.ts";
import type { SkillRanks } from "../../../wiki/src/lib/skills/skill-tree.ts";
import { TREES, sum, type Fighter, type Model } from "./combat-model.js";
import { activeSkill } from "../../../wiki/src/lib/fight/fighter-profile.ts";
import { isSimulatedActive } from "../../../wiki/src/lib/fight/fight-skills.ts";
import {
  simulateFights,
  type FightSummary,
} from "../../../wiki/src/lib/fight/fight-summary.ts";
import {
  PROFESSION_NAMES,
  PROFESSIONS,
  SLOTS,
  type Build,
  type Item,
  type Slot,
} from "./items.js";
import { optimizeSkills } from "./optimizer.js";

export type SimulationBudget = { runs: number; seed: number };

export const SIMULATION: SimulationBudget = { runs: 400, seed: 20_261_124 };

const SEARCH_SIMULATION: SimulationBudget = { runs: 160, seed: 1124 };

const TEAM_FIGHT_SHARE = 0.25;

const SIMULATION_EPSILON = 0.004;

const ACTIVE_ROUNDS = 4;

const GEAR_ALTERNATIVES_SIMULATED = 3;

const HP_MARGIN_WEIGHT = 0.25;

const teamHpLeft = (summary: FightSummary, team: number) => {
  const members = summary.fighters.filter((fighter) => fighter.team === team);

  return (
    sum(members.map((fighter) => fighter.averageHpLeft)) /
    Math.max(1, members.length)
  );
};

const fightScore = (summary: FightSummary) =>
  (summary.winRate[0] ?? 0) +
  summary.drawRate / 2 +
  HP_MARGIN_WEIGHT * (teamHpLeft(summary, 0) - teamHpLeft(summary, 1));

export type Simulation = {
  duels: { profession: Profession; summary: FightSummary; score: number }[];
  team: FightSummary | null;
  score: number;
};

export type SimulationContext = {
  model: Model;
  level: number;
  group: boolean;
  opponents: readonly { profession: Profession; fighter: Fighter }[];
  references: Record<Profession, Build>;
  candidates: Partial<Record<Slot, Item[]>>;
};

export const createSimulator = ({
  model,
  level,
  group,
  opponents,
  references,
  candidates,
}: SimulationContext) => {
  const referenceCombatant = (profession: Profession) =>
    model.combatant(
      model.fighter(references[profession]),
      PROFESSION_NAMES[profession],
    );

  const simulate = (
    build: Build,
    budget: SimulationBudget = SIMULATION,
  ): Simulation => {
    const me = model.combatant(model.fighter(build), "Ty");

    const duels = opponents.map(({ profession, fighter }) => {
      const summary = simulateFights(
        {
          teams: [
            [me],
            [model.combatant(fighter, PROFESSION_NAMES[profession])],
          ],
        },
        budget,
      );

      return { profession, summary, score: fightScore(summary) };
    });

    const duelScore = sum(duels.map(({ score }) => score)) / duels.length;

    if (!group) return { duels, team: null, score: duelScore };

    const allies = PROFESSIONS.flatMap((profession) =>
      profession === "h" ? [] : [referenceCombatant(profession)],
    );

    const team = simulateFights(
      { teams: [[me, ...allies], PROFESSIONS.map(referenceCombatant)] },
      { runs: Math.ceil(budget.runs * TEAM_FIGHT_SHARE), seed: budget.seed },
    );

    return { duels, team, score: (duelScore + fightScore(team)) / 2 };
  };

  const simulatedActives = TREES.h.filter(
    (skill) =>
      skill.active &&
      isSimulatedActive(activeSkill(skill, skill.maxRank, level)),
  );

  const learnedActives = (build: Build): SkillRanks =>
    Object.fromEntries(
      simulatedActives.flatMap((skill) => {
        const rank = build.ranks[skill.id] ?? 0;

        return rank > 0 ? [[skill.id, rank]] : [];
      }),
    );

  const refineActives = (
    start: Build,
    analyticScore: (build: Build) => number,
  ) => {
    let build = start;
    let simulation = simulate(build, SEARCH_SIMULATION);
    let forced = learnedActives(start);

    for (let round = 0; round < ACTIVE_ROUNDS; round += 1) {
      let best: {
        build: Build;
        simulation: Simulation;
        forced: SkillRanks;
      } | null = null;

      for (const skill of simulatedActives) {
        const current = forced[skill.id] ?? 0;

        for (const rank of new Set([
          Math.ceil(skill.maxRank / 2),
          skill.maxRank,
        ])) {
          if (rank <= current) continue;

          const nextForced = { ...forced, [skill.id]: rank };

          const ranks = optimizeSkills(
            model,
            build,
            analyticScore,
            level,
            nextForced,
          );

          if ((ranks[skill.id] ?? 0) < rank) continue;

          const candidate = { ...build, ranks };
          const candidateSimulation = simulate(candidate, SEARCH_SIMULATION);
          const bar = best?.simulation.score ?? simulation.score;

          if (candidateSimulation.score > bar + SIMULATION_EPSILON) {
            best = {
              build: candidate,
              simulation: candidateSimulation,
              forced: nextForced,
            };
          }
        }
      }

      if (best === null) break;

      build = best.build;
      simulation = best.simulation;
      forced = best.forced;
    }

    return { build, simulation, forced };
  };

  const refineGear = (
    start: { build: Build; simulation: Simulation; forced: SkillRanks },
    analyticScore: (build: Build) => number,
  ) => {
    let { build, simulation } = start;

    for (const slot of SLOTS) {
      const options = sortBy(
        (candidates[slot] ?? []).filter((item) => item !== build.gear[slot]),
        [
          (item) =>
            -analyticScore({ ...build, gear: { ...build.gear, [slot]: item } }),
        ],
      ).slice(0, GEAR_ALTERNATIVES_SIMULATED);

      for (const item of options) {
        const gear = { ...build.gear, [slot]: item };

        const ranks = optimizeSkills(
          model,
          { ...build, gear },
          analyticScore,
          level,
          start.forced,
        );

        const candidate = { ...build, gear, ranks };
        const candidateSimulation = simulate(candidate, SEARCH_SIMULATION);

        if (candidateSimulation.score > simulation.score + SIMULATION_EPSILON) {
          build = candidate;
          simulation = candidateSimulation;
        }
      }
    }

    return build;
  };

  const refine = (
    analytic: Build,
    analyticScore: (build: Build) => number,
    withGear: boolean,
  ) => {
    const refined = refineActives(analytic, analyticScore);
    const build = withGear ? refineGear(refined, analyticScore) : refined.build;

    return { build, simulation: simulate(build) };
  };

  return {
    simulate,
    refine,
    isSimulated: (skillId: number) =>
      simulatedActives.some((skill) => skill.id === skillId),
  };
};
