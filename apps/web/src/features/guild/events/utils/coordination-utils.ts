import type { EventCoordinationResponseDtoHeroesItem } from "@lootlog/api-client/models/main/event-coordination-response-dto-heroes-item";
import type { EventCoordinationResponseDtoHeroesItemActiveGapsItem } from "@lootlog/api-client/models/main/event-coordination-response-dto-heroes-item-active-gaps-item";
import type { EventCoordinationResponseDtoHeroesItemPriority } from "@lootlog/api-client/models/main/event-coordination-response-dto-heroes-item-priority";
import type { EventCoordinationResponseDtoHeroesItemRecommendedAction } from "@lootlog/api-client/models/main/event-coordination-response-dto-heroes-item-recommended-action";
import type { EventCoordinationResponseDtoHeroesItemTimerStatus } from "@lootlog/api-client/models/main/event-coordination-response-dto-heroes-item-timer-status";

export function getCoordinationPriorityTone(
  priority: EventCoordinationResponseDtoHeroesItemPriority,
) {
  switch (priority) {
    case "CRITICAL":
      return "destructive";
    case "WARNING":
      return "warning";
    case "OK":
      return "success";
    case "IDLE":
    default:
      return "muted";
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
