import { describe, expect, it } from "vitest";
import {
  buildBattleHpTimelineGroupTeams,
  getBattleHpTimelineGroupSeries,
  getDefaultBattleHpTimelineGroupSelection,
} from "./battle-hp-timeline-group-series";

const warrior = (originalId: string, team: number, damageDealt = 0) => ({
  originalId,
  name: `Warrior ${originalId}`,
  lvl: 100,
  prof: "w",
  team,
  damageDealt,
});

describe("battle HP timeline group series", () => {
  it("selects the player and the boss, averaging only the player's party", () => {
    const warriors = [
      warrior("1", 1, 500),
      warrior("2", 1, 900),
      warrior("3", 1, 100),
      warrior("-77", 2, 4000),
    ];

    expect(getDefaultBattleHpTimelineGroupSelection(warriors, "3")).toEqual({
      warriorIds: ["3", "-77"],
      averageTeams: [1],
    });
  });

  it("picks the hardest-hitting opponents when the opposing team is large", () => {
    const warriors = [
      warrior("10", 2, 10),
      warrior("1", 1),
      warrior("11", 2, 50),
      warrior("12", 2, 40),
      warrior("13", 2, 30),
      warrior("14", 2, 20),
    ];

    expect(getDefaultBattleHpTimelineGroupSelection(warriors, "1")).toEqual({
      warriorIds: ["1", "11", "12", "13"],
      averageTeams: [2],
    });
  });

  it("focuses on team 1's top damage dealer when the viewer did not fight", () => {
    const warriors = [
      warrior("1", 1, 100),
      warrior("2", 1, 300),
      warrior("3", 2, 50),
    ];

    expect(getDefaultBattleHpTimelineGroupSelection(warriors, null)).toEqual({
      warriorIds: ["2", "3"],
      averageTeams: [1],
    });
  });

  it("lists the player's team first with the player in the friendly team color", () => {
    const teams = buildBattleHpTimelineGroupTeams(
      [warrior("5", 1), warrior("6", 2), warrior("7", 2)],
      "7",
    );

    expect(teams.map((team) => team.team)).toEqual([2, 1]);
    expect(teams[0]?.members.map((member) => member.warriorId)).toEqual([
      "7",
      "6",
    ]);
    expect(teams[0]?.members[0]?.color).toBe(teams[0]?.color);
    expect(teams[1]?.color).not.toBe(teams[0]?.color);
  });

  it("keeps a warrior's color when other warriors are toggled", () => {
    const teams = buildBattleHpTimelineGroupTeams(
      [warrior("1", 1), warrior("2", 1), warrior("3", 1), warrior("4", 2)],
      "1",
    );

    const colorOf = (warriorIds: string[], warriorId: string) =>
      getBattleHpTimelineGroupSeries(teams, {
        warriorIds,
        averageTeams: [],
      }).flatMap((series) =>
        series.kind === "warrior" && series.member.warriorId === warriorId
          ? [series.color]
          : [],
      )[0];

    expect(colorOf(["3"], "3")).toBe(colorOf(["1", "2", "3"], "3"));
  });

  it("builds series for selected averages and warriors only", () => {
    const teams = buildBattleHpTimelineGroupTeams(
      [warrior("1", 1), warrior("2", 1), warrior("3", 2)],
      "1",
    );

    expect(
      getBattleHpTimelineGroupSeries(teams, {
        warriorIds: ["2", "3"],
        averageTeams: [1],
      }).map((series) => series.key),
    ).toEqual(["team1", "warrior2", "warrior3"]);
  });
});
