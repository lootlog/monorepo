import { format } from "date-fns";
import { pl } from "date-fns/locale";

/**
 * Format time as HH:mm:ss with Polish locale
 */
export const formatTime = (date: Date): string =>
  format(date, "HH:mm:ss", { locale: pl });

/**
 * Format time as HH:mm with Polish locale
 */
export const formatTimeShort = (date: Date): string =>
  format(date, "HH:mm", { locale: pl });

/**
 * Format date and time as "d MMM, HH:mm" with Polish locale (e.g., "5 sty, 14:30")
 */
export const formatDateTime = (date: Date): string =>
  format(date, "d MMM, HH:mm", { locale: pl });

/**
 * Format full date and time as "d MMM yyyy, HH:mm" with Polish locale
 */
export const formatDateTimeFull = (date: Date): string =>
  format(date, "d MMM yyyy, HH:mm", { locale: pl });
