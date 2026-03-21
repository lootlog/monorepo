export const ITEM_HID_PATTERN = /^ITEM#(.+)\.(\w+)$/;

const getTrimmedItemHid = (value: string): string => value.trim();

export const isItemHid = (value: string): boolean => {
  return ITEM_HID_PATTERN.test(getTrimmedItemHid(value));
};

export const parseItemHid = (
  value: string,
): { hid: string; world: string } | null => {
  const match = getTrimmedItemHid(value).match(ITEM_HID_PATTERN);
  const [, hid, world] = match ?? [];

  if (!hid || !world) {
    return null;
  }

  return { hid, world };
};

export const formatItemHid = (hid: string, world: string): string => {
  return `ITEM#${hid}.${world}`;
};
