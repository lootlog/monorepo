import {
  BATTLE_HP_TIMELINE_COLORS,
  getBattleHpTimelinePlayerTeam,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-colors";

type BattleHpTimelineGroupWarrior = {
  originalId: string;
  name: string;
  lvl: number;
  prof: string;
  team: number;
  damageDealt: number;
};

export type BattleHpTimelineGroupSelection = {
  warriorIds: string[];
  averageTeams: number[];
};

type BattleHpTimelineGroupMember = {
  warriorId: string;
  name: string;
  lvl: number;
  prof: string;
  color: string;
  isPlayer: boolean;
};

export type BattleHpTimelineGroupTeam = {
  team: number;
  isFocusTeam: boolean;
  color: string;
  members: BattleHpTimelineGroupMember[];
};

export type BattleHpTimelineGroupSeries =
  | {
      kind: "average";
      key: string;
      team: number;
      isFocusTeam: boolean;
      color: string;
    }
  | {
      kind: "warrior";
      key: string;
      team: number;
      color: string;
      member: BattleHpTimelineGroupMember;
    };

const MAX_DEFAULT_OPPONENTS = 3;

const FRIENDLY_SERIES_COLORS = [
  BATTLE_HP_TIMELINE_COLORS.friendly,
  "#2dd4bf",
  "#38bdf8",
  "#a3e635",
  "#818cf8",
  "#22d3ee",
];

const ENEMY_SERIES_COLORS = [
  BATTLE_HP_TIMELINE_COLORS.enemy,
  "#fb923c",
  "#f472b6",
  "#facc15",
  "#c084fc",
  "#fb7185",
];

export const isBattleHpTimelineGroupBattle = (warriors: unknown[]) =>
  warriors.length > 2;

const getFocusTeam = (
  warriors: BattleHpTimelineGroupWarrior[],
  characterId: string | null,
) => getBattleHpTimelinePlayerTeam(warriors, characterId) ?? 1;

const byDamageDealt = (
  left: BattleHpTimelineGroupWarrior,
  right: BattleHpTimelineGroupWarrior,
) => right.damageDealt - left.damageDealt;

export const getDefaultBattleHpTimelineGroupSelection = (
  warriors: BattleHpTimelineGroupWarrior[],
  characterId: string | null,
): BattleHpTimelineGroupSelection => {
  const focusTeam = getFocusTeam(warriors, characterId);
  const rankedWarriors = [...warriors].sort(byDamageDealt);

  const focusWarrior =
    warriors.find((warrior) => warrior.originalId === characterId) ??
    rankedWarriors.find((warrior) => warrior.team === focusTeam);

  const opponents = rankedWarriors
    .filter((warrior) => warrior.team !== focusTeam)
    .slice(0, MAX_DEFAULT_OPPONENTS);

  const warriorIds = [
    ...(focusWarrior ? [focusWarrior.originalId] : []),
    ...opponents.map((warrior) => warrior.originalId),
  ];

  const selectedIds = new Set(warriorIds);

  const averageTeams = [
    ...new Set(
      warriors.flatMap((warrior) =>
        selectedIds.has(warrior.originalId) ? [] : [warrior.team],
      ),
    ),
  ].sort((left, right) => left - right);

  return { warriorIds, averageTeams };
};

export const buildBattleHpTimelineGroupTeams = (
  warriors: BattleHpTimelineGroupWarrior[],
  characterId: string | null,
): BattleHpTimelineGroupTeam[] => {
  const focusTeam = getFocusTeam(warriors, characterId);

  const teams = [...new Set(warriors.map((warrior) => warrior.team))].sort(
    (left, right) =>
      Number(right === focusTeam) - Number(left === focusTeam) || left - right,
  );

  return teams.map((team) => {
    const isFocusTeam = team === focusTeam;
    const palette = isFocusTeam ? FRIENDLY_SERIES_COLORS : ENEMY_SERIES_COLORS;

    const teamColor = isFocusTeam
      ? BATTLE_HP_TIMELINE_COLORS.friendly
      : BATTLE_HP_TIMELINE_COLORS.enemy;

    const members = warriors
      .filter((warrior) => warrior.team === team)
      .sort(
        (left, right) =>
          Number(right.originalId === characterId) -
          Number(left.originalId === characterId),
      )
      .map((warrior, index) => ({
        warriorId: warrior.originalId,
        name: warrior.name,
        lvl: warrior.lvl,
        prof: warrior.prof,
        color: palette[index % palette.length] ?? teamColor,
        isPlayer: warrior.originalId === characterId,
      }));

    return {
      team,
      isFocusTeam,
      color: teamColor,
      members,
    };
  });
};

export const getBattleHpTimelineGroupSeries = (
  teams: BattleHpTimelineGroupTeam[],
  selection: BattleHpTimelineGroupSelection,
): BattleHpTimelineGroupSeries[] => {
  const selectedIds = new Set(selection.warriorIds);

  return teams.flatMap((team) => [
    ...(selection.averageTeams.includes(team.team)
      ? [
          {
            kind: "average" as const,
            key: `team${team.team}`,
            team: team.team,
            isFocusTeam: team.isFocusTeam,
            color: team.color,
          },
        ]
      : []),
    ...team.members
      .filter((member) => selectedIds.has(member.warriorId))
      .map((member) => ({
        kind: "warrior" as const,
        key: `warrior${member.warriorId}`,
        team: team.team,
        color: member.color,
        member,
      })),
  ]);
};
