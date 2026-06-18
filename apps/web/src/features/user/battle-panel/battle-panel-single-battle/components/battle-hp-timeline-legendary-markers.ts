export type LegendaryBonusIconKey =
  | "anguish"
  | "cleanse"
  | "critShield"
  | "curse"
  | "facade"
  | "glare"
  | "holyTouch"
  | "lastHeal"
  | "legendary"
  | "puncture"
  | "veryCrit";

export type LegendaryBonusMarkerDefinition = {
  type: LegendaryBonusIconKey;
  labelKey: string;
  color: string;
};

export type LegendaryBonusTimelineAction = {
  actionType: string;
  category: string;
  actorId: string | null;
  targetId: string | null;
  param: string;
};

export type LegendaryBonusTimelineTurn = {
  turn: number;
  teamHp: Record<string, number>;
  actions: LegendaryBonusTimelineAction[];
};

export type LegendaryBonusTimelineWarrior = {
  originalId: string;
  name?: string;
  team: number;
};

export type LegendaryBonusMarker = LegendaryBonusMarkerDefinition & {
  actionType: string;
  actorId: string | null;
  targetId: string | null;
  param: string;
  recipientName: string | null;
};

export type LegendaryBonusMarkerGroup = {
  key: string;
  turn: number;
  team: number;
  y: number;
  bonuses: LegendaryBonusMarker[];
};

export const LEGENDARY_BONUS_MARKER_DEFINITIONS: Record<
  string,
  LegendaryBonusMarkerDefinition
> = {
  "+legbon_anguish": {
    type: "anguish",
    labelKey: "battlePanel.single.chart.legendary.anguish",
    color: "#dc2626",
  },
  "+legbon_curse": {
    type: "curse",
    labelKey: "battlePanel.single.chart.legendary.curse",
    color: "#facc15",
  },
  "+legbon_holytouch": {
    type: "holyTouch",
    labelKey: "battlePanel.single.chart.legendary.holyTouch",
    color: "#60a5fa",
  },
  "+legbon_puncture": {
    type: "puncture",
    labelKey: "battlePanel.single.chart.legendary.puncture",
    color: "#fca5a5",
  },
  "+legbon_verycrit": {
    type: "veryCrit",
    labelKey: "battlePanel.single.chart.legendary.veryCrit",
    color: "#ef4444",
  },
  "-legbon_cleanse": {
    type: "cleanse",
    labelKey: "battlePanel.single.chart.legendary.cleanse",
    color: "#38bdf8",
  },
  "-legbon_critred": {
    type: "critShield",
    labelKey: "battlePanel.single.chart.legendary.critShield",
    color: "#22d3ee",
  },
  "-legbon_facade": {
    type: "facade",
    labelKey: "battlePanel.single.chart.legendary.facade",
    color: "#7dd3fc",
  },
  "-legbon_glare": {
    type: "glare",
    labelKey: "battlePanel.single.chart.legendary.glare",
    color: "#fde047",
  },
  legbon_holytouch_heal: {
    type: "holyTouch",
    labelKey: "battlePanel.single.chart.legendary.holyTouch",
    color: "#60a5fa",
  },
  legbon_lastheal: {
    type: "lastHeal",
    labelKey: "battlePanel.single.chart.legendary.lastHeal",
    color: "#4ade80",
  },
};

const FALLBACK_LEGENDARY_BONUS_MARKER: LegendaryBonusMarkerDefinition = {
  type: "legendary",
  labelKey: "battlePanel.single.chart.legendary.unknown",
  color: "#f59e0b",
};

const CHART_HIDDEN_LEGENDARY_BONUS_ACTIONS = new Set([
  "-legbon_critred",
  "-legbon_facade",
  "legbon_holytouch_heal",
]);
const DEFENDER_TEAM_LEGENDARY_BONUS_ACTIONS = new Set([
  "-legbon_cleanse",
  "-legbon_glare",
]);

export const getLegendaryBonusMarkerDefinition = (actionType: string) =>
  LEGENDARY_BONUS_MARKER_DEFINITIONS[actionType] ??
  FALLBACK_LEGENDARY_BONUS_MARKER;

export const isLegendaryBonusTimelineAction = (
  action: LegendaryBonusTimelineAction,
) =>
  action.category === "legendary" ||
  action.actionType.includes("legbon_") ||
  action.actionType === "legbon_lastheal";

export const isChartVisibleLegendaryBonusTimelineAction = (
  action: LegendaryBonusTimelineAction,
) =>
  isLegendaryBonusTimelineAction(action) &&
  !CHART_HIDDEN_LEGENDARY_BONUS_ACTIONS.has(action.actionType);

const getActionTeam = (
  action: LegendaryBonusTimelineAction,
  teamByWarriorId: Map<string, number>,
  teamByWarriorName: Map<string, number>,
) => {
  if (DEFENDER_TEAM_LEGENDARY_BONUS_ACTIONS.has(action.actionType)) {
    const defenderTeam = getTargetWarriorTeam(action, teamByWarriorId);
    if (defenderTeam !== null) {
      return defenderTeam;
    }
  }

  if (action.actionType === "legbon_lastheal") {
    const healedWarriorTeam = getLastHealWarriorTeam(
      action,
      teamByWarriorId,
      teamByWarriorName,
    );
    if (healedWarriorTeam !== null) {
      return healedWarriorTeam;
    }
  }

  if (action.actorId) {
    const actorTeam = teamByWarriorId.get(action.actorId);
    if (actorTeam !== undefined) {
      return actorTeam;
    }
  }

  if (action.targetId) {
    return teamByWarriorId.get(action.targetId) ?? null;
  }

  return null;
};

