import { describe, expect, it } from "bun:test";
import {
  BingoBattleMetric,
  BingoBoardMode,
  BingoTileConditionKind,
} from "@lootlog/schema/bingo";
import { ItemRarityEnum } from "@lootlog/schema/item-rarity";
import { NpcTypeEnum } from "@lootlog/schema/npc-type";
import {
  BINGO_GRID_COORDS,
  BINGO_LINES,
  calculateMemberBingoScore,
  computeCompletedBingoLines,
  evaluateBattleCondition,
  findBingoCompletedLineCoordKeys,
  findMatchingLootItems,
  matchesHeroSightingCondition,
  matchesKillCondition,
} from "./bingo.js";

describe("clan bingo domain", () => {
  it("detects rows, columns, and both diagonals on a 5x5 grid", () => {
    expect(BINGO_LINES).toHaveLength(12);

    const completed = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 0, col: 4 },
      { row: 1, col: 1 },
      { row: 2, col: 2 },
      { row: 3, col: 3 },
      { row: 4, col: 4 },
    ];

    expect(computeCompletedBingoLines(completed)).toEqual([
      "row-0",
      "diag-main",
    ]);
  });

  it("matches legendary loot from any E2 and folds Polish diacritics on patterns", () => {
    const matches = findMatchingLootItems(
      {
        kind: BingoTileConditionKind.LOOT,
        targetCount: 1,
        rarities: [ItemRarityEnum.LEGENDARY],
        npcTypes: [NpcTypeEnum.ELITE2],
        npcNamePattern: "krolowa",
      },
      {
        items: [
          { hid: "h1", name: "Zwykły miecz", rarity: ItemRarityEnum.UNIQUE },
          {
            hid: "h2",
            name: "Ostrze Śniegu",
            rarity: ItemRarityEnum.LEGENDARY,
          },
        ],
        npcs: [{ name: "Królowa Śniegu", type: NpcTypeEnum.ELITE2, lvl: 164 }],
      },
    );

    expect(matches).toEqual([
      {
        hid: "h2",
        itemName: "Ostrze Śniegu",
        rarity: ItemRarityEnum.LEGENDARY,
        npcName: "Królowa Śniegu",
      },
    ]);
  });

  it("rejects manual hero sightings when includeManual is false", () => {
    expect(
      matchesHeroSightingCondition(
        {
          kind: BingoTileConditionKind.HERO_SIGHTING,
          targetCount: 3,
          includeManual: false,
        },
        { heroName: "Mroczny Patryk", heroLvl: 35, manual: true },
      ),
    ).toBe(false);

    expect(
      matchesHeroSightingCondition(
        {
          kind: BingoTileConditionKind.HERO_SIGHTING,
          targetCount: 3,
          heroNamePattern: "patryk",
          includeManual: false,
        },
        { heroName: "Mroczny Patryk", heroLvl: 35, manual: false },
      ),
    ).toBe(true);
  });

  it("matches kill condition with npc type and level bounds", () => {
    expect(
      matchesKillCondition(
        {
          kind: BingoTileConditionKind.KILL,
          targetCount: 100,
          npcTypes: [NpcTypeEnum.COLOSSUS],
          minNpcLvl: 100,
          maxNpcLvl: 200,
        },
        { npcName: "Mamlambo", npcType: NpcTypeEnum.COLOSSUS, npcLvl: 136 },
      ),
    ).toBe(true);

    expect(
      matchesKillCondition(
        {
          kind: BingoTileConditionKind.KILL,
          targetCount: 100,
          npcTypes: [NpcTypeEnum.COLOSSUS],
          minNpcLvl: 200,
        },
        { npcName: "Mamlambo", npcType: NpcTypeEnum.COLOSSUS, npcLvl: 136 },
      ),
    ).toBe(false);
  });

  it("resets win streak on defeat or flee and ignores battles once completed", () => {
    const condition = {
      kind: BingoTileConditionKind.BATTLE,
      targetCount: 5,
      metric: BingoBattleMetric.WIN_STREAK,
      matchmakingOnly: true,
      battleTypes: [],
      excludeFlee: true,
    };

    expect(
      evaluateBattleCondition(
        condition,
        {
          battleType: "1v1",
          matchmaking: true,
          won: true,
          unfinished: false,
          hasFlee: false,
        },
        3,
        false,
      ),
    ).toEqual({
      matched: true,
      nextCount: 4,
      delta: 1,
      resetStreak: false,
    });

    expect(
      evaluateBattleCondition(
        condition,
        {
          battleType: "1v1",
          matchmaking: true,
          won: false,
          unfinished: false,
          hasFlee: false,
        },
        4,
        false,
      ),
    ).toEqual({
      matched: true,
      nextCount: 0,
      delta: -4,
      resetStreak: true,
    });

    expect(
      evaluateBattleCondition(
        condition,
        {
          battleType: "1v1",
          matchmaking: true,
          won: false,
          unfinished: false,
          hasFlee: false,
        },
        5,
        true,
      ),
    ).toEqual({ matched: false });
  });

  it("scores RACE tiles, lines, first-completer bonus, and ignores opponent-locked tiles in LOCKOUT", () => {
    const lockedByIndex = new Map<number, number>([
      [0, 10],
      [1, 20],
    ]);

    const tiles = BINGO_GRID_COORDS.map((coord, index) => ({
      id: `t-${index}`,
      ...coord,
      points: index === 0 ? 3 : null,
      lockedByMemberId: lockedByIndex.get(index) ?? null,
    }));

    const completedRow0 = [0, 1, 2, 3, 4].map((index) => ({
      tileId: `t-${index}`,
      completedAt: new Date("2026-11-27T12:00:00.000Z"),
    }));

    const raceScore = calculateMemberBingoScore(
      {
        mode: BingoBoardMode.RACE,
        pointsPerTile: 1,
        pointsPerLine: 5,
        firstCompleterBonus: 2,
        blackoutBonus: 10,
      },
      tiles,
      10,
      completedRow0,
    );

    expect(raceScore.tilePoints).toBe(7);
    expect(raceScore.linePoints).toBe(5);
    expect(raceScore.firstCompleterPoints).toBe(2);
    expect(raceScore.totalPoints).toBe(14);
    expect(raceScore.completedLines).toEqual(["row-0"]);

    const lockoutScore = calculateMemberBingoScore(
      {
        mode: BingoBoardMode.LOCKOUT,
        pointsPerTile: 1,
        pointsPerLine: 5,
        firstCompleterBonus: 2,
        blackoutBonus: 10,
      },
      tiles,
      10,
      completedRow0,
    );

    expect(lockoutScore.completedTileIds).toEqual(["t-0", "t-2", "t-3", "t-4"]);
    expect(lockoutScore.completedLines).toEqual([]);
    expect(lockoutScore.firstCompleterPoints).toBe(0);
    expect(lockoutScore.totalPoints).toBe(6);
  });

  it("highlights a completed line only when none of its tiles is locked by another member in LOCKOUT", () => {
    const tiles = BINGO_GRID_COORDS.map((coord) => ({
      ...coord,
      lockedByMemberId: coord.row === 0 && coord.col === 1 ? 20 : null,
    }));

    const completedRow0 = (tile: { readonly row: number }) => tile.row === 0;

    expect(
      findBingoCompletedLineCoordKeys(
        BingoBoardMode.RACE,
        10,
        tiles,
        completedRow0,
      ),
    ).toEqual(new Set(["0:0", "0:1", "0:2", "0:3", "0:4"]));

    expect(
      findBingoCompletedLineCoordKeys(
        BingoBoardMode.LOCKOUT,
        10,
        tiles,
        completedRow0,
      ),
    ).toEqual(new Set());
  });
});
