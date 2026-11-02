const ITEM_HID_PATTERN = /^ITEM#(.+)\.(\w+)$/;

export const parseItemHid = (
  value: string,
): { hid: string; world: string } | null => {
  const match = value.trim().match(ITEM_HID_PATTERN);
  const [, hid, world] = match ?? [];

  if (!hid || !world) {
    return null;
  }

  return { hid, world };
};

export const formatItemHid = (hid: string, world: string): string => {
  return `ITEM#${hid}.${world}`;
};

/**
 * Margonem writes a full 64-digit hex identifier, so text that merely starts
 * like one (`ITEM#abc`) is left alone.
 */
const ITEM_HID_IN_TEXT_PATTERN = /ITEM#([0-9a-f]{64})\.([a-z]+)\b/i;

/** The first item identifier written somewhere inside `text`. */
export const findItemHidInText = (
  text: string,
): { start: number; end: number; hid: string; world: string } | null => {
  const match = ITEM_HID_IN_TEXT_PATTERN.exec(text);
  const [value, hid, world] = match ?? [];

  if (!match || !value || !hid || !world) {
    return null;
  }

  return { start: match.index, end: match.index + value.length, hid, world };
};
