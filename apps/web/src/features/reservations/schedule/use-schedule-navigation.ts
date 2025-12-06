import { useState, useCallback, useMemo } from "react";
import { getISOWeek, getLastISOWeek, getDateOfISOWeek } from "./utils";
import { MONTH_NAMES } from "./constants";

export function useScheduleNavigation() {
  const today = new Date();
  const initialYear = today.getFullYear();
  const initialWeek = getISOWeek(today);

  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentWeek, setCurrentWeek] = useState(initialWeek);

  const handlePrevWeek = useCallback(() => {
    if (currentWeek > 1) {
      setCurrentWeek(currentWeek - 1);
    } else {
      const prevYear = currentYear - 1;
      setCurrentYear(prevYear);
      setCurrentWeek(getLastISOWeek(prevYear));
    }
  }, [currentWeek, currentYear]);

  const handleNextWeek = useCallback(() => {
    const lastWeek = getLastISOWeek(currentYear);
    if (currentWeek < lastWeek) {
      setCurrentWeek(currentWeek + 1);
    } else {
      setCurrentYear(currentYear + 1);
      setCurrentWeek(1);
    }
  }, [currentWeek, currentYear]);

  const weekStart = useMemo(
    () => getDateOfISOWeek(currentWeek, currentYear),
    [currentWeek, currentYear],
  );

  const monthName = MONTH_NAMES[weekStart.getMonth()] ?? "";

  return {
    currentYear,
    currentWeek,
    weekStart,
    monthName,
    handlePrevWeek,
    handleNextWeek,
  };
}
