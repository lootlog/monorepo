import { format } from "date-fns";
import { pl } from "date-fns/locale";

export const formatTime = (date: Date): string =>
  format(date, "HH:mm:ss", { locale: pl });

export const formatTimeShort = (date: Date): string =>
  format(date, "HH:mm", { locale: pl });

export const formatDateTime = (date: Date): string =>
  format(date, "d MMM, HH:mm", { locale: pl });

const formatDate = (date: Date): string =>
  format(date, "d MMM yyyy", { locale: pl });

/** Joins an event's dates with an en dash; an open end shows `openEndLabel`. */
export const formatDateRange = (
  start: Date,
  end: Date | null,
  openEndLabel: string,
): string => `${formatDate(start)} – ${end ? formatDate(end) : openEndLabel}`;
