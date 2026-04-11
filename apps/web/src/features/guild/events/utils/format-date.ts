import { format } from "date-fns";
import { pl } from "date-fns/locale";

export const formatTime = (date: Date): string =>
  format(date, "HH:mm:ss", { locale: pl });

export const formatTimeShort = (date: Date): string =>
  format(date, "HH:mm", { locale: pl });

export const formatDateTime = (date: Date): string =>
  format(date, "d MMM, HH:mm", { locale: pl });

export const formatDateTimeFull = (date: Date): string =>
  format(date, "d MMM yyyy, HH:mm", { locale: pl });
