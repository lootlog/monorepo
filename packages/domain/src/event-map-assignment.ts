interface AssignmentTimer {
  minSpawnTime: Date | string;
  maxSpawnTime: Date | string;
}

interface MapAssignmentAvailabilityOptions {
  assignmentTimeoutMinutes: number;
  now?: Date;
  timer?: AssignmentTimer | null;
}

export type MapAssignmentAvailability =
  | {
      allowed: true;
      enabledAt: null;
      reason: null;
    }
  | {
      allowed: false;
      enabledAt: number | null;
      reason: "NO_TIMER" | "OVERDUE" | "TOO_EARLY";
    };

export const getMapAssignmentAvailability = ({
  assignmentTimeoutMinutes,
  now = new Date(),
  timer,
}: MapAssignmentAvailabilityOptions): MapAssignmentAvailability => {
  if (!timer) {
    return {
      allowed: false,
      enabledAt: null,
      reason: "NO_TIMER",
    };
  }

  const nowTimestamp = now.getTime();

  if (nowTimestamp >= new Date(timer.maxSpawnTime).getTime()) {
    return {
      allowed: false,
      enabledAt: null,
      reason: "OVERDUE",
    };
  }

  const assignmentEnabledAt =
    new Date(timer.minSpawnTime).getTime() -
    assignmentTimeoutMinutes * 60 * 1000;

  if (nowTimestamp < assignmentEnabledAt) {
    return {
      allowed: false,
      enabledAt: assignmentEnabledAt,
      reason: "TOO_EARLY",
    };
  }

  return {
    allowed: true,
    enabledAt: null,
    reason: null,
  };
};
