import { sortBy } from "es-toolkit";
import {
  skillRankStats,
  spentSkillPoints,
  tierPointsRequired,
  type SkillDefinition,
  type SkillRanks,
} from "../../../wiki/src/lib/skills/skill-tree.ts";
import { TREES, type Model } from "./combat-model.js";
import {
  SLOTS,
  damageTags,
  recordOf,
  type Build,
  type Gear,
  type Item,
  type Slot,
} from "./items.js";

const MODELLED_SKILL_KEYS = new Set([
  "hp",
  "hpbon",
  "ac",
  "ac2_per",
  "act",
  "sa1",
  "sa-clothes",
  "dmgmulabsolute",
  "agi",
  "str1h",
  "str2h",
  "of-str",
  "firebon",
  "frostbon",
  "lightbon",
  "crit",
  "critval",
  "fastarrow",
  "evade_per",
  "decevade_per",
  "blok_per",
  "absorb_per",
  "absorbm_per",
  "heal1_per",
  "critslow_per",
  "pierce",
  "pierceb",
  "resfire",
  "resfrost",
  "reslight",
  "dmg_from_player_per",
  "redslow",
  "woundred",
  "woundchance",
  "wounddmgbon_perw",
  "slow",
]);

export const isModelledSkill = (skill: SkillDefinition) =>
  !skill.active &&
  [...skillRankStats(skill, skill.maxRank).keys()].some((key) =>
    MODELLED_SKILL_KEYS.has(key),
  );

const validRanks = (
  tree: readonly SkillDefinition[],
  ranks: SkillRanks,
  level: number,
  points: number,
) =>
  spentSkillPoints(tree, ranks) <= points &&
  tree.every((skill) => {
    const rank = ranks[skill.id] ?? 0;

    return (
      rank === 0 ||
      (rank <= skill.maxRank &&
        skill.level <= Math.min(level, 300) &&
        spentSkillPoints(tree, ranks, skill.level) >=
          tierPointsRequired(skill.level))
    );
  });

export const optimizeSkills = (
  model: Model,
  build: Build,
  score: (build: Build) => number,
  level: number,
  forced: SkillRanks = {},
): SkillRanks => {
  const tree = TREES[build.profession];
  const modelled = tree.filter(isModelledSkill);
  const points = model.skillPoints;
  const ranks: Record<number, number> = {};

  const evaluate = (candidate: SkillRanks) =>
    score({ ...build, ranks: candidate });

  const rankOf = (skill: SkillDefinition) => ranks[skill.id] ?? 0;

  const canAdd = (skill: SkillDefinition) =>
    rankOf(skill) < skill.maxRank &&
    validRanks(
      tree,
      { ...ranks, [skill.id]: rankOf(skill) + 1 },
      level,
      points,
    );

  while (spentSkillPoints(tree, ranks) < points) {
    const forcedSkill = tree.find(
      (skill) => rankOf(skill) < (forced[skill.id] ?? 0) && canAdd(skill),
    );

    if (forcedSkill) {
      ranks[forcedSkill.id] = rankOf(forcedSkill) + 1;
      continue;
    }

    const current = evaluate(ranks);
    let best: SkillDefinition | undefined;
    let bestGain = 1e-9;

    for (const skill of modelled) {
      if (!canAdd(skill)) continue;

      const gain =
        evaluate({ ...ranks, [skill.id]: rankOf(skill) + 1 }) - current;

      if (gain > bestGain) {
        best = skill;
        bestGain = gain;
      }
    }

    best ??= sortBy(tree.filter(canAdd), [
      (skill) => skill.level,
      (skill) => (isModelledSkill(skill) ? 0 : 1),
    ])[0];

    if (!best) break;

    ranks[best.id] = rankOf(best) + 1;
  }

  for (let pass = 0; pass < 3; pass += 1) {
    let improved = false;
    let current = evaluate(ranks);

    for (const from of tree) {
      if (rankOf(from) <= (forced[from.id] ?? 0)) continue;

      for (const to of modelled) {
        if (to.id === from.id || rankOf(to) >= to.maxRank || rankOf(from) === 0)
          continue;

        const next = {
          ...ranks,
          [from.id]: rankOf(from) - 1,
          [to.id]: rankOf(to) + 1,
        };

        if (!validRanks(tree, next, level, points)) continue;

        const value = evaluate(next);

        if (value > current + 1e-9) {
          Object.assign(ranks, next);
          current = value;
          improved = true;
        }
      }
    }

    if (!improved) break;
  }

  return Object.fromEntries(
    Object.entries(ranks).filter(([, rank]) => rank > 0),
  );
};

