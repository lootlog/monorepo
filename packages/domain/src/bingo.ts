import {
  BINGO_BOARD_SIZE,
  BingoBattleMetric,
  BingoBoardMode,
  BingoTileConditionKind,
  type BingoBattleCondition,
  type BingoHeroSightingCondition,
  type BingoKillCondition,
  type BingoLineId,
  type BingoLootCondition,
  type BingoTileCondition,
} from "@lootlog/schema/bingo";
import { ItemRarityEnum } from "@lootlog/schema/item-rarity";
import { NpcTypeEnum } from "@lootlog/schema/npc-type";
import { normalizeSearchText } from "./text-fold.js";

export type BingoGridCoord = {
  readonly row: number;
  readonly col: number;
};

export type BingoLineDefinition = {
  readonly id: BingoLineId;
  readonly coords: readonly BingoGridCoord[];
};

const ROW_LINE_IDS = ["row-0", "row-1", "row-2", "row-3", "row-4"] as const;

const COL_LINE_IDS = ["col-0", "col-1", "col-2", "col-3", "col-4"] as const;

export const BINGO_LINES: readonly BingoLineDefinition[] = [
  ...ROW_LINE_IDS.map((id, row) => ({
    id,
    coords: Array.from({ length: BINGO_BOARD_SIZE }, (_, col) => ({
      row,
      col,
    })),
  })),
  ...COL_LINE_IDS.map((id, col) => ({
    id,
    coords: Array.from({ length: BINGO_BOARD_SIZE }, (_, row) => ({
      row,
      col,
    })),
  })),
  {
    id: "diag-main",
    coords: Array.from({ length: BINGO_BOARD_SIZE }, (_, index) => ({
      row: index,
      col: index,
    })),
  },
  {
    id: "diag-anti",
    coords: Array.from({ length: BINGO_BOARD_SIZE }, (_, index) => ({
      row: index,
      col: BINGO_BOARD_SIZE - 1 - index,
    })),
  },
];

const coordKey = (row: number, col: number) => `${row}:${col}`;

export const computeCompletedBingoLines = (
  completedCoords: ReadonlyArray<BingoGridCoord>,
): BingoLineId[] => {
  const completedSet = new Set(
    completedCoords.map(({ row, col }) => coordKey(row, col)),
  );

  return BINGO_LINES.flatMap((line) =>
    line.coords.every(({ row, col }) => completedSet.has(coordKey(row, col)))
      ? [line.id]
      : [],
  );
};

const matchesPattern = (
  pattern: string | null | undefined,
  candidate: string,
): boolean => {
  if (!pattern || pattern.trim().length === 0) return true;

  return normalizeSearchText(candidate).includes(normalizeSearchText(pattern));
};

const hasNumber = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined;

const matchesLevelBounds = (
  level: number | null | undefined,
  minLvl: number | null | undefined,
  maxLvl: number | null | undefined,
): boolean => {
  if (hasNumber(minLvl) && (!hasNumber(level) || level < minLvl)) return false;

  if (hasNumber(maxLvl) && (!hasNumber(level) || level > maxLvl)) return false;

  return true;
};

export type BingoLootEvaluationInput = {
  readonly items: ReadonlyArray<{
    readonly hid: string;
    readonly name: string;
    readonly rarity: ItemRarityEnum | null;
  }>;
  readonly npcs: ReadonlyArray<{
    readonly name: string;
    readonly type: NpcTypeEnum | null;
    readonly lvl: number | null;
  }>;
};

export type BingoLootMatch = {
  readonly hid: string;
  readonly itemName: string;
  readonly rarity: ItemRarityEnum | null;
  readonly npcName: string | null;
};

