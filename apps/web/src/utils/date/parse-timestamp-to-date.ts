import { format } from "date-fns";

export const DATE_FORMAT = "dd.MM.yyyy";

export const DATE_TIME_FORMAT = "dd.MM.yyyy HH:mm";

/** For technical and log views where the exact second matters. */
export const DATE_TIME_WITH_SECONDS_FORMAT = "dd.MM.yyyy HH:mm:ss";

export const timestampToDate = (
  timestamp: Date | string | number,
  dateFormat = DATE_TIME_FORMAT,
) => {
  return format(new Date(timestamp), dateFormat);
};
