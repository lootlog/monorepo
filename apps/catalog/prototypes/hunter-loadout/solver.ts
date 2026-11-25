import { sortBy } from "es-toolkit";
import type { Profession } from "../../../wiki/src/lib/equipment-set.ts";
import {
  TREES,
  average,
  createModel,
  sum,
  type Model,
} from "./combat-model.js";
import {
  PROFESSIONS,
  RARITIES,
  SLOTS,
  SOURCE_GROUP_KEYS,
  damageTags,
  matchesFilters,
  recordOf,
  slotType,
  toItem,
  type Build,
  type CatalogDocument,
  type Gear,
  type Item,
  type ItemFilters,
  type Slot,
} from "./items.js";
import {
  isModelledSkill,
  optimizeBuild,
  optimizeSkills,
  pruneDominated,
} from "./optimizer.js";
import { createSimulator } from "./simulation.js";

const MODES = ["group", "duel"] as const;

type Mode = (typeof MODES)[number];

export type SolveOptions = {
  mode: Mode;
  opponent: Profession;
  level: number;
  minItemLevel: number;
  alternatives: number;
  filters: ItemFilters;
};

export const DEFAULT_OPTIONS: SolveOptions = {
  mode: "group",
  opponent: "h",
  level: 271,
  minItemLevel: 200,
  alternatives: 3,
  filters: {
    sources: SOURCE_GROUP_KEYS,
    rarities: RARITIES,
    includeEvents: true,
  },
};

const BUILD_PATHS = {
  free: { label: "Najlepszy według modelu", emphasis: null },
  speed: { label: "Szybkość (SA)", emphasis: "speed" },
  crit: { label: "Krytyk (zręczność + SKF)", emphasis: "hit" },
} as const satisfies Record<
  string,
  { label: string; emphasis: "speed" | "hit" | null }
>;

const EMPHASIS_WEIGHT = 3;

type BuildPath = keyof typeof BUILD_PATHS;

const typicalBonuses = (level: number) => {
  const levelPower = 0.02 * level ** 2 + 2.6 * level;
  const plain = (value: number) => `+${value}`;
  const percent = (value: number) => `+${value}%`;
  const hundredths = (value: number) => `+${(value / 100).toFixed(2)}`;

  return [
    {
      key: "sa",
      label: "Szybkość ataku",
      amount: Math.round(8 + 0.25 * level),
      display: hundredths,
    },
    {
      key: "dz",
      label: "Zręczność",
      amount: Math.round((5 * level) / 9 + 4),
      display: plain,
    },
    {
      key: "da",
      label: "Wszystkie cechy",
      amount: Math.round(0.25 * level + 8),
      display: plain,
    },
    { key: "crit", label: "Cios krytyczny", amount: 1, display: percent },
    {
      key: "critval",
      label: "Siła krytyka fizycznego",
      amount: 6,
      display: percent,
    },
    { key: "pierce", label: "Przebicie pancerza", amount: 5, display: percent },
    {
      key: "lowevade",
      label: "Obniżenie uniku",
      amount: Math.round(level / 10),
      display: plain,
    },
    {
      key: "acdmg",
      label: "Niszczenie pancerza",
      amount: Math.round(1 + (0.75 * levelPower) / 50),
      display: plain,
    },
    {
      key: "slow",
      label: "Obniżenie SA przeciwnika",
      amount: Math.round(8 + (2 * level) / 7),
      display: hundredths,
    },
    {
      key: "hp",
      label: "Życie",
      amount: Math.round(3.08 * Math.round(8 + level + 0.2 * levelPower)),
      display: plain,
    },
    {
      key: "evade",
      label: "Unik",
      amount: Math.round(level / 10),
      display: plain,
    },
    {
      key: "ac",
      label: "Pancerz",
      amount: Math.round(0.15 * levelPower),
      display: plain,
    },
    {
      key: "adest",
      label: "Obniżenie leczenia przeciwnika",
      amount: Math.round(level),
      display: plain,
    },
    {
      key: "heal",
      label: "Leczenie",
      amount: Math.round(8 + 0.8 * level + 0.2 * levelPower),
      display: plain,
    },
    {
      key: "lowcrit",
      label: "Obniżenie krytyka przeciwnika",
      amount: 2,
      display: percent,
    },
    { key: "act", label: "Odporność na truciznę", amount: 5, display: percent },
    {
      key: "resfire",
      label: "Odporność na ogień",
      amount: 5,
      display: percent,
    },
    {
      key: "reslight",
      label: "Odporność na błyskawice",
      amount: 5,
      display: percent,
    },
  ];
};

type Prepared = {
  model: Model;
  items: Item[];
  candidatesFor: (profession: Profession) => Partial<Record<Slot, Item[]>>;
  duelScore: (opponent: Build) => (build: Build) => number;
  typicalHunter: Build;
  references: Record<Profession, Build>;
  horizon: Record<Profession, number>;
};

const preparedByLevel = new Map<string, Prepared>();