export const findMatchingLootItems = (
  condition: BingoLootCondition,
  input: BingoLootEvaluationInput,
): BingoLootMatch[] => {
  const matchingNpc =
    input.npcs.find((npc) => {
      if (
        condition.npcTypes.length > 0 &&
        (npc.type === null || !condition.npcTypes.includes(npc.type))
      ) {
        return false;
      }

      if (!matchesPattern(condition.npcNamePattern, npc.name)) {
        return false;
      }

      return matchesLevelBounds(
        npc.lvl,
        condition.minNpcLvl,
        condition.maxNpcLvl,
      );
    }) ?? null;

  const requiresNpcMatch =
    condition.npcTypes.length > 0 ||
    Boolean(condition.npcNamePattern?.trim()) ||
    hasNumber(condition.minNpcLvl) ||
    hasNumber(condition.maxNpcLvl);

  if (requiresNpcMatch && matchingNpc === null) {
    return [];
  }

  const primaryNpcName = matchingNpc?.name ?? input.npcs[0]?.name ?? null;

  return input.items.flatMap((item) => {
    if (
      condition.rarities.length > 0 &&
      (item.rarity === null || !condition.rarities.includes(item.rarity))
    ) {
      return [];
    }

    if (!matchesPattern(condition.itemNamePattern, item.name)) {
      return [];
    }

    return [
      {
        hid: item.hid,
        itemName: item.name,
        rarity: item.rarity,
        npcName: primaryNpcName,
      },
    ];
  });
};

export type BingoKillEvaluationInput = {
  readonly npcName: string;
  readonly npcType: NpcTypeEnum;
  readonly npcLvl: number;
};

export const matchesKillCondition = (
  condition: BingoKillCondition,
  input: BingoKillEvaluationInput,
): boolean => {
  if (
    condition.npcTypes.length > 0 &&
    !condition.npcTypes.includes(input.npcType)
  ) {
    return false;
  }

  if (!matchesPattern(condition.npcNamePattern, input.npcName)) {
    return false;
  }

  return matchesLevelBounds(
    input.npcLvl,
    condition.minNpcLvl,
    condition.maxNpcLvl,
  );
};

export type BingoHeroSightingEvaluationInput = {
  readonly heroName: string;
  readonly heroLvl: number;
  readonly manual: boolean;
};

export const matchesHeroSightingCondition = (
  condition: BingoHeroSightingCondition,
  input: BingoHeroSightingEvaluationInput,
): boolean => {
  if (input.manual && !condition.includeManual) {
    return false;
  }

  if (!matchesPattern(condition.heroNamePattern, input.heroName)) {
    return false;
  }

  return matchesLevelBounds(
    input.heroLvl,
    condition.minHeroLvl,
    condition.maxHeroLvl,
  );
};

export type BingoBattleEvaluationInput = {
  readonly battleType: string;
  readonly matchmaking: boolean;
  readonly won: boolean;
  readonly unfinished: boolean;
  readonly hasFlee: boolean;
};

export type BingoBattleEvaluationResult =
  | { readonly matched: false }
  | {
      readonly matched: true;
      readonly nextCount: number;
      readonly delta: number;
      readonly resetStreak: boolean;
    };

export const evaluateBattleCondition = (
  condition: BingoBattleCondition,
  input: BingoBattleEvaluationInput,
  currentCount: number,
  alreadyCompleted: boolean,
): BingoBattleEvaluationResult => {
  if (alreadyCompleted) {
    return { matched: false };
  }

  if (input.unfinished) {
    return { matched: false };
  }

  if (condition.matchmakingOnly && !input.matchmaking) {
    return { matched: false };
  }

  if (
    condition.battleTypes.length > 0 &&
    !condition.battleTypes.includes(input.battleType)
  ) {
    return { matched: false };
  }

  if (condition.excludeFlee && input.hasFlee) {
    if (condition.metric === BingoBattleMetric.WIN_STREAK && currentCount > 0) {
      return {
        matched: true,
        nextCount: 0,
        delta: -currentCount,
        resetStreak: true,
      };
    }

    return { matched: false };
  }

  if (condition.metric === BingoBattleMetric.WINS) {
    if (!input.won) {
      return { matched: false };
    }

    const nextCount = Math.min(condition.targetCount, currentCount + 1);

    return {
      matched: true,
      nextCount,
      delta: nextCount - currentCount,
      resetStreak: false,
    };
  }

  if (input.won) {
    const nextCount = Math.min(condition.targetCount, currentCount + 1);

    return {
      matched: true,
      nextCount,
      delta: nextCount - currentCount,
      resetStreak: false,
    };
  }

  if (currentCount === 0) {
    return { matched: false };
  }

  return {
    matched: true,
    nextCount: 0,
    delta: -currentCount,
    resetStreak: true,
  };
};

export type BingoScoreConfig = {
  readonly mode: BingoBoardMode;
  readonly pointsPerTile: number;
  readonly pointsPerLine: number;
  readonly firstCompleterBonus: number;
  readonly blackoutBonus: number;
};