const getActionRecipientName = (
  action: LegendaryBonusTimelineAction,
  warriorById: Map<string, LegendaryBonusTimelineWarrior>,
) => {
  if (DEFENDER_TEAM_LEGENDARY_BONUS_ACTIONS.has(action.actionType)) {
    const targetName = getWarriorNameById(action.targetId, warriorById);
    if (targetName !== null) {
      return targetName;
    }
  }

  if (action.actionType === "legbon_lastheal") {
    const lastHealWarriorName = getLastHealWarriorName(action);
    if (lastHealWarriorName !== null) {
      return lastHealWarriorName;
    }

    const targetName = getWarriorNameById(action.targetId, warriorById);
    if (targetName !== null) {
      return targetName;
    }
  }

  const actorName = getWarriorNameById(action.actorId, warriorById);
  if (actorName !== null) {
    return actorName;
  }

  return getWarriorNameById(action.targetId, warriorById);
};

const getWarriorNameById = (
  warriorId: string | null,
  warriorById: Map<string, LegendaryBonusTimelineWarrior>,
) => {
  if (!warriorId) {
    return null;
  }

  const name = warriorById.get(warriorId)?.name?.trim();

  return name ? name : null;
};

const getTargetWarriorTeam = (
  action: LegendaryBonusTimelineAction,
  teamByWarriorId: Map<string, number>,
) => {
  if (action.targetId) {
    const targetTeam = teamByWarriorId.get(action.targetId);
    if (targetTeam !== undefined) {
      return targetTeam;
    }
  }

  if (action.actorId) {
    return teamByWarriorId.get(action.actorId) ?? null;
  }

  return null;
};

const getLastHealWarriorTeam = (
  action: LegendaryBonusTimelineAction,
  teamByWarriorId: Map<string, number>,
  teamByWarriorName: Map<string, number>,
) => {
  const warriorName = getLastHealWarriorName(action);
  const normalizedWarriorName = warriorName?.toLowerCase() ?? "";
  const teamFromParam = normalizedWarriorName
    ? (teamByWarriorName.get(normalizedWarriorName) ?? null)
    : null;

  if (teamFromParam !== null) {
    return teamFromParam;
  }

  if (action.targetId) {
    const targetTeam = teamByWarriorId.get(action.targetId);
    if (targetTeam !== undefined) {
      return targetTeam;
    }
  }

  if (action.actorId) {
    return teamByWarriorId.get(action.actorId) ?? null;
  }

  return null;
};

const getLastHealWarriorName = (action: LegendaryBonusTimelineAction) => {
  const [, warriorLabel = ""] = action.param.split(",");
  const [warriorName = ""] = warriorLabel.split("(");
  const normalizedWarriorName = warriorName.trim();

  return normalizedWarriorName ? normalizedWarriorName : null;
};

export const buildLegendaryBonusMarkerGroups = (
  timeline: LegendaryBonusTimelineTurn[],
  warriors: LegendaryBonusTimelineWarrior[],
) => {
  const warriorById = new Map(
    warriors.map((warrior) => [warrior.originalId, warrior]),
  );
  const teamByWarriorId = new Map(
    warriors.map((warrior) => [warrior.originalId, warrior.team]),
  );
  const teamByWarriorName = new Map(
    warriors
      .filter((warrior) => warrior.name)
      .map((warrior) => [warrior.name?.toLowerCase() ?? "", warrior.team]),
  );
  const groups = new Map<string, LegendaryBonusMarkerGroup>();

  for (const turn of timeline) {
    for (const action of turn.actions) {
      if (!isChartVisibleLegendaryBonusTimelineAction(action)) {
        continue;
      }

      const team = getActionTeam(action, teamByWarriorId, teamByWarriorName);
      if (team === null) {
        continue;
      }

      const key = `${turn.turn}:${team}`;
      const definition = getLegendaryBonusMarkerDefinition(action.actionType);
      const group = groups.get(key) ?? {
        key,
        turn: turn.turn,
        team,
        y: turn.teamHp[String(team)] ?? 100,
        bonuses: [],
      };

      group.bonuses.push({
        ...definition,
        actionType: action.actionType,
        actorId: action.actorId,
        targetId: action.targetId,
        param: action.param,
        recipientName: getActionRecipientName(action, warriorById),
      });
      groups.set(key, group);
    }
  }

  return Array.from(groups.values()).sort((left, right) => {
    if (left.turn !== right.turn) {
      return left.turn - right.turn;
    }

    return left.team - right.team;
  });
};

export const getLegendaryBonusLegendItems = (
  groups: LegendaryBonusMarkerGroup[],
) => {
  const items = new Map<
    LegendaryBonusIconKey,
    LegendaryBonusMarkerDefinition
  >();

  for (const group of groups) {
    for (const bonus of group.bonuses) {
      if (!items.has(bonus.type)) {
        items.set(bonus.type, {
          type: bonus.type,
          labelKey: bonus.labelKey,
          color: bonus.color,
        });
      }
    }
  }

  return Array.from(items.values());
};