const prepare = (
  documents: ReadonlyArray<CatalogDocument>,
  level: number,
  minItemLevel: number,
): Prepared => {
  const cacheKey = `${level}|${minItemLevel}`;
  const cached = preparedByLevel.get(cacheKey);

  if (cached) return cached;

  const model = createModel(level);

  const items = documents.flatMap((document) =>
    document.elasticLevel === true ||
    (document.lvl >= minItemLevel && document.lvl <= level)
      ? [toItem(document, level)]
      : [],
  );

  const baselineGear = (profession: Profession): Gear =>
    recordOf(SLOTS, (slot) => {
      const heroic = sortBy(
        items.filter(
          (item) =>
            item.type === slotType(profession, slot) &&
            item.professions.includes(profession) &&
            item.rarity === "heroic" &&
            !item.elastic,
        ),
        [(item) => -item.lvl, (item) => item.uid],
      );

      return heroic[Math.floor(heroic.length / 4)];
    });

  const duelScore = (opponent: Build) => (build: Build) => {
    const me = model.fighter(build);
    const them = model.fighter(opponent);

    return Math.log(
      model.duelSide(them, me, false).timeToKill /
        model.duelSide(me, them, false).timeToKill,
    );
  };

  let hunter: Build = { profession: "h", gear: baselineGear("h"), ranks: {} };
  hunter = {
    ...hunter,
    ranks: optimizeSkills(model, hunter, duelScore(hunter), level),
  };
  hunter = {
    ...hunter,
    ranks: optimizeSkills(model, hunter, duelScore(hunter), level),
  };

  const candidatesByProfession = new Map<
    Profession,
    Partial<Record<Slot, Item[]>>
  >();

  const candidatesFor = (profession: Profession) => {
    const known = candidatesByProfession.get(profession);

    if (known) return known;

    const candidates = recordOf(SLOTS, (slot) =>
      pruneDominated(
        items.filter(
          (item) =>
            item.type === slotType(profession, slot) &&
            item.professions.includes(profession),
        ),
      ),
    );

    candidatesByProfession.set(profession, candidates);

    return candidates;
  };

  const references = recordOf(PROFESSIONS, (profession) => {
    const start: Build = {
      profession,
      gear: baselineGear(profession),
      ranks: {},
    };

    return optimizeBuild(
      model,
      start,
      candidatesFor(profession),
      duelScore(hunter),
      level,
      {},
    );
  });

  const horizon = recordOf(
    PROFESSIONS,
    (profession) =>
      model.duelSide(
        model.fighter(references[profession]),
        model.fighter(references.h),
        true,
      ).timeToKill,
  );

  const prepared = {
    model,
    items,
    candidatesFor,
    duelScore,
    typicalHunter: hunter,
    references,
    horizon,
  };

  preparedByLevel.set(cacheKey, prepared);

  return prepared;
};

