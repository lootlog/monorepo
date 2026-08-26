import type { TFunction } from "i18next";

import type {
  ReservationRangeValidationError,
  ReservationSettings,
} from "./reservation-settings";

export const getReservationValidationMessage = (
  error: ReservationRangeValidationError,
  t: TFunction,
  settings: ReservationSettings,
) => {
  switch (error) {
    case "timeRangeRequired": {
      return t("reservations.schedule.validation.timeRangeRequired");
    }
    case "endAfterStart": {
      return t("reservations.schedule.validation.endAfterStart");
    }
    case "invalidTimeGrid": {
      return t("reservations.schedule.validation.invalidTimeGrid", {
        minutes: settings.reservationTimeGranularityMinutes,
      });
    }
    case "startTooOld": {
      return t("reservations.schedule.validation.startTooOld");
    }
    case "minimumDuration": {
      return t("reservations.schedule.validation.minimumDuration", {
        minutes: settings.reservationMinDurationMinutes,
      });
    }
    case "maximumDuration": {
      return t("reservations.schedule.validation.maximumDuration", {
        minutes: settings.reservationMaxDurationMinutes,
      });
    }
    case "maxAdvance": {
      return t("reservations.schedule.validation.maxAdvance", {
        days: settings.reservationMaxAdvanceDays,
      });
    }
  }
};
