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

const ITEM_HID_IN_TEXT_PATTERN = /ITEM#([0-9a-f]{64})\.([a-z]+)\b/i;

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
