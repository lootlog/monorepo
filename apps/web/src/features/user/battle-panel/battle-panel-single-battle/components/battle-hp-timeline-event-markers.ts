import {
  BATTLE_HP_TIMELINE_EVENT_LAYER_DEFINITIONS,
  DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG,
  type BattleHpTimelineLayerConfig,
  type BattleHpTimelineLayerDefinition,
  type BattleHpTimelineLayerKey,
} from "./battle-hp-timeline-layers";

type BattleHpTimelineEventAction = {
  actionType: string;
  category: string;
  actorId: string | null;
  targetId: string | null;
  param: string;
};

export type BattleHpTimelineEventTurn = {
  turn: number;
  attackerId: string | null;
  defenderId: string | null;
  teamHp: Record<string, number>;
  actions: BattleHpTimelineEventAction[];
  flags: string[];
  labels: string[];
};

export type BattleHpTimelineEventWarrior = {
  originalId: string;
  team: number;
};

export type BattleHpTimelineEventMarker = BattleHpTimelineLayerDefinition & {
  count: number;
};

export type BattleHpTimelineEventMarkerGroup = {
  key: string;
  turn: number;
  team: number | null;
  y: number;
  markers: BattleHpTimelineEventMarker[];
};

const targetFirstLayers = new Set<BattleHpTimelineLayerKey>([
  "stun",
  "freeze",
  "counter",
  "evade",
  "parry",
  "arrowBlock",
  "pierceBlock",
  "activeHealing",
]);

export const buildBattleHpTimelineEventMarkerGroups = (
  timeline: BattleHpTimelineEventTurn[],
  warriors: BattleHpTimelineEventWarrior[],
  layerConfig: BattleHpTimelineLayerConfig,
) => {
  const teamByWarriorId = new Map(
    warriors.map((warrior) => [warrior.originalId, warrior.team]),
  );
  const groups = new Map<string, BattleHpTimelineEventMarkerGroup>();

  for (const turn of timeline) {
    for (const definition of BATTLE_HP_TIMELINE_EVENT_LAYER_DEFINITIONS) {
      if (
        !layerConfig[definition.key] ||
        !hasLayerEvents(turn, definition.key)
      ) {
        continue;
      }

      const entries = getLayerTeamEntries(
        turn,
        definition.key,
        teamByWarriorId,
      );

      for (const entry of entries) {
        const groupKey = `${turn.turn}:${entry.team ?? "unknown"}`;
        const group = groups.get(groupKey) ?? {
          key: groupKey,
          turn: turn.turn,
          team: entry.team,
          y: getGroupY(turn, entry.team),
          markers: [],
        };

        group.markers.push({
          ...definition,
          count: entry.count,
        });
        groups.set(groupKey, group);
      }
    }
  }

  return Array.from(groups.values()).sort((left, right) => {
    if (left.turn !== right.turn) {
      return left.turn - right.turn;
    }

    return (
      (left.team ?? Number.MAX_SAFE_INTEGER) -
      (right.team ?? Number.MAX_SAFE_INTEGER)
    );
  });
};

export const getBattleHpTimelineEventLayerCounts = (
  timeline: BattleHpTimelineEventTurn[],
  warriors: BattleHpTimelineEventWarrior[],
) => {
  const layerConfig = {
    ...DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG,
  };

  for (const definition of BATTLE_HP_TIMELINE_EVENT_LAYER_DEFINITIONS) {
    layerConfig[definition.key] = true;
  }

  const groups = buildBattleHpTimelineEventMarkerGroups(
    timeline,
    warriors,
    layerConfig,
  );
  const counts: Partial<Record<BattleHpTimelineLayerKey, number>> = {};

  for (const group of groups) {
    for (const marker of group.markers) {
      counts[marker.key] = (counts[marker.key] ?? 0) + marker.count;
    }
  }

  return counts;
};

const getLayerTeamEntries = (
  turn: BattleHpTimelineEventTurn,
  layerKey: BattleHpTimelineLayerKey,
  teamByWarriorId: Map<string, number>,
) => {
  const counts = new Map<number | null, number>();

  for (const action of turn.actions) {
    if (!isActionForLayer(action, layerKey)) {
      continue;
    }

    const team = getActionTeam(action, layerKey, teamByWarriorId);
    counts.set(team, (counts.get(team) ?? 0) + 1);
  }

  if (counts.size > 0) {
    return Array.from(counts.entries()).map(([team, count]) => ({
      team,
      count,
    }));
  }

  return [
    {
      team: getFallbackTeam(turn, layerKey, teamByWarriorId),
      count: 1,
    },
  ];
};

const hasLayerEvents = (
  turn: BattleHpTimelineEventTurn,
  layerKey: BattleHpTimelineLayerKey,
) => {
  if (layerKey === "activeHealing") {
    return turn.actions.some((action) => isActionForLayer(action, layerKey));
  }

  return turn.flags.includes(layerKey);
};

const isActionForLayer = (
  action: BattleHpTimelineEventAction,
  layerKey: BattleHpTimelineLayerKey,
) => {
  switch (layerKey) {
    case "stun":
      return (
        action.actionType.includes("stun") ||
        (action.actionType === "txt" && action.param.includes("utrata tury"))
      );
    case "freeze":
      return action.actionType.includes("freeze");
    case "counter":
      return action.category === "counter";
    case "evade":
      return action.actionType === "-evade";
    case "parry":
      return action.actionType === "-parry";
    case "arrowBlock":
      return action.actionType === "-arrowblock";
    case "pierceBlock":
      return action.actionType === "-pierceb";
    case "activeHealing":
      return (
        action.actionType === "bandage" || action.actionType === "heal_target"
      );
    case "combo":
      return action.category === "combo";
    default:
      return false;
  }
};

const getActionTeam = (
  action: BattleHpTimelineEventAction,
  layerKey: BattleHpTimelineLayerKey,
  teamByWarriorId: Map<string, number>,
) => {
  if (layerKey === "activeHealing") {
    return getWarriorTeam(action.targetId ?? action.actorId, teamByWarriorId);
  }

  if (targetFirstLayers.has(layerKey)) {
    return getWarriorTeam(action.targetId ?? action.actorId, teamByWarriorId);
  }

  return getWarriorTeam(action.actorId ?? action.targetId, teamByWarriorId);
};

const getFallbackTeam = (
  turn: BattleHpTimelineEventTurn,
  layerKey: BattleHpTimelineLayerKey,
  teamByWarriorId: Map<string, number>,
) => {
  if (targetFirstLayers.has(layerKey)) {
    return getWarriorTeam(turn.defenderId ?? turn.attackerId, teamByWarriorId);
  }

  return getWarriorTeam(turn.attackerId ?? turn.defenderId, teamByWarriorId);
};

const getWarriorTeam = (
  warriorId: string | null,
  teamByWarriorId: Map<string, number>,
) => {
  if (!warriorId) {
    return null;
  }

  return teamByWarriorId.get(warriorId) ?? null;
};

const getGroupY = (turn: BattleHpTimelineEventTurn, team: number | null) => {
  if (team === null) {
    return 100;
  }

  return turn.teamHp[String(team)] ?? 100;
};
