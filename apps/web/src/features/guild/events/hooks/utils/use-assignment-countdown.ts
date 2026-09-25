import { useState, useEffect } from "react";
import { formatDurationCompact } from "../../utils/format-duration";

const formatTimeRemaining = (targetTime: number): string => {
  const diffMs = targetTime - Date.now();

  if (diffMs <= 0) return "0:00";

  return formatDurationCompact(Math.floor(diffMs / 1000));
};

export const useAssignmentCountdown = (
  assignmentDisabled: boolean,
  assignmentEnabledAt?: number | null,
) => {
  const [isEnabled, setIsEnabled] = useState(!assignmentDisabled);

  const [formattedTime, setFormattedTime] = useState<string | null>(() => {
    if (
      !assignmentDisabled ||
      assignmentEnabledAt === null ||
      assignmentEnabledAt === undefined
    ) {
      return null;
    }

    return formatTimeRemaining(assignmentEnabledAt);
  });

  useEffect(() => {
    if (!assignmentDisabled) {
      setIsEnabled(true);
      setFormattedTime(null);

      return;
    }

    if (assignmentEnabledAt === null || assignmentEnabledAt === undefined) {
      setIsEnabled(false);
      setFormattedTime(null);

      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const diff = assignmentEnabledAt - now;

      if (diff <= 0) {
        setIsEnabled(true);
        setFormattedTime(null);
      } else {
        setIsEnabled(false);
        setFormattedTime(formatTimeRemaining(assignmentEnabledAt));
      }
    };

    updateCountdown();

    const interval = setInterval(updateCountdown, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [assignmentDisabled, assignmentEnabledAt]);

  return {
    isEnabled,
    formattedTime,
  };
};