export const solveHunterLoadout = (
  documents: ReadonlyArray<CatalogDocument>,
  options: SolveOptions,
) => {
  const { level, mode } = options;
  const group = mode === "group";

  const {
    model,
    items,
    candidatesFor,
    duelScore,
    typicalHunter,
    references,
    horizon,
  } = prepare(documents, level, options.minItemLevel);

  const allowed = matchesFilters(options.filters);

  const physicalOnly = (item: Item) =>
    !["DISTANCE_WEAPON", "QUIVER"].includes(item.type) ||
    damageTags(item) === "";

  const candidates = recordOf(SLOTS, (slot) =>
    pruneDominated(
      items.filter(
        (item) =>
          item.type === slotType("h", slot) &&
          item.professions.includes("h") &&
          allowed(item) &&
          (!group || physicalOnly(item)),
      ),
    ),
  );

  let opponentBuilds: Build[] = group
    ? PROFESSIONS.map((profession) => references[profession])
    : [references[options.opponent]];

  let opponentFighters = opponentBuilds.map((build) => ({
    profession: build.profession,
    fighter: model.fighter(build),
  }));

  const evaluateDetailed = (build: Build, extraItems: readonly Item[] = []) => {
    const me = model.fighter(build, extraItems);

    const perOpponent = opponentFighters.map(
      ({ profession, fighter: them }) => {
        const mine = model.duelSide(me, them, group);
        const theirs = model.duelSide(them, me, group);

        return {
          profession,
          damagePerTime: mine.damagePerTime,
          myTimeToKill: mine.timeToKill,
          theirTimeToKill: theirs.timeToKill,
          speed: mine.speed,
          poisonShare: mine.hit.poisonShare,
          value: group
            ? Math.log(
                mine.damagePerTime *
                  Math.min(theirs.timeToKill, horizon[profession]),
              )
            : Math.log(theirs.timeToKill / mine.timeToKill),
        };
      },
    );

    const hitDamage =
      average(me.stats.physical) *
      (1 + (me.stats.critChance / 100) * (me.stats.critValue / 100 - 1));

    const speed =
      sum(perOpponent.map((entry) => entry.speed)) / perOpponent.length;

    return {
      me,
      perOpponent,
      speed,
      hitDamage,
      score: sum(perOpponent.map(({ value }) => value)) / perOpponent.length,
    };
  };

  const score = (build: Build) => evaluateDetailed(build).score;
  const reference = typicalHunter;

  const start: Build = {
    profession: "h",
    gear: recordOf(SLOTS, (slot) => {
      const referenceItem = reference.gear[slot];

      return referenceItem && candidates[slot]?.includes(referenceItem)
        ? reference.gear[slot]
        : candidates[slot]?.[0];
    }),
    ranks: {},
  };

  if (!group) {
    const opponentCandidates = candidatesFor(options.opponent);
    let me = optimizeBuild(model, start, candidates, score, level, {});
    let opponent = references[options.opponent];

    for (let round = 0; round < 2; round += 1) {
      opponent = optimizeBuild(
        model,
        opponent,
        opponentCandidates,
        duelScore(me),
        level,
        {},
      );

      opponentBuilds = [opponent];
      opponentFighters = [
        { profession: opponent.profession, fighter: model.fighter(opponent) },
      ];
      me = optimizeBuild(model, me, candidates, score, level, {});
    }

    start.gear = me.gear;
  }

  const paths: readonly BuildPath[] = group
    ? ["free", "speed", "crit"]
    : ["free"];

  const referenceResult = evaluateDetailed(reference);
  const bestScore = { value: Number.NaN };

  const simulator = createSimulator({
    model,
    level,
    group,
    opponents: opponentFighters,
    references,
    candidates,
  });

  const referenceSimulation = simulator.simulate(reference);

  const builds = paths.map((path) => {
    const emphasis = BUILD_PATHS[path].emphasis;

    const pathScore = (candidate: Build) => {
      const detailed = evaluateDetailed(candidate);

      return (
        detailed.score +
        (emphasis === "speed"
          ? EMPHASIS_WEIGHT * Math.log(detailed.speed)
          : 0) +
        (emphasis === "hit"
          ? EMPHASIS_WEIGHT * Math.log(detailed.hitDamage)
          : 0)
      );
    };

    const analytic = optimizeBuild(
      model,
      start,
      candidates,
      pathScore,
      level,
      {},
    );

    const { build, simulation } = simulator.refine(
      analytic,
      pathScore,
      path === "free",
    );

    const result = evaluateDetailed(build);

    if (path === "free") bestScore.value = result.score;

    const alternatives = recordOf(SLOTS, (slot) =>
      (candidates[slot] ?? [])
        .filter((item) => item !== build.gear[slot])
        .map((item) => ({
          item,
          loss:
            result.score -
            score({ ...build, gear: { ...build.gear, [slot]: item } }),
        }))
        .sort((a, b) => a.loss - b.loss)
        .slice(0, options.alternatives),
    );

    const statValues = sortBy(
      typicalBonuses(model.cappedLevel).map((bonus) => {
        const extra: Item = {
          uid: `bonus-${bonus.key}`,
          name: bonus.label,
          icon: "",
          type: "BONUS",
          lvl: level,
          rarity: "",
          elastic: false,
          legendaryBonus: null,
          event: false,
          sources: [],
          professions: [],
          stats: { [bonus.key]: bonus.amount },
          record: { [bonus.key]: String(bonus.amount) },
          stat: `${bonus.key}=${bonus.amount}`,
        };

        return {
          key: bonus.key,
          label: bonus.label,
          amount: bonus.display(bonus.amount),
          gain:
            Math.exp(evaluateDetailed(build, [extra]).score - result.score) - 1,
        };
      }),
      [(value) => -value.gain],
    );

    const skills = sortBy(
      TREES.h.filter((skill) => (build.ranks[skill.id] ?? 0) > 0),
      [(skill) => skill.level, (skill) => skill.id],
    ).map((skill) => ({
      id: skill.id,
      name: skill.name,
      level: skill.level,
      rank: build.ranks[skill.id] ?? 0,
      maxRank: skill.maxRank,
      active: skill.active,
      modelled: isModelledSkill(skill),
      simulated: simulator.isSimulated(skill.id),
      effects: skill.ranks[(build.ranks[skill.id] ?? 1) - 1] ?? "",
    }));

    return {
      path,
      label: BUILD_PATHS[path].label,
      build,
      result,
      advantage: Math.exp(result.score - referenceResult.score),
      costVersusBest: 1 - Math.exp(result.score - bestScore.value),
      alternatives,
      statValues,
      skills,
      skillPoints: model.skillPoints,
      simulation,
    };
  });

  return {
    options,
    candidateCount: sum(SLOTS.map((slot) => candidates[slot]?.length ?? 0)),
    candidatesPerSlot: recordOf(SLOTS, (slot) => candidates[slot]?.length ?? 0),
    reference,
    referenceResult,
    referenceSimulation,
    opponents: opponentBuilds.map((build) => ({
      build,
      fighter: model.fighter(build),
    })),
    builds,
  };
};
