import type { EventModeResponseDtoEventsItem } from "@/lib/api/generated/main/model/event-mode-response-dto-events-item";
import type { EventModeResponseDtoEventsItemAssignmentsItem } from "@/lib/api/generated/main/model/event-mode-response-dto-events-item-assignments-item";
import type { EventModeResponseDtoEventsItemNextRespawn } from "@/lib/api/generated/main/model/event-mode-response-dto-events-item-next-respawn";

export type EventModeAssignmentPresence = "unassigned" | "on-map" | "off-map";

export type EventModeRespawnDisplay =
  | { state: "missing" }
  | {
      state: "waiting" | "open" | "overdue";
      durationMs: number;
    };

export function resolveSelectedEvent(
  events: EventModeResponseDtoEventsItem[],
  storedEventId: string | undefined,
) {
  if (storedEventId) {
    const storedEvent = events.find((event) => event.id === storedEventId);

    if (storedEvent) {
      return storedEvent;
    }
  }

  return events[0] ?? null;
}

export function getPrimaryAssignment(
  assignments: EventModeResponseDtoEventsItemAssignmentsItem[],
  currentMapId: number,
) {
  if (Number.isInteger(currentMapId)) {
    const currentMapAssignment = assignments.find(
      (assignment) =>
        Number.isInteger(assignment.margonemMapId) &&
        assignment.margonemMapId === currentMapId,
    );

    if (currentMapAssignment) {
      return currentMapAssignment;
    }
  }

  return assignments[0] ?? null;
}

export function getAssignmentPresence(
  assignments: EventModeResponseDtoEventsItemAssignmentsItem[],
  currentMapId: number,
): EventModeAssignmentPresence {
  if (assignments.length === 0) {
    return "unassigned";
  }

  if (
    Number.isInteger(currentMapId) &&
    assignments.some(
      (assignment) =>
        Number.isInteger(assignment.margonemMapId) &&
        assignment.margonemMapId === currentMapId,
    )
  ) {
    return "on-map";
  }

  return "off-map";
}

export function getRespawnDisplay(
  respawn: EventModeResponseDtoEventsItemNextRespawn,
  nowMs: number,
): EventModeRespawnDisplay {
  if (!respawn) {
    return { state: "missing" };
  }

  const minSpawnTime = new Date(respawn.minSpawnTime).getTime();
  const maxSpawnTime = new Date(respawn.maxSpawnTime).getTime();

  if (
    !Number.isFinite(nowMs) ||
    !Number.isFinite(minSpawnTime) ||
    !Number.isFinite(maxSpawnTime) ||
    minSpawnTime > maxSpawnTime
  ) {
    return { state: "missing" };
  }

  if (nowMs >= maxSpawnTime) {
    return {
      state: "overdue",
      durationMs: nowMs - maxSpawnTime,
    };
  }

  if (nowMs >= minSpawnTime) {
    return {
      state: "open",
      durationMs: maxSpawnTime - nowMs,
    };
  }

  return {
    state: "waiting",
    durationMs: minSpawnTime - nowMs,
  };
}