const dominates = (left: Item, right: Item) => {
  if (damageTags(left) !== damageTags(right)) return false;

  let strictly = false;

  for (const key of new Set([
    ...Object.keys(left.stats),
    ...Object.keys(right.stats),
  ])) {
    if (key === "lvl") continue;
    const a = left.stats[key] ?? 0;
    const b = right.stats[key] ?? 0;

    if (a < b) return false;

    if (a > b) strictly = true;
  }

  return strictly;
};

export const pruneDominated = (items: Item[]) =>
  items.filter(
    (item) => !items.some((other) => other !== item && dominates(other, item)),
  );

const optimizeGear = (
  build: Build,
  candidates: Partial<Record<Slot, Item[]>>,
  score: (build: Build) => number,
  starts: Gear[],
): Gear => {
  const evaluate = (gear: Gear) => score({ ...build, gear });

  const descend = (start: Gear) => {
    const gear = { ...start };

    for (let pass = 0; pass < 10; pass += 1) {
      let changed = false;

      for (const slot of SLOTS) {
        let bestScore = evaluate(gear);

        for (const item of candidates[slot] ?? []) {
          const value = evaluate({ ...gear, [slot]: item });

          if (value > bestScore + 1e-9) {
            gear[slot] = item;
            bestScore = value;
            changed = true;
          }
        }
      }

      if (!changed) break;
    }

    return gear;
  };

  const pairwise = (start: Gear) => {
    const gear = { ...start };

    const top = recordOf(SLOTS, (slot) =>
      sortBy(candidates[slot] ?? [], [
        (item) => -evaluate({ ...gear, [slot]: item }),
      ]).slice(0, 8),
    );

    let bestScore = evaluate(gear);

    for (const [index, first] of SLOTS.entries()) {
      for (const second of SLOTS.slice(index + 1)) {
        for (const a of top[first]) {
          for (const b of top[second]) {
            const value = evaluate({ ...gear, [first]: a, [second]: b });

            if (value > bestScore + 1e-9) {
              gear[first] = a;
              gear[second] = b;
              bestScore = value;
            }
          }
        }
      }
    }

    return gear;
  };

  return starts
    .map((start) => descend(pairwise(descend(start))))
    .reduce((best, gear) => (evaluate(gear) > evaluate(best) ? gear : best));
};

export const optimizeBuild = (
  model: Model,
  start: Build,
  candidates: Partial<Record<Slot, Item[]>>,
  score: (build: Build) => number,
  level: number,
  forced: SkillRanks,
) => {
  let build: Build = {
    ...start,
    ranks: optimizeSkills(model, start, score, level, forced),
  };

  const individuallyBest = recordOf(
    SLOTS,
    (slot) =>
      sortBy(candidates[slot] ?? [], [
        (item) => -score({ ...build, gear: { ...build.gear, [slot]: item } }),
      ])[0],
  );

  let starts: Gear[] = [build.gear, individuallyBest];

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const gear = optimizeGear(build, candidates, score, starts);

    const ranks = optimizeSkills(
      model,
      { ...build, gear },
      score,
      level,
      forced,
    );

    const unchanged =
      SLOTS.every((slot) => gear[slot] === build.gear[slot]) &&
      JSON.stringify(ranks) === JSON.stringify(build.ranks);

    build = { profession: build.profession, gear, ranks };
    starts = [gear];

    if (unchanged) break;
  }

  return build;
};
