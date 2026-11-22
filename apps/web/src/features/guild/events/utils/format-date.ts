import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  DATE_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";

export const formatTime = (date: Date): string =>
  format(date, "HH:mm:ss", { locale: pl });

export const formatTimeShort = (date: Date): string =>
  format(date, "HH:mm", { locale: pl });

const formatDate = (date: Date): string => timestampToDate(date, DATE_FORMAT);

export const formatDateRange = (
  start: Date,
  end: Date | null,
  openEndLabel: string,
): string => `${formatDate(start)} – ${end ? formatDate(end) : openEndLabel}`;
