interface AssignmentTimer {
  minSpawnTime: Date | string;
  maxSpawnTime: Date | string;
}

interface GetAssignmentAvailabilityOptions {
  assignmentTimeoutMinutes: number;
  now?: Date;
  timer?: AssignmentTimer | null;
}

type AssignmentAvailability =
  | {
      allowed: true;
      enabledAt: null;
      reason: null;
    }
  | {
      allowed: false;
      enabledAt: Date | null;
      reason: "NO_TIMER" | "OVERDUE" | "TOO_EARLY";
    };

export const getAssignmentAvailability = ({
  assignmentTimeoutMinutes,
  now = new Date(),
  timer,
}: GetAssignmentAvailabilityOptions): AssignmentAvailability => {
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

  const assignmentEnabledAt = new Date(
    new Date(timer.minSpawnTime).getTime() -
      assignmentTimeoutMinutes * 60 * 1000,
  );

  if (nowTimestamp < assignmentEnabledAt.getTime()) {
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
