import type { ReservationSegment } from "./types";

export const formatTime = (date: Date) =>
  `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

export const formatSegmentTime = (date: Date, reference: Date) => {
  const isSameDay =
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate();

  if (isSameDay) {
    return formatTime(date);
  }

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}.${month} ${formatTime(date)}`;
};

export const formatDateWithTime = (date: Date) => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}.${month} ${formatTime(date)}`;
};

export const shouldShowEndDateOnFirstSegment = (
  segment: ReservationSegment,
): boolean => {
  if (!segment.isReservationStart) {
    return false;
  }

  const reservationEnd = segment.reservation.toDate;
  const segmentStart = segment.segmentStart;

  return !(
    reservationEnd.getFullYear() === segmentStart.getFullYear() &&
    reservationEnd.getMonth() === segmentStart.getMonth() &&
    reservationEnd.getDate() === segmentStart.getDate()
  );
};

export function getISOWeek(date = new Date()) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNumber =
    1 +
    Math.ceil((Number(firstThursday) - Number(target.valueOf())) / 604800000);
  return weekNumber;
}

export function getISOWeekYear(date = new Date()) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  return target.getFullYear();
}

export function getLastISOWeek(year: number) {
  return getISOWeek(new Date(year, 11, 28));
}

export function getDateOfISOWeek(week: number, year: number) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
}