export type BingoScoreTile = {
  readonly id: string;
  readonly row: number;
  readonly col: number;
  readonly points: number | null;
  readonly lockedByMemberId: number | null;
};

export type BingoMemberScore = {
  readonly completedTileIds: string[];
  readonly completedLines: BingoLineId[];
  readonly tilePoints: number;
  readonly linePoints: number;
  readonly firstCompleterPoints: number;
  readonly blackoutPoints: number;
  readonly totalPoints: number;
  readonly isBlackout: boolean;
  readonly lastCompletedAt: string | null;
};

export const calculateMemberBingoScore = (
  config: BingoScoreConfig,
  tiles: ReadonlyArray<BingoScoreTile>,
  memberId: number,
  completedProgress: ReadonlyArray<{
    readonly tileId: string;
    readonly completedAt: Date | string | null;
  }>,
): BingoMemberScore => {
  const tileById = new Map(tiles.map((tile) => [tile.id, tile]));
  const completedCoords: BingoGridCoord[] = [];
  const completedTileIds: string[] = [];
  let tilePoints = 0;
  let firstCompleterPoints = 0;
  let latestMs: number | null = null;

  for (const progress of completedProgress) {
    if (!progress.completedAt) continue;

    const tile = tileById.get(progress.tileId);

    if (!tile) continue;

    if (
      config.mode === BingoBoardMode.LOCKOUT &&
      tile.lockedByMemberId !== null &&
      tile.lockedByMemberId !== memberId
    ) {
      continue;
    }

    completedTileIds.push(tile.id);
    completedCoords.push({ row: tile.row, col: tile.col });
    tilePoints += tile.points ?? config.pointsPerTile;

    if (
      config.mode === BingoBoardMode.RACE &&
      tile.lockedByMemberId === memberId &&
      config.firstCompleterBonus > 0
    ) {
      firstCompleterPoints += config.firstCompleterBonus;
    }

    const completedMs =
      progress.completedAt instanceof Date
        ? progress.completedAt.getTime()
        : Date.parse(progress.completedAt);

    if (
      Number.isFinite(completedMs) &&
      (latestMs === null || completedMs > latestMs)
    ) {
      latestMs = completedMs;
    }
  }

  const completedLines = computeCompletedBingoLines(completedCoords);
  const linePoints = completedLines.length * config.pointsPerLine;

  const isBlackout =
    tiles.length === BINGO_BOARD_SIZE * BINGO_BOARD_SIZE &&
    completedTileIds.length === tiles.length;

  const blackoutPoints = isBlackout ? config.blackoutBonus : 0;

  return {
    completedTileIds,
    completedLines,
    tilePoints,
    linePoints,
    firstCompleterPoints,
    blackoutPoints,
    totalPoints:
      tilePoints + linePoints + firstCompleterPoints + blackoutPoints,
    isBlackout,
    lastCompletedAt:
      latestMs === null ? null : new Date(latestMs).toISOString(),
  };
};

export type BingoTilePreset = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly condition: BingoTileCondition;
};

