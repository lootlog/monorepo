type LocalDatePattern =
  | "HH:mm"
  | "HH:mm:ss"
  | "dd.MM"
  | "dd.MM.yyyy"
  | "dd.MM HH:mm:ss"
  | "dd.MM.yyyy HH:mm:ss"
  | "dd.MM.yyyy - HH:mm:ss";

const pad = (value: number) => String(value).padStart(2, "0");

export const format = (date: Date, pattern: LocalDatePattern): string => {
  const dayMonth = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
  const dateWithYear = `${dayMonth}.${date.getFullYear()}`;
  const hoursMinutes = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const timeWithSeconds = `${hoursMinutes}:${pad(date.getSeconds())}`;

  switch (pattern) {
    case "HH:mm":
      return hoursMinutes;
    case "HH:mm:ss":
      return timeWithSeconds;
    case "dd.MM":
      return dayMonth;
    case "dd.MM.yyyy":
      return dateWithYear;
    case "dd.MM HH:mm:ss":
      return `${dayMonth} ${timeWithSeconds}`;
    case "dd.MM.yyyy HH:mm:ss":
      return `${dateWithYear} ${timeWithSeconds}`;
    case "dd.MM.yyyy - HH:mm:ss":
      return `${dateWithYear} - ${timeWithSeconds}`;
  }
};

const isSameLocalDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const isToday = (date: Date): boolean =>
  isSameLocalDay(date, new Date());

export const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameLocalDay(date, yesterday);
};
