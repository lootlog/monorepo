import { useSecondClockValue } from "@/hooks/utils/use-second-clock-value";
import { formatDurationCompact } from "../../utils/format-duration";

export const useAssignmentCountdown = (
  assignmentDisabled: boolean,
  assignmentEnabledAt?: number | null,
) => {
  const hasCountdown =
    assignmentDisabled &&
    assignmentEnabledAt !== null &&
    assignmentEnabledAt !== undefined;

  // The time left until assignments unlock, or null once they have.
  const formattedTime = useSecondClockValue(() => {
    if (!hasCountdown) return null;

    const diffMs = assignmentEnabledAt - Date.now();

    return diffMs > 0 ? formatDurationCompact(Math.floor(diffMs / 1000)) : null;
  }, hasCountdown);

  return {
    isEnabled: !assignmentDisabled || (hasCountdown && formattedTime === null),
    formattedTime,
  };
};
