export type ReminderValue = "none" | "0" | "5" | "15" | "30";
export type ReminderOffset = 0 | 5 | 15 | 30;
export const REMINDER_VALUES: ReminderValue[] = ["none", "0", "5", "15", "30"];
const REMINDER_OFFSETS: Record<ReminderValue, ReminderOffset | null> = {
  none: null,
  "0": 0,
  "5": 5,
  "15": 15,
  "30": 30,
};
export const toReminderOffset = (value: ReminderValue): ReminderOffset | null =>
  REMINDER_OFFSETS[value];
export const toReminderValue = (value: ReminderOffset | null): ReminderValue =>
  REMINDER_VALUES.find((reminder) => REMINDER_OFFSETS[reminder] === value) ??
  "none";
