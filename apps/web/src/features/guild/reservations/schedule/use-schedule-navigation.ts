import { useState } from "react";
import {
  getISOWeek,
  getISOWeekYear,
  getLastISOWeek,
  getDateOfISOWeek,
} from "./utils";
import { MONTH_NAMES } from "./constants";

export function useScheduleNavigation() {
  const today = new Date();
  const initialYear = getISOWeekYear(today);
  const initialWeek = getISOWeek(today);

  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentWeek, setCurrentWeek] = useState(initialWeek);

  const handlePrevWeek = () => {
    if (currentWeek > 1) {
      setCurrentWeek(currentWeek - 1);
    } else {
      const prevYear = currentYear - 1;
      setCurrentYear(prevYear);
      setCurrentWeek(getLastISOWeek(prevYear));
    }
  };

  const handleNextWeek = () => {
    const lastWeek = getLastISOWeek(currentYear);
    if (currentWeek < lastWeek) {
      setCurrentWeek(currentWeek + 1);
    } else {
      setCurrentYear(currentYear + 1);
      setCurrentWeek(1);
    }
  };

  const weekStart = getDateOfISOWeek(currentWeek, currentYear);

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