export const BINGO_TILE_PRESETS: readonly BingoTilePreset[] = [
  {
    id: "legendary-e2",
    title: "Legenda z E2",
    description: "Zdobądź legendarny przedmiot z dowolnej Elity II",
    condition: {
      kind: BingoTileConditionKind.LOOT,
      targetCount: 1,
      rarities: [ItemRarityEnum.LEGENDARY],
      npcTypes: [NpcTypeEnum.ELITE2],
    },
  },
  {
    id: "find-3-heroes",
    title: "Znajdź 3 herosów",
    description: "Wykryj 3 herosów automatycznie w kliencie gry",
    condition: {
      kind: BingoTileConditionKind.HERO_SIGHTING,
      targetCount: 3,
      includeManual: false,
    },
  },
  {
    id: "abyss-5-streak",
    title: "5 wygranych z rzędu w Otchłani",
    description: "Wygraj 5 walk matchmakingowych z rzędu bez porażki",
    condition: {
      kind: BingoTileConditionKind.BATTLE,
      targetCount: 5,
      metric: BingoBattleMetric.WIN_STREAK,
      matchmakingOnly: true,
      battleTypes: [],
      excludeFlee: true,
    },
  },
  {
    id: "colossus-100-kills",
    title: "100 bić kolosa",
    description: "Weź udział w 100 zabójstwach dowolnego kolosa",
    condition: {
      kind: BingoTileConditionKind.KILL,
      targetCount: 100,
      npcTypes: [NpcTypeEnum.COLOSSUS],
    },
  },
  {
    id: "heroic-e2-5",
    title: "5 heroików z E2",
    description: "Zdobądź 5 heroicznych przedmiotów z Elity II",
    condition: {
      kind: BingoTileConditionKind.LOOT,
      targetCount: 5,
      rarities: [ItemRarityEnum.HEROIC],
      npcTypes: [NpcTypeEnum.ELITE2],
    },
  },
  {
    id: "legendary-hero",
    title: "Legenda z Herosa",
    description: "Zdobądź legendarny przedmiot z Herosa lub Herosa eventowego",
    condition: {
      kind: BingoTileConditionKind.LOOT,
      targetCount: 1,
      rarities: [ItemRarityEnum.LEGENDARY],
      npcTypes: [NpcTypeEnum.HERO, NpcTypeEnum.EVENT_HERO],
    },
  },
  {
    id: "heroic-titan",
    title: "Heroik z Tytana",
    description: "Zdobądź heroiczny lub legendarny przedmiot z Tytana",
    condition: {
      kind: BingoTileConditionKind.LOOT,
      targetCount: 1,
      rarities: [ItemRarityEnum.HEROIC, ItemRarityEnum.LEGENDARY],
      npcTypes: [NpcTypeEnum.TITAN],
    },
  },
  {
    id: "e2-50-kills",
    title: "50 bić E2",
    description: "Zabij 50 potworów typu Elita II",
    condition: {
      kind: BingoTileConditionKind.KILL,
      targetCount: 50,
      npcTypes: [NpcTypeEnum.ELITE2],
    },
  },
  {
    id: "hero-10-kills",
    title: "10 bić Herosa",
    description: "Weź udział w 10 zabójstwach Herosa",
    condition: {
      kind: BingoTileConditionKind.KILL,
      targetCount: 10,
      npcTypes: [NpcTypeEnum.HERO, NpcTypeEnum.EVENT_HERO],
    },
  },
  {
    id: "titan-10-kills",
    title: "10 bić Tytana",
    description: "Weź udział w 10 zabójstwach Tytana",
    condition: {
      kind: BingoTileConditionKind.KILL,
      targetCount: 10,
      npcTypes: [NpcTypeEnum.TITAN],
    },
  },
  {
    id: "abyss-10-wins",
    title: "10 wygranych w Otchłani",
    description: "Wygraj łącznie 10 walk matchmakingowych",
    condition: {
      kind: BingoTileConditionKind.BATTLE,
      targetCount: 10,
      metric: BingoBattleMetric.WINS,
      matchmakingOnly: true,
      battleTypes: [],
      excludeFlee: true,
    },
  },
  {
    id: "pvp-15-wins",
    title: "15 wygranych PvP",
    description: "Wygraj 15 dowolnych walk PvP zapisanych w battlelogu",
    condition: {
      kind: BingoTileConditionKind.BATTLE,
      targetCount: 15,
      metric: BingoBattleMetric.WINS,
      matchmakingOnly: false,
      battleTypes: [],
      excludeFlee: true,
    },
  },
  {
    id: "manual-challenge",
    title: "Zadanie specjalne",
    description: "Wyzwanie zaliczane ręcznie przez administrację",
    condition: {
      kind: BingoTileConditionKind.MANUAL,
      targetCount: 1,
    },
  },
];

export const buildStarterBingoTiles = (): Array<{
  readonly row: number;
  readonly col: number;
  readonly title: string;
  readonly description: string;
  readonly condition: BingoTileCondition;
}> => {
  const tiles: Array<{
    readonly row: number;
    readonly col: number;
    readonly title: string;
    readonly description: string;
    readonly condition: BingoTileCondition;
  }> = [];

  for (let row = 0; row < BINGO_BOARD_SIZE; row += 1) {
    for (let col = 0; col < BINGO_BOARD_SIZE; col += 1) {
      const index = row * BINGO_BOARD_SIZE + col;
      const preset = BINGO_TILE_PRESETS[index % BINGO_TILE_PRESETS.length];

      if (!preset) continue;

      tiles.push({
        row,
        col,
        title: preset.title,
        description: preset.description,
        condition: structuredClone(preset.condition),
      });
    }
  }

  return tiles;
};
