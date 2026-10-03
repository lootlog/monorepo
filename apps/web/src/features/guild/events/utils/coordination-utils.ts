import type {
  EventCoordinationResponseDtoHeroesItem,
  EventCoordinationResponseDtoHeroesItemActiveGapsItem,
  EventCoordinationResponseDtoHeroesItemPriority,
  EventCoordinationResponseDtoHeroesItemRecommendedAction,
  EventCoordinationResponseDtoHeroesItemTimerStatus,
} from "@lootlog/client/main";

/** Signal tone of a priority, shared by its badge and coverage bar; idle has none. */
export function getCoordinationPriorityTone(
  priority: EventCoordinationResponseDtoHeroesItemPriority,
) {
  switch (priority) {
    case "CRITICAL":
      return "alert";
    case "WARNING":
      return "timer";
    case "OK":
      return "ready";
    case "IDLE":
    default:
      return null;
  }
}

export function getCoordinationPriorityLabelKey(
  priority: EventCoordinationResponseDtoHeroesItemPriority,
) {
  return `events.coordination.priority.${priority.toLowerCase()}`;
}

export function getCoordinationStatusLabelKey(
  status: EventCoordinationResponseDtoHeroesItemTimerStatus | "NONE",
) {
  return `events.coordination.windowStatus.${status.toLowerCase()}`;
}

export function getCoordinationActionLabelKey(
  action: EventCoordinationResponseDtoHeroesItemRecommendedAction,
) {
  return `events.coordination.actions.${action.toLowerCase()}`;
}

export function getCoveragePercentage({
  coveredMaps,
  totalMaps,
}: {
  coveredMaps: number;
  totalMaps: number;
}) {
  if (totalMaps <= 0) {
    return 0;
  }

  return Math.round((coveredMaps / totalMaps) * 100);
}

export function findSelfAssignGap(
  hero: EventCoordinationResponseDtoHeroesItem,
): EventCoordinationResponseDtoHeroesItemActiveGapsItem | null {
  return (
    hero.activeGaps.find((gap) => gap.gapType === "UNASSIGNED") ??
    hero.activeGaps[0] ??
    null
  );
}
